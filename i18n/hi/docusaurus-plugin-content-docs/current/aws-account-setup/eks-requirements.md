---
sidebar_position: 3
---

# Production Account के लिए EKS Requirements

Scratch से production-ready EKS cluster set up करने की checklist।

## Cluster Configuration

- [ ] **Kubernetes version**: EKS standard support में latest — अभी **1.36** (pin करने से पहले [EKS version calendar](https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html) confirm करो)
- [ ] **API endpoint**: Private only (public access disabled)
- [ ] **Encryption**: KMS CMK से Kubernetes secrets की envelope encryption
- [ ] **Logging**: Control plane logging enabled (API server, audit, authenticator)

## Node Management: Karpenter

Production clusters के लिए managed node groups की जगह Karpenter recommend है — faster scaling, better bin packing, और native spot support की वजह से।

### Checklist

- [ ] **Karpenter controller** Pod Identity (IRSA नहीं) के साथ Helm से deployed
- [ ] Spot interruption handling के लिए **SQS queue** (spot interruption, instance state changes के लिए EventBridge rules)
- [ ] Minimal permissions वाला **Node IAM role** (ECR pull, SSM, CloudWatch)
- [ ] अलग-अलग workload types के लिए **अलग NodePools**:
  - General workloads: spot + on-demand, memory-optimized instances
  - GPU workloads: on-demand, GPU instance types, specific taints
  - CI/CD builds: spot only, build pods isolate करने के लिए dedicated taint

### EC2NodeClass Pattern

```yaml
apiVersion: karpenter.k8s.aws/v1
kind: EC2NodeClass
spec:
  role: KarpenterNodeRole
  amiSelectorTerms:
    - alias: bottlerocket@latest
  blockDeviceMappings:
    - deviceName: /dev/xvda
      ebs:
        volumeSize: 150Gi
        volumeType: gp3
        encrypted: true
  subnetSelectorTerms:
    - tags:
        karpenter.sh/discovery: my-cluster
  securityGroupSelectorTerms:
    - tags:
        karpenter.sh/discovery: my-cluster
```

## Required Addons

| Addon | Purpose | Notes |
|-------|---------|-------|
| **CoreDNS** | DNS resolution | Cluster version compatible version pin करो |
| **kube-proxy** | Service networking | Version pin करो |
| **VPC CNI** | Pod networking | Network policy support enable करो |
| **EBS CSI Driver** | Persistent volumes | StatefulSets के लिए ज़रूरी |
| **Pod Identity Agent** | Pods के लिए IAM credentials | नए setups के लिए IRSA से preferred |
| **AWS Load Balancer Controller** | ALB/NLB ingress | Ingress resources के लिए ज़रूरी |

Optional लेकिन recommended:

| Addon | Purpose |
|-------|---------|
| **GuardDuty EKS Runtime Monitoring** | Threat detection |
| **Node Monitoring Agent** | Node-level health metrics |
| **External Secrets Operator** | Secrets Manager से secrets sync |
| **Prometheus** | Metrics collection |

## Helm Apps

- [ ] **External Secrets Operator**: AWS Secrets Manager से Kubernetes Secrets में sync
- [ ] **Prometheus**: Metrics collection और alerting
- [ ] **Karpenter**: Node provisioning (Helm से install)

## Network Requirements

- [ ] Nodes और pods के लिए **Private subnets** (कोई direct internet access नहीं)
- [ ] सिर्फ़ external ALBs के लिए **Public subnets**
- [ ] Private subnets से outbound internet access के लिए **NAT Gateway**
- [ ] S3, DynamoDB, ECR, CloudWatch, Secrets Manager, SSM के लिए **VPC endpoints**

## Security Groups

- [ ] **Cluster security group**: Node SG allow, self allow
- [ ] **Node security group**: Cluster SG allow, ALB SG allow, VPN CIDR allow
- [ ] **ALB security group**: Internet allow (external) या VPN CIDR (internal)
- [ ] kubectl के लिए **कोई direct internet access नहीं** (private API endpoint)

## GPU Support (अगर ज़रूरत हो)

Standalone device plugin की जगह **NVIDIA GPU Operator** install करो। Operator device plugin, ज़रूरत के हिसाब से CUDA toolkit/driver, **DCGM**, और **dcgm-exporter** साथ लाता है।

- [ ] **NVIDIA GPU Operator** installed (Helm), GPU NodePools पर node selectors / tolerations से scoped
- [ ] Operator में **DCGM** enabled (`dcgm.enabled: true`) — GPU health और telemetry के लिए
- [ ] **dcgm-exporter** enabled और Prometheus से scrape (`dcgm-exporter.enabled: true`)
- [ ] Scheduling priority के लिए **GPU PriorityClass**
- [ ] GPU instance types, taints (`nvidia.com/gpu=true:NoSchedule`), और matching pod tolerations वाला अलग **NodePool**
- [ ] GPU nodes के लिए Fixed AMI ID (NVIDIA drivers AMI-version-sensitive हैं)

### DCGM (Data Center GPU Manager)

[DCGM](https://docs.nvidia.com/datacenter/dcgm/latest/user-guide/index.html) NVIDIA का user-space layer है GPU health, diagnostics, और metrics के लिए। EKS पर AMI में हाथ से install मत करो — GPU Operator चलाता है:

- **`dcgm`**: driver से बात करने वाला host daemon (`nv-hostengine`)
- **`dcgm-exporter`**: DaemonSet जो DCGM fields को Prometheus metrics के रूप में publish करता है (`DCGM_FI_DEV_*`, port `9400`)

DCGM सिर्फ़ utilization dashboard नहीं है। कम से कम इन पर scrape और alert रखो:

| Signal | क्यों ज़रूरी है |
|--------|----------------|
| `DCGM_FI_DEV_GPU_UTIL` / SM clocks | Scheduled pods के साथ idle GPU (waste) vs busy replica पर unexpected 0% |
| `DCGM_FI_DEV_FB_USED` / `DCGM_FI_DEV_FB_FREE` | VRAM headroom; KV-cache OOM अक्सर `OOMKilled` से पहले यहाँ दिखता है |
| `DCGM_FI_DEV_GPU_TEMP` / `POWER_USAGE` | Thermal या power throttle जो "model धीमा हो गया" जैसा लगता है |
| `DCGM_FI_DEV_XID_ERRORS` | Hardware / driver faults; non-zero को node problem मानो, app retry नहीं |
| ECC / retired pages (जहाँ GPU report करे) | Failing HBM; node drain करके replace करो |

GPU Operator values का example (अपने chart version के हिसाब से trim करो)। Bottlerocket या NVIDIA AMIs पर host driver AMI पर छोड़ो:

```yaml
driver:
  enabled: false   # AMI में NVIDIA driver पहले से है
dcgm:
  enabled: true
dcgmExporter:
  enabled: true
  serviceMonitor:
    enabled: true   # अगर Prometheus Operator चल रहा है
devicePlugin:
  enabled: true
toolkit:
  enabled: true
```

Install के बाद: हर GPU node पर `dcgm-exporter` pods `Ready`, Prometheus `:9400` scrape कर रहा हो, और उन nodes पर `nvidia.com/gpu` allocatable हो। DCGM न हो तो सिर्फ़ kubelet GPU counts मिलते हैं — health, VRAM, XID नहीं।

Optional: GPU Operator health checks enable करो ताकि GPU fail होने पर DCGM node taint कर दे, dead device पर pods schedule न हों।
