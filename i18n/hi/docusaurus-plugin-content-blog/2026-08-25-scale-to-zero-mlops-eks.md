---
slug: scale-to-zero-mlops-on-eks
title: "EKS पर Scale-to-Zero MLOps: GPU Idle Spend खत्म, बिना 5 मिनट के Cold Start के"
authors: [tanmay]
tags: [mlops, gpu, kubernetes, aws, cost, ai]
---

रात भर idle पड़ा GPU node "available capacity" नहीं है। वह एक line item है। Intermittent inference के लिए `g6e` या `g7e` 24/7 चलाओ तो पहला token जाने से पहले ही लगभग **$10k/माह** जल सकता है। मैंने तीन महीने में AWS EKS पर एक event-driven MLOps platform बनाया जो GPU replicas को zero तक scale करता है, mission-critical sessions को Spot से दूर रखता है, और 15 GB+ LLM images पर **sub-60-second cold starts** का लक्ष्य रखता है।

यह GPU path है: architecture, hardware constraints, और scars।

{/* truncate */}

## $10,000/माह का Idle GPU Problem

Inference traffic bursty है। Fine-tuning और eval jobs और ज़्यादा। Clinical tool पर sessions तब होते हैं जब कोई उसे इस्तेमाल कर रहा हो, फिर रुक जाते हैं। इनमें से कोई 3 बजे रात को गर्म GPU fleet justify नहीं करता।

जो बार-बार दिखता था:

- **Static GPU Deployments** `replicas: 1` (या "HA" के लिए `replicas: 2`) ऐसे nodes पर जो एक से ज़्यादा inference pod pack ही नहीं करते
- **असली SLA image pull है**। Fresh node पर 15 GB Triton / vLLM image NAT और default `gp3` से 5–8 मिनट का event है
- **Spot ICE** (`InsufficientInstanceCapacity`) एक GPU family पर — "सस्ता" NodePool pods को `Pending` में छोड़ देता है
- **KV cache silent OOM**। 24 GB weight file 24 GB L4 (`g6.2xlarge`) पर पहले concurrent request के KV cache से पहले ही भर चुकी है

लक्ष्य mechanical था: **`active_sessions == 0` पर कोई GPU burn नहीं**, और Spot सूखने पर defined fallback।

## Architecture Blueprint: Event-Driven Scale-to-Zero

Control loop on-demand GPU inference और quantized Qwen 3.5 (NVFP4) server दोनों के लिए एक है:

1. Client API hit करता है (या clinical tool से webhook)।
2. API **active session metric** लिखता है (Prometheus gauge, या DynamoDB/Redis counter जिसे Prometheus scrape करे)।
3. **KEDA** GPU Deployment को 0 से N scale करता है।
4. **Karpenter** Spot waterfall से GPU node लाता है, या जब SLA interruption मना करे तो On-Demand / ODCR से।
5. **15 मिनट inactivity** के बाद KEDA 0 पर लौटता है। Karpenter node consolidate करता है।

```text
Client / App ──HTTP / webhook──► API
                                    │
                                    │  active_sessions metric
                                    ▼
                                  KEDA
                                    │
                                    │  replicas > 0
                                    ▼
                               Karpenter
                    ┌───────────────┼───────────────┐
                    │               │               │
              g7e Spot         g6e / g6 Spot     g5 Spot
                    │               │               │
                    └───────┬───────┴───────┬───────┘
                            │  Spot drought │
                            ▼               ▼
                         ODCR /        On-Demand
                       reserved pool   (clinical)
                            │
                            ▼
                     EKS GPU node
                            │
              SOCI lazy-load via ECR + S3 VPC endpoints
                            │
                            ▼
                  vLLM / SGLang  ──►  GPU VRAM (gp3)
                            │
                   15 min idle ──►  KEDA scale to 0
```

### GPU inference with scale-to-zero

Trigger एक **VPC-only URL** है। API GPU pod को internet पर expose नहीं करता। वह `active_sessions` set करता है और replica count KEDA के पास रहता है।

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: gpu-inference
spec:
  scaleTargetRef:
    name: gpu-inference
  minReplicaCount: 0
  maxReplicaCount: 4
  cooldownPeriod: 900   # 15 minutes
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://prometheus.monitoring.svc:9090
        metricName: active_sessions
        query: sum(active_sessions{workload="gpu-inference"})
        threshold: "1"
