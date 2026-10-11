---
sidebar_position: 5
---

# Cluster Upgrades

EKS clusters should be upgraded regularly to stay on supported versions and receive security patches. Amazon EKS keeps **three minor versions in standard support** (currently **1.34, 1.35, and 1.36** — **1.36** is the latest). Older versions move to extended support, then go out of support. Falling behind standard support means paying extra and delaying security updates.

## Upgrade Process

### 1. Plan the Version Jump

Check the [EKS release calendar](https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html) and the Kubernetes changelog for breaking changes. Upgrade one minor version at a time (e.g., 1.35 → 1.36, not 1.35 → 1.37).

### 2. Upgrade Staging First

Always start with non-production:

**Cluster version:**
```bash
aws eks update-cluster-version \
  --name staging-cluster \
  --kubernetes-version 1.36
```

Wait for the update to complete (15-30 minutes).

**Addons:**

Each addon has a compatibility matrix with the cluster version. Update them in this order:

1. **VPC CNI** (networking must work before anything else)
2. **CoreDNS** (DNS resolution)
3. **kube-proxy** (service networking)
4. **Other addons** (EBS CSI driver, Pod Identity Agent, etc.)

```bash
aws eks update-addon \
  --cluster-name staging-cluster \
  --addon-name vpc-cni \
  --addon-version v1.22.4-eksbuild.3
```

Check compatible versions:
```bash
aws eks describe-addon-versions \
  --kubernetes-version 1.36 \
  --addon-name vpc-cni \
  --query 'addons[0].addonVersions[0].addonVersion'
```

**Nodes:**

After the control plane and addons are upgraded, refresh the nodes with AMIs that support the new version:

- **Managed node groups**: Update the AMI version in your launch template and trigger a rolling update
- **Karpenter**: Update the AMI selector version in your `EC2NodeClass` and let Karpenter drift-replace nodes

### 3. Upgrade UAT

Repeat the same process. Run integration tests against the upgraded cluster.

### 4. Upgrade Production

Same process, but with:
- A scheduled maintenance window communicated to stakeholders
- A rollback plan: Amazon EKS allows a control-plane rollback to the previous minor version within **7 days** of the upgrade. After that window you cannot downgrade. Keep previous node AMIs so you can still roll the data plane back if needed.
- PodDisruptionBudgets configured so critical workloads are not all drained at once

## Addon Version Matrix

Pin addon versions explicitly. Do not rely on "latest" — it can introduce breaking changes during an upgrade.

Example for EKS **1.36** (latest in standard support as of 2026; re-check before you pin):

| Addon | Compatible Version |
|-------|-------------------|
| VPC CNI | v1.22.x (e.g. `v1.22.4-eksbuild.3`) |
| CoreDNS | v1.14.x (e.g. `v1.14.3-eksbuild.16`) |
| kube-proxy | v1.36.x (e.g. `v1.36.0-eksbuild.17`) |
| EBS CSI Driver | Pin via `describe-addon-versions` for 1.36 |

Always check the [EKS addon versions documentation](https://docs.aws.amazon.com/eks/latest/userguide/managing-add-ons.html) for the exact compatible versions for your target cluster version.

## Upgrade Frequency

Aim to stay within one minor version of the latest supported release. A good cadence:

- **Staging**: Upgrade within 2 weeks of a new EKS version being available
- **Production**: Upgrade within 4-6 weeks, after staging has baked

This keeps you current on security patches without being on the bleeding edge.

## Common Gotchas

1. **Deprecated APIs**: Kubernetes deprecates APIs between versions. Check the [Kubernetes deprecation guide](https://kubernetes.io/docs/reference/using-api/deprecation-guide/) and update any manifests that use removed API versions before upgrading.

2. **Admission webhook compatibility**: If you run admission webhooks (e.g., OPA/Gatekeeper, Kyverno), verify they support the target Kubernetes version.

3. **CNI version mismatch**: The VPC CNI addon version must be compatible with both the cluster version and the node AMI. Upgrade the CNI before rolling nodes.

4. **PodDisruptionBudgets too strict**: If PDBs allow zero disruptions, node draining will hang. Ensure all PDBs allow at least one pod to be unavailable during upgrades.
