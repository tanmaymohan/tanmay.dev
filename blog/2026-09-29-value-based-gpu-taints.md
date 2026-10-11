---
slug: isolating-gpu-pools-with-value-based-taints
title: "Isolating GPU Pools with Value-Based Taints"
authors: [tanmay]
tags: [gpu, kubernetes, aws]
description: "How to isolate GPU workloads using value-based taints: keep taint key as nvidia.com/gpu, change only the value. NVIDIA device plugin tolerates by key (Exists), workloads tolerate by value (Equal). Prevents cross-contamination and capacity confusion."
keywords: ["Karpenter GPU isolation", "value-based taints", "nvidia.com/gpu taint", "GPU NodePool", "Kubernetes taints tolerations", "NVIDIA device plugin", "GPU workload isolation"]
image: /img/author.jpg
---

Each GPU workload in my current cluster has its own Karpenter NodePool. The isolation trick is small: keep the taint **key** as `nvidia.com/gpu`, and change only the **value**.

{/* truncate */}

The NVIDIA device plugin tolerates by key (`operator: Exists`), so it still runs on every pool and the nodes still advertise GPUs. Each workload tolerates only its own value (`operator: Equal`), so other GPU apps are repelled.

```mermaid
flowchart LR
    subgraph POOL["GPU pool for workload A, taint nvidia.com/gpu=workload-a"]
        N1["GPU node"]
    end
    DP["NVIDIA device plugin tolerates the key"] -->|"runs on every GPU pool"| N1
    WA["Workload A tolerates value workload-a"] -->|"scheduled"| N1
    WB["Other GPU apps tolerate a different value"] -.->|"repelled"| N1
```

## The failure mode if you invent a key

A new taint key looks cleaner in a diagram. The device plugin does not tolerate it. It will not run on those nodes. The nodes advertise no GPUs. Pods sit Pending. It looks exactly like a capacity shortage, which is how you waste a day raising quotas.

```yaml
taints:
  - key: nvidia.com/gpu
    value: workload-a
    effect: NoSchedule
```

The matching toleration on the workload uses `operator: Equal` and that same value. The device plugin's toleration stays `operator: Exists` on the key, with no value.

Karpenter still tries the **higher** NodePool weight first. Put the preferred family at the higher weight, not the lower one.

A sanitized reference pool — spot with on-demand fallback, a GPU limit, `WhenEmpty` after 15 minutes, a dated AMI alias, and a 150 GiB gp3 root volume — is the shape behind the Blackwell inference pool. Pin the AMI alias to a dated release. `latest` is how a toolkit bump reaches every GPU node at once.