```

Spot families weighted fallbacks हैं: पहले `g7e` (VRAM bandwidth, कम TTFT), फिर `g6e` / `g6`, फिर `g5`। Capacity type Spot है, जब तक नहीं।

### Quantized LLM server (Qwen 3.5, NVFP4)

वही scaler। दूसरा engine। **vLLM / SGLang** Qwen 3.5 को **NVFP4** (4-bit floating point) में serve करता है। NVFP4 generation quality को naive INT8 cut से ज़्यादा higher-precision baseline के पास रखता है, और FP8/FP16 से लगभग आधा weight memory लेता है। वह headroom KV cache के लिए है, छोटे GPU पर checkpoint गिराने का कारण नहीं।

NVFP4 सिर्फ़ **RTX PRO 6000** या **B200 / B300** पर चला। वही GPUs NVFP4 kernels execute करते थे। Spot waterfall (`g7e`, `g6e`, `g6`, `g5`) दूसरे inference path के लिए है, इस server के लिए नहीं।

जो hardware-software co-design सच में मायने रखता था:

- **SM occupancy**: vLLM / SGLang CUDA kernels इस पर जीते-मरते हैं कि SM कितने warps in-flight रख सकता है। Block size और batch caps occupancy knobs हैं, सिर्फ़ `max_num_seqs` लोककथा नहीं।
- **KV cache VRAM**: static weights फर्श हैं, छत नहीं। Instance को `weights + KV(concurrent seqs × context) + allocator fragmentation` से size करो, safetensor file size से नहीं।
- **NVFP4 GPUs**: RTX PRO 6000, B200, या B300। कोई और family नहीं।

### Hybrid edge-to-cloud clinical tool

On-prem **Mac Studio** clinical tool चलाता है। Session शुरू होते ही webhook API को hit करता है, `active_sessions = 1`, और KEDA उस session के लिए EKS GPU node cold-start करता है।

यह pool **सिर्फ़ On-Demand** है। Session के बीच Spot reclaim cost optimization नहीं है। Failed session है। Idle-spend नियम वही रहता है: session खत्म, cooldown fire, replicas 0।

### Multi-region GPU test rig

Production से अलग: कई regions में EC2 GPU boxes (L4 / L40S / A10G) **cost-arbitrage** और SKU availability tests के लिए। Tag enforcement automated है ताकि FinOps allocation किसी के याद रखने पर depend न करे।

### Capacity matrix

| Traffic shape | Scaler | Capacity |
|---|---|---|
| Baseline business hours | KEDA **Cron** ~15 मिनट पहले pre-warm | GPU NodePool पहले से join कर रहा हो |
| Spiky GPU jobs | Prometheus `active_sessions` + Karpenter Spot | GPU Spot waterfall |
| Clinical tool / session-critical | Prometheus `active_sessions` | **On-Demand** GPU NodePool |

## Cold-Start Boss: 15 GB Images 60 सेकंड से कम में

Scale-to-zero तब तक मुफ़्त है जब तक पहला user `docker pull` के लिए आठ मिनट न बैठे। असली लड़ाई यही थी।

### SOCI lazy loading

**Seekable OCI (SOCI)** ECR images index करता है ताकि runtime सिर्फ़ ज़रूरी files pull करते हुए container शुरू कर सके। Index generation की कीमत CI में है (मैं GitHub Actions में async चलाता हूँ); boot पूरे 15 GB disk पर उतरने का इंतज़ार नहीं करता।

SOCI के बिना cold node यह करता है:

1. हर layer NAT से pull (throughput + cost)
2. Default gp3 पर unpack
3. फिर multi-GB weights VRAM में copy

SOCI + private endpoints + disk throughput पर critical path करीब यह है: **process start → needed pages fault-in → weights load**।

### ECR और S3 VPC endpoints

Container pulls और weight objects **ECR और S3 gateway/interface endpoints** से जाते हैं। NAT bandwidth caps और public internet का extra hop हटता है। Cost control भी: GPU nodes का NAT से भारी image pull silent tax है।

### VRAM feeder के रूप में gp3

Weights अभी भी disk से GPU memory में जाने हैं। जहाँ node class allow करे, **gp3** पर elevated throughput (लगभग **1000 MiB/s**) ताकि safetensor load default 125 MiB/s से throttle न हो। Tune **disk → CPU → PCIe → VRAM** है, Kubernetes `startupProbe` seconds नहीं।

Physics गायब नहीं होती। जिस model को tens of gigabytes weights छूने हैं, वह 200 ms में cold-start नहीं होगा। लक्ष्य हमारे inference images के लिए **एक मिनट से कम** था — हर checkpoint के लिए जादू की संख्या नहीं।

## Karpenter Spot Waterfalls और Spot Drought Defense

Single-family GPU NodePool उसी हफ़्ते fail होगा जब GPUs चाहिए। Waterfall **InsufficientInstanceCapacity** पर `Pending` से बचाता है।

**Priority 1 — performant Spot:** `g7e` (और जब वही best हो तो `g6e`)। सबसे ज़्यादा VRAM bandwidth, बेहतर TTFT।

**Priority 2 — degraded Spot:** ऊपर सूखे तो `g6` / `g5`। Latency और batch size बदलते हैं। Product को यह स्वीकार करना होगा, वरना fallback झूठ है।

**Priority 3 — guaranteed:** **On-Demand Capacity Reservations (ODCR)** या dedicated On-Demand pool ताकि pods unschedulable न बैठें।

Karpenter में यह multiple NodePools हैं (या wide instance-type set वाला एक pool + अलग ODCR pool) — कोई काल्पनिक `priority: 1` field नहीं। Rough shape:

```yaml
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: gpu-spot-waterfall
spec:
  template:
    spec:
      requirements:
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot"]
        - key: node.kubernetes.io/instance-type
          operator: In
          values:
            - g7e.xlarge
            - g6e.xlarge
            - g6.2xlarge
            - g5.2xlarge
      taints:
        - key: nvidia.com/gpu
          value: "true"
          effect: NoSchedule
  limits:
    nvidia.com/gpu: 8
