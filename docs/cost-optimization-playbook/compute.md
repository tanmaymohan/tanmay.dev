---
sidebar_position: 1
---

# Compute Cost Optimization

Compute is typically the largest line item on an AWS bill. This guide covers techniques to reduce it across EKS workloads.

## Pod Right-Sizing

The single most effective compute optimization. Most Kubernetes deployments have resource requests set too high (or at defaults), leading to wasted capacity.

### How to Do It

1. **Measure actual usage**: Use `kubectl top pods`, Prometheus metrics, or CloudWatch Container Insights to understand real CPU and memory consumption over at least a week.
2. **Compare requests vs actual**: If a pod requests 1 CPU but only uses 0.1 CPU on average, you are wasting 90% of that allocation.
3. **Update requests to match reality**: Set `requests` to the p95 of actual usage. Set `limits` to handle bursts (typically 2-3x requests for CPU, 1.5x for memory).
4. **Roll out gradually**: Staging → UAT → production. Monitor for OOMKills or throttling after each change.

### What to Watch For

- **Memory-heavy stacks**: If most of your apps use more memory than CPU, you are likely running the wrong instance family. Switch from general-purpose (`m6a`) or compute-optimized (`c7i`) to memory-optimized (`r6a`, `r7a`).
- **DaemonSet overhead**: Every node runs DaemonSet pods (monitoring agents, log collectors, CNI, kube-proxy). Fewer nodes means fewer DaemonSet copies — which frees up more capacity for application pods.

## Spot Instances

Spot instances offer 60-90% discounts over on-demand pricing. The trade-off is that AWS can reclaim them with 2 minutes notice.

### Where to Use Spot

- **Non-production environments**: Staging and UAT should run almost entirely on spot. If a node gets reclaimed, pods reschedule automatically.
- **Stateless production workloads**: Web servers, API handlers, and workers that can tolerate a brief restart.
- **GPU training jobs**: Training jobs that checkpoint regularly can resume on a new spot node.

### Where NOT to Use Spot

- **Stateful workloads**: Databases, message brokers, or anything with local persistent storage.
- **Production inference with strict SLA**: If a 30-second pod reschedule is unacceptable, stick to on-demand.

### Spot with Karpenter

Karpenter makes spot instances practical by:
- Automatically selecting instance types with the best spot availability
- Mixing spot and on-demand capacity in the same NodePool
- Consolidating underutilized nodes (replacing a half-empty node with a smaller one, or packing two half-empty nodes into one)
- Handling spot interruptions by draining and rescheduling pods

Example NodePool pattern:

```yaml
apiVersion: karpenter.sh/v1
kind: NodePool
spec:
  template:
    spec:
      requirements:
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot", "on-demand"]
        - key: node.kubernetes.io/instance-type
          operator: In
          values: ["r6a.xlarge", "r6a.2xlarge", "m6a.xlarge"]
  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized
    consolidateAfter: 3m
  limits:
    cpu: "64"
    memory: "128Gi"
```

## Savings Plans

After right-sizing and adopting spot, your remaining on-demand baseline is your commitment candidate.

### Types

- **Compute Savings Plans**: Flexible — applies across any instance family, region, OS, or tenancy. Typically 20-30% discount for a 1-year commitment.
- **EC2 Instance Savings Plans**: Locked to a specific instance family and region. Deeper discount (30-40%) but less flexible.

### How to Size

1. Look at your on-demand spend over the last 3 months in Cost Explorer
2. Identify the steady baseline (the minimum daily spend that never drops below)
3. Commit to 70-80% of that baseline with a Savings Plan
4. Keep the remaining 20-30% flexible for spot and burst capacity

### Common Mistake

Do not buy Savings Plans before right-sizing. If you commit to $1000/month of compute but then right-size down to $700/month, you are paying for $300 of unused commitment.

## Instance Family Selection

| Workload Type | Recommended Family | Why |
|--------------|-------------------|-----|
| Memory-heavy apps (Java, Node.js) | `r6a`, `r7a` | More RAM per vCPU |
| Balanced workloads | `m6a`, `m7a` | Even CPU/RAM ratio |
| CPU-heavy processing | `c7i`, `c7a` | More vCPU per dollar |
| GPU inference | `g6` (L4) | Cost-effective for inference |
| GPU training | `p5` (H100), `g6e` | Higher VRAM for training |
| CI/CD builds | `m6a` on spot | Bursty, stateless, spot-tolerant |

**Graviton** (`r7g`, `m7g`, `c7g`): ARM-based instances offer ~20% better price/performance for workloads that support ARM. Most containerized workloads work on ARM with multi-arch Docker builds.
