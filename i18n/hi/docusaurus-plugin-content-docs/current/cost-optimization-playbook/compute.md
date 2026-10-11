---
sidebar_position: 1
---

# Compute Cost Optimization

Compute typically AWS bill का सबसे बड़ा line item होता है। यह guide EKS workloads पर इसे कम करने की techniques cover करती है।

## Pod Right-Sizing

सबसे effective compute optimization। ज़्यादातर Kubernetes deployments में resource requests बहुत ज़्यादा set होते हैं (या defaults पर), जिससे capacity waste होती है।

### कैसे करें

1. **Actual usage measure करो**: `kubectl top pods`, Prometheus metrics, या CloudWatch Container Insights से कम से कम एक हफ़्ते की real CPU और memory consumption समझो।
2. **Requests vs actual compare करो**: अगर pod 1 CPU request करता है लेकिन average में 0.1 CPU ही use करता है, तो 90% allocation waste है।
3. **Requests को reality से match करो**: `requests` को actual usage की p95 पर set करो। `limits` burst handle करने के लिए (CPU के लिए typically 2-3x requests, memory के लिए 1.5x)।
4. **Gradually rollout करो**: Staging → UAT → production। हर बदलाव के बाद OOMKills या throttling monitor करो।

### ध्यान रखने वाली बातें

- **Memory-heavy stacks**: अगर ज़्यादातर apps CPU से ज़्यादा memory use करती हैं, तो शायद ग़लत instance family चला रहे हो। General-purpose (`m6a`) या compute-optimized (`c7i`) से memory-optimized (`r6a`, `r7a`) पर switch करो।
- **DaemonSet overhead**: हर node पर DaemonSet pods चलते हैं (monitoring agents, log collectors, CNI, kube-proxy)। कम nodes मतलब कम DaemonSet copies — जो application pods के लिए ज़्यादा capacity free करता है।

## Spot Instances

Spot instances on-demand pricing पर 60-90% discount देते हैं। Trade-off यह है कि AWS 2 मिनट की notice में इन्हें reclaim कर सकता है।

### कहाँ use करें Spot

- **Non-production environments**: Staging और UAT लगभग पूरी तरह spot पर चलने चाहिए। Node reclaim होने पर pods अपने आप reschedule हो जाते हैं।
- **Stateless production workloads**: Web servers, API handlers, और workers जो brief restart tolerate कर सकते हैं।
- **GPU training jobs**: Regularly checkpoint करने वाली training jobs नए spot node पर resume हो सकती हैं।

### कहाँ Spot use न करें

- **Stateful workloads**: Databases, message brokers, या कोई भी चीज़ जिसमें local persistent storage है।
- **Strict SLA वाली production inference**: अगर 30-second pod reschedule unacceptable है, on-demand पर रहो।

### Karpenter के साथ Spot

Karpenter spot instances को practical बनाता है:
- Best spot availability वाले instance types अपने आप select करता है
- Same NodePool में spot और on-demand capacity mix करता है
- Underutilized nodes consolidate करता है (half-empty node को छोटे से replace करना, या दो half-empty nodes को एक में pack करना)
- Spot interruptions handle करता है — pods drain और reschedule करके

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

Right-sizing और spot adopt करने के बाद, बचा हुआ on-demand baseline commitment का candidate है।

### Types

- **Compute Savings Plans**: Flexible — किसी भी instance family, region, OS, या tenancy पर apply होता है। 1-year commitment पर typically 20-30% discount।
- **EC2 Instance Savings Plans**: Specific instance family और region पर locked। ज़्यादा discount (30-40%) लेकिन कम flexible।

### Size कैसे करें

1. Cost Explorer में पिछले 3 महीने का on-demand spend देखो
2. Steady baseline identify करो (minimum daily spend जो कभी नीचे नहीं जाता)
3. उस baseline के 70-80% पर Savings Plan commit करो
4. बाकी 20-30% flexible रखो spot और burst capacity के लिए

### Common Mistake

Right-sizing से पहले Savings Plans मत ख़रीदो। अगर $1000/month compute पर commit किया लेकिन फिर $700/month तक right-size किया, तो $300 unused commitment पर pay कर रहे हो।

## Instance Family Selection

| Workload Type | Recommended Family | क्यों |
|--------------|-------------------|-------|
| Memory-heavy apps (Java, Node.js) | `r6a`, `r7a` | ज़्यादा RAM per vCPU |
| Balanced workloads | `m6a`, `m7a` | Even CPU/RAM ratio |
| CPU-heavy processing | `c7i`, `c7a` | ज़्यादा vCPU per dollar |
| GPU inference | `g6` (L4) | Inference के लिए cost-effective |
| GPU training | `p5` (H100), `g6e` | Training के लिए ज़्यादा VRAM |
| CI/CD builds | `m6a` spot पर | Bursty, stateless, spot-tolerant |

**Graviton** (`r7g`, `m7g`, `c7g`): ARM-based instances ~20% better price/performance देते हैं उन workloads के लिए जो ARM support करते हैं। ज़्यादातर containerized workloads multi-arch Docker builds से ARM पर चलते हैं।