```

दूसरा NodePool `capacity-type: on-demand` (और जहाँ reserved हो वहाँ ODCR) clinical tool और drought के लिए है। Latency flex कर सकने वाले inference pods Spot pool सहते हैं; session-critical सिर्फ़ On-Demand — taints, labels, PriorityClasses; hope नहीं।

## Trade-offs (scars)

| Choice | Flex | Scar | Mitigation |
|---|---|---|---|
| KEDA scale-to-zero | Zero GPU idle spend | पहला user cold-start भरता है | Cron pre-warm; SOCI; gp3 throughput |
| Spot waterfall | Cost + कुछ uptime | TTFT SKU के हिसाब से बदलता है | Workload के हिसाब से SLA; clinical tool On-Demand |
| SOCI lazy load | Sub-minute boots | CI में index build | GitHub Actions में async SOCI |

Weights pull करने वाले GPU pods **IRSA** इस्तेमाल करते हैं। उन containers में `AKIA*` keys नहीं। बाक़ी platform पर यही नियम non-GPU post में है।

## Summary: GPU Scale-to-Zero Checklist

GPU side ख़ुद जोड़ रहे हो तो:

1. **GPU Deployments 0 से scale करो।** Idle process के CPU पर नहीं — `active_sessions` पर KEDA।
2. **SLAs बाँटो।** Interruptible inference के लिए Spot waterfall। Reclaim न सह सकने वाले sessions के लिए On-Demand / ODCR।
3. **Scale-to-zero का दावा pull path ठीक करने के बाद।** SOCI indexes, ECR/S3 VPC endpoints, gp3 throughput। वरना "zero idle" पहला request आठ मिनट का है।
4. **Checkpoint file नहीं, KV cache के हिसाब से size करो।** Concurrency आने के बाद L4 24 GB model GPU नहीं है।
5. **NVFP4 capacity strategy सिर्फ़ RTX PRO 6000 या B200 / B300 पर है।** KV headroom इसी से मिलता है। बाक़ी Spot waterfall पर यह format नहीं गिरता।
6. **GPU pods पर IRSA।** Weight pull करने वाले containers में static keys — credentials तुम्हारे सबसे महँगे nodes में पहुँचते हैं।
7. **Calendar जब load balancer हो तो pre-warm करो।** Business hours से 15 मिनट पहले Cron scaler humans को cold start से बेहतर है।

GPU तरफ NVIDIA **Video Search and Summarization** blueprints Brev Launchables और NemoClaw agent skills से `g6e` / `g7e` पर: synthetic FPS footage पर high frame-rate extraction (HUD noise काटने के लिए edge-crop), और घने dashcam video पर lower-rate, motion-filtered indexing। Production वाली ही सीख — idle GPUs optional हैं; cold-start engineering नहीं।

Provider-level GPU notes: [Running GPUs in 2026](/docs/running-gpus-in-2026)। Unmanaged GPU VMs को EKS में लाने वाला पिछला लेख: [Migrating GPU workloads across clouds](/blog/migrating-gpu-workloads-across-clouds)।
