---
sidebar_position: 3
---

# EKS Requirements for a Production Account

A checklist for setting up a production-ready EKS cluster from scratch.

## Cluster Configuration

- [ ] **Kubernetes version**: Latest in EKS standard support — currently **1.36** (confirm on the [EKS version calendar](https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html) before you pin)
- [ ] **API endpoint**: Private only (public access disabled)
- [ ] **Encryption**: Envelope encryption for Kubernetes secrets using a KMS CMK
- [ ] **Logging**: Control plane logging enabled (API server, audit, authenticator)

## Node Management: Karpenter

Karpenter is recommended over managed node groups for production clusters due to its faster scaling, better bin packing, and native spot support.

### Checklist

- [ ] **Karpenter controller** deployed via Helm with Pod Identity (not IRSA)
- [ ] **SQS queue** for spot interruption handling (EventBridge rules for spot interruption, instance state changes)
- [ ] **Node IAM role** with minimal permissions (ECR pull, SSM, CloudWatch)
- [ ] **Separate NodePools** for different workload types:
  - General workloads: spot + on-demand, memory-optimized instances
  - GPU workloads: on-demand, GPU instance types, specific taints
  - CI/CD builds: spot only, dedicated taint to isolate build pods

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
| **CoreDNS** | DNS resolution | Pin version compatible with cluster version |
| **kube-proxy** | Service networking | Pin version |
| **VPC CNI** | Pod networking | Enable network policy support |
| **EBS CSI Driver** | Persistent volumes | Required for StatefulSets |
| **Pod Identity Agent** | IAM credentials for pods | Preferred over IRSA for new setups |
| **AWS Load Balancer Controller** | ALB/NLB ingress | Required for Ingress resources |

Optional but recommended:

| Addon | Purpose |
|-------|---------|
| **GuardDuty EKS Runtime Monitoring** | Threat detection |
| **Node Monitoring Agent** | Node-level health metrics |
| **External Secrets Operator** | Sync secrets from Secrets Manager |
| **Prometheus** | Metrics collection |

## Helm Apps

- [ ] **External Secrets Operator**: For syncing AWS Secrets Manager into Kubernetes Secrets
- [ ] **Prometheus**: Metrics collection and alerting
- [ ] **Karpenter**: Node provisioning (installed via Helm)

## Network Requirements

- [ ] **Private subnets** for nodes and pods (no direct internet access)
- [ ] **Public subnets** for external ALBs only
- [ ] **NAT Gateway** for outbound internet access from private subnets
- [ ] **VPC endpoints** for S3, DynamoDB, ECR, CloudWatch, Secrets Manager, SSM

## Security Groups

- [ ] **Cluster security group**: Allow node SG, allow self
- [ ] **Node security group**: Allow cluster SG, allow ALB SG, allow VPN CIDR
- [ ] **ALB security group**: Allow internet (external) or VPN CIDR (internal)
- [ ] **No direct internet access** to kubectl (private API endpoint)

## GPU Support (if needed)

Install the **NVIDIA GPU Operator** rather than a standalone device plugin. The operator ships the device plugin, CUDA toolkit/driver components as needed, **DCGM**, and **dcgm-exporter**.

- [ ] **NVIDIA GPU Operator** installed (Helm), scoped to GPU NodePools via node selectors / tolerations
- [ ] **DCGM** enabled in the operator (`dcgm.enabled: true`) for GPU health and telemetry
- [ ] **dcgm-exporter** enabled and scraped by Prometheus (`dcgm-exporter.enabled: true`)
- [ ] **GPU PriorityClass** for scheduling priority
- [ ] Separate **NodePool** with GPU instance types, taints (`nvidia.com/gpu=true:NoSchedule`), and matching pod tolerations
- [ ] Fixed AMI ID for GPU nodes (NVIDIA drivers are AMI-version-sensitive)

### DCGM (Data Center GPU Manager)

[DCGM](https://docs.nvidia.com/datacenter/dcgm/latest/user-guide/index.html) is NVIDIA's user-space layer for GPU health, diagnostics, and metrics. On EKS you do not install it by hand on the AMI — the GPU Operator runs:

- **`dcgm`**: host daemon talking to the driver (`nv-hostengine`)
- **`dcgm-exporter`**: DaemonSet that publishes DCGM fields as Prometheus metrics (`DCGM_FI_DEV_*` on port `9400`)

Use DCGM for more than utilization dashboards. At minimum, scrape and alert on:

| Signal | Why it matters |
|--------|----------------|
| `DCGM_FI_DEV_GPU_UTIL` / SM clocks | Idle GPUs that still have pods scheduled (waste) vs. unexpected 0% on a busy replica |
| `DCGM_FI_DEV_FB_USED` / `DCGM_FI_DEV_FB_FREE` | VRAM headroom; KV-cache OOMs show up here before the pod is `OOMKilled` |
| `DCGM_FI_DEV_GPU_TEMP` / `POWER_USAGE` | Thermal or power throttle that looks like "the model got slow" |
| `DCGM_FI_DEV_XID_ERRORS` | Hardware / driver faults; treat non-zero as a node problem, not an app retry |
| ECC / retired pages (where the GPU reports them) | Failing HBM; drain and replace the node |

Example GPU Operator values (trim to your chart version). On Bottlerocket or NVIDIA AMIs, leave the host driver to the AMI:

```yaml
driver:
  enabled: false   # AMI already has the NVIDIA driver
dcgm:
  enabled: true
dcgmExporter:
  enabled: true
  serviceMonitor:
    enabled: true   # if you run Prometheus Operator
devicePlugin:
  enabled: true
toolkit:
  enabled: true
```

Confirm exporter targets after install: `dcgm-exporter` pods `Ready` on every GPU node, Prometheus scraping `:9400`, and `nvidia.com/gpu` allocatable on those nodes. If DCGM is missing, you only have kubelet GPU counts — no health, no VRAM, no XID.

Optional: enable GPU Operator health checks so DCGM can taint a node when a GPU fails, instead of leaving pods scheduled on a dead device.
