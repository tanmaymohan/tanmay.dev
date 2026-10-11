---
slug: cutting-gpu-cold-starts-on-eks
title: "Cutting GPU Cold Starts on EKS, with Numbers"
authors: [tanmay]
tags: [gpu, kubernetes, aws, cost]
description: "Benchmark results for GPU image pull optimization on EKS: NVMe, Bottlerocket, SOCI lazy loading, parallel pulls, FastImagePull, EBS throughput. Best config: 43s (54% faster) with AL2023 FastImagePull + 600 MiB/s EBS. SOCI parallel-pull hit 49s."
keywords: ["GPU cold starts", "EKS image pull", "SOCI lazy loading", "FastImagePull", "Bottlerocket", "NVMe instance store", "Karpenter GPU", "container image optimization"]
image: /img/author.jpg
---

Scale-to-zero is cheap until the first request waits on an image pull. I benchmarked NVMe instance storage, Bottlerocket, SOCI, AL2023 FastImagePull, and EBS throughput on a fresh node every time.

Setup: **g4dn.xlarge**, a **3.6 GB** image, **one run per configuration**. Treat the numbers as indicative, not a paper.

{/* truncate */}

| Test | Configuration | Pull time | vs baseline |
|---|---|---|---|
| t0 | AL2023, gp3, 3 parallel downloads | 94.3 s | — |
| t1 | plus NVMe instance store | 91.0 s | −4% |
| t2 | plus 10 parallel downloads | 82.6 s | −12% |
| t3a | Bottlerocket, EBS, 10 parallel downloads | 76.7 s | −19% |
| t3b | Bottlerocket plus NVMe | 77.4 s | −18% |
| t4 | Bottlerocket plus SOCI lazy loading | 92.8 s | −2% |
| t4b | Bottlerocket plus SOCI parallel-pull | 60.8 s | −36% |
| t5 | AL2023 FastImagePull, EBS at 600 MiB/s | 43.0 s | −54% |
| t5b | Bottlerocket, SOCI parallel-pull, NVMe | 48.5 s | −49% |

## What actually moved

**Lazy loading barely helps ML images.** The process needs the model layers immediately, so "start while the rest pulls" does not hide the bytes. Parallel pulling and disk throughput do.

NVMe on its own was a 4% change. Bottlerocket without a pull-mode change was about 19%. The two configs under 50 seconds both pushed more bytes at once: SOCI in parallel-pull mode, or FastImagePull on a faster gp3 volume.

## Two caveats before you copy t5

Test t5 ran on a **4-vCPU** instance. FastImagePull is reportedly ignored below 8 vCPUs. The EBS jump from 125 to **600 MiB/s** may deserve the credit. Re-test on a larger instance before you publish a claim about FastImagePull itself.

SOCI indexes have to be **re-pushed for every image** and version-matched to the node. Otherwise they are silently ignored, and you are back on a normal pull with extra CI work.

For a roughly 19-node general apps pool, **300 MiB/s** of EBS throughput was the cost-efficient point. GPU root volumes in the inference NodePool are a different story: 150 GiB gp3 at 4,000 IOPS and 600 MiB/s, because the image is tens of gigabytes, not 3.6.

A full inference cold start is still minutes once you add the driver and the model load. This table is only the pull. The platform around it is in [Scale-to-zero GPU inference on EKS](/blog/scale-to-zero-mlops-on-eks).
