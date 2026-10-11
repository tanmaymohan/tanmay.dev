---
sidebar_position: 5
---

# Cluster Upgrades

EKS clusters regularly upgrade होने चाहिए supported versions पर रहने और security patches पाने के लिए। Amazon EKS **standard support में तीन minor versions** रखता है (अभी **1.34, 1.35, और 1.36** — latest **1.36** है)। पुराने versions extended support में जाते हैं, फिर out of support। Standard support से पीछे रहना extra cost और delayed security updates है।

## Upgrade Process

### 1. Version Jump Plan करो

[EKS release calendar](https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html) और Kubernetes changelog में breaking changes check करो। एक बार में एक minor version upgrade करो (जैसे 1.35 → 1.36, 1.35 → 1.37 नहीं)।

### 2. Staging पहले Upgrade करो

हमेशा non-production से शुरू करो:

**Cluster version:**
```bash
aws eks update-cluster-version \
  --name staging-cluster \
  --kubernetes-version 1.36
```

Update complete होने का wait करो (15-30 मिनट)।

**Addons:**

हर addon की cluster version के साथ compatibility matrix होती है। इस order में update करो:

1. **VPC CNI** (networking पहले काम करनी चाहिए)
2. **CoreDNS** (DNS resolution)
3. **kube-proxy** (service networking)
4. **अन्य addons** (EBS CSI driver, Pod Identity Agent, etc.)

```bash
aws eks update-addon \
  --cluster-name staging-cluster \
  --addon-name vpc-cni \
  --addon-version v1.22.4-eksbuild.3
```

Compatible versions check करो:
```bash
aws eks describe-addon-versions \
  --kubernetes-version 1.36 \
  --addon-name vpc-cni \
  --query 'addons[0].addonVersions[0].addonVersion'
```

**Nodes:**

Control plane और addons upgrade होने के बाद, नए version support करने वाले AMIs से nodes refresh करो:

- **Managed node groups**: Launch template में AMI version update करो और rolling update trigger करो
- **Karpenter**: `EC2NodeClass` में AMI selector version update करो और Karpenter को drift-replace करने दो

### 3. UAT Upgrade करो

Same process repeat करो। Upgraded cluster पर integration tests run करो।

### 4. Production Upgrade करो

Same process, लेकिन:
- Stakeholders को communicate किया scheduled maintenance window
- Rollback plan: Amazon EKS upgrade के **7 दिनों** के अंदर control plane को previous minor version पर rollback कर सकता है। उसके बाद downgrade नहीं होता। Data plane के लिए पुराने node AMIs रखो।
- PodDisruptionBudgets configured ताकि critical workloads एक साथ सब drain न हों

## Addon Version Matrix

Addon versions explicitly pin करो। "latest" पर rely मत करो — upgrade के दौरान breaking changes introduce कर सकता है।

EKS **1.36** के लिए example (2026 में standard support का latest; pin करने से पहले re-check करो):

| Addon | Compatible Version |
|-------|-------------------|
| VPC CNI | v1.22.x (जैसे `v1.22.4-eksbuild.3`) |
| CoreDNS | v1.14.x (जैसे `v1.14.3-eksbuild.16`) |
| kube-proxy | v1.36.x (जैसे `v1.36.0-eksbuild.17`) |
| EBS CSI Driver | 1.36 के लिए `describe-addon-versions` से pin करो |

Exact compatible versions के लिए हमेशा [EKS addon versions documentation](https://docs.aws.amazon.com/eks/latest/userguide/managing-add-ons.html) check करो।

## Upgrade Frequency

Latest supported release के एक minor version के अंदर रहने का target रखो। अच्छा cadence:

- **Staging**: New EKS version available होने के 2 हफ़्तों में upgrade
- **Production**: 4-6 हफ़्तों में upgrade, staging bake होने के बाद

यह security patches पर current रखता है बिना bleeding edge पर हुए।

## Common Gotchas

1. **Deprecated APIs**: Kubernetes versions के बीच APIs deprecate करता है। Upgrade से पहले [Kubernetes deprecation guide](https://kubernetes.io/docs/reference/using-api/deprecation-guide/) check करो और removed API versions वाले manifests update करो।

2. **Admission webhook compatibility**: अगर admission webhooks चलाते हो (जैसे OPA/Gatekeeper, Kyverno), verify करो कि target Kubernetes version support करते हैं।

3. **CNI version mismatch**: VPC CNI addon version cluster version और node AMI दोनों के साथ compatible होनी चाहिए। Nodes roll करने से पहले CNI upgrade करो।

4. **PodDisruptionBudgets बहुत strict**: अगर PDBs zero disruptions allow करती हैं, node draining hang होगी। Ensure करो कि सभी PDBs upgrades के दौरान कम से कम एक pod unavailable होने दें।
