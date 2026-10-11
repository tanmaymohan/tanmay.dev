---
slug: serving-a-31b-4bit-model-on-blackwell-spot
title: "Serving a 31B 4-bit Model on Blackwell Spot GPUs"
authors: [tanmay]
tags: [gpu, kubernetes, ai, aws]
description: "Running a 31B NVFP4 model exclusively on Blackwell spot GPUs with no fallback. 29.5 GB image, 1800s ALB timeout, 3600s progress deadline, 15.5min startup probe for kernel JIT. Why NVFP4 requires Blackwell and why Pending is better than wrong-family scheduling."
keywords: ["NVFP4 quantization", "Blackwell GPU", "B200 B300", "31B model serving", "vLLM FlashInfer", "spot-only GPU", "Karpenter spot", "GPU kernel JIT"]
image: /img/author.jpg
---

A roughly 31B-parameter multimodal model, quantized to **NVFP4**, runs only on Blackwell. The 4-bit kernels are not a format you can fall back onto an L40S or an L4. The service is spot-only, with **no fallback on purpose**. If there is no Blackwell capacity, the pod stays Pending and nothing is billed.

{/* truncate */}

Weights are baked into a **29.5 GB** image. The ALB idle timeout moved from 900 to **1,800** seconds. `progressDeadlineSeconds` on the Deployment is **3,600**. The startup probe allows **15.5 minutes** for kernel JIT on first start.

## Probes

The liveness probe (180 seconds) is deliberately slower than the readiness probe (60 seconds). Heavy compute must not look like a dead process. Without the long startup budget, the kubelet kills the pod mid-compile and it loops forever.

Forcing the FlashInfer attention backend failed. Let vLLM pick the backend.

## Why no fallback

A spot waterfall is the right default for the rest of the platform, written up in [Scale-to-zero GPU inference on EKS](/blog/scale-to-zero-mlops-on-eks). This model is the exception. An L40S cannot run NVFP4. Scheduling it there would Pending in a more confusing way, or serve an error after you paid for the node. Pending on the right family is cheaper.

Canary the AMI on one node and confirm it advertises a GPU before you raise the pool limit. A node that never advertises the device still bills.
