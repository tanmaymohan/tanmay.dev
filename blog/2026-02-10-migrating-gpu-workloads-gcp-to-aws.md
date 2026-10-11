---
slug: migrating-gpu-workloads-across-clouds
title: "Migrating 4 GPU Workloads from GCP to AWS in a Month"
authors: [tanmay]
tags: [gpu, cloud, aws, migration]
description: "How I moved 4 GPU workloads (Whisper, Triton, Stable Diffusion 3, vLLM) from GCP to AWS EKS in 4 weeks. Covers containerization, TensorRT-LLM, Karpenter, and lessons learned."
keywords: ["GPU migration", "GCP to AWS", "EKS GPU workloads", "TensorRT-LLM", "vLLM", "Karpenter", "Triton Inference Server"]
image: /img/author.jpg
---

We had four GPU workloads running on GCP virtual machines — speech-to-text, a general Triton inference server, Stable Diffusion 3, and an open-source LLM server. They were unmanaged, undocumented, and expensive. I moved all four to AWS EKS in about a month. Here is how it went and what I learned.

{/* truncate */}

## Why We Moved

Four things pushed the decision:

1. **GPU availability on GCP was inconsistent**. Quota increases took time, and the specific GPU SKUs we needed were not always available in the regions we operated in.
2. **Cost consolidation**. Running GPU workloads on a separate cloud provider meant a separate billing relationship, separate IAM, separate networking. The overhead of managing two clouds for what was a small GPU fleet did not justify itself.
3. **Management overhead**. The GCP GPU instances were manually provisioned VMs — no Kubernetes, no CI/CD, no proper monitoring. Every deployment was SSH-and-pray.
4. **Latency**. Production traffic already lived in AWS while the GPUs lived in GCP. That extra hop was a problem for audio, client-facing apps.

The goal was simple: bring everything into AWS EKS where the rest of our infrastructure already lived, managed through the same CI/CD pipelines and monitoring stack.

## What We Moved

### 1. Whisper Audio (Speech-to-Text)

This was the most complex workload. We were running OpenAI's Whisper model for audio transcription.

On GCP, it ran as a standalone process on a VM with an NVIDIA GPU. On AWS, I rebuilt it using **NVIDIA Triton Inference Server** with **TensorRT-LLM**:

- **Multi-stage Docker build**: The first stage compiles TRT-LLM engines from Hugging Face model weights using `convert_checkpoint.py` and `trtllm-build` (FP16, max batch size 2). The second stage copies the compiled engines into a lightweight Triton runtime image.
- **Model weights**: Synced from S3 into the Docker image at build time. This makes the image self-contained — no runtime downloads, no model registry dependency.
- **Serving**: Triton exposes gRPC (port 8001) and HTTP (port 8000) endpoints. We use the gRPC endpoint for low-latency inference from backend services.
- **Batching**: Dynamic batching enabled in Triton with a max queue delay of 100 microseconds. The BLS (Business Logic Scripting) pipeline handles WAV input → Whisper inference → transcript output.

**Target instance**: `g6.xlarge` (NVIDIA L4, 24 GB VRAM) — more than enough for the Whisper FP16 engines.

### 2. Triton Inference Server (General)

A general-purpose Triton server hosting multiple smaller models. This was a straightforward Docker image (`nvcr.io/nvidia/tritonserver:24.06-py3`) with a model repository mounted from persistent storage.

On AWS, it runs in EKS with a dedicated GPU node pool managed by Karpenter. The node pool is configured to only schedule GPU workloads (using taints and tolerations), so non-GPU pods never land on expensive GPU nodes.

### 3. Image Generation (SD3)

Stable Diffusion 3 for internal image generation. On GCP it was a dedicated VM; on AWS it ran on a `g6.2xlarge` (NVIDIA L4) in EKS.

After the move I learned the workload was barely used. I tore down the always-on node and kept the Deployment in Git for on-demand spin-up. That alone removed a full `g6.2xlarge` on-demand bill.

### 4. Open-Source LLM Serving

We were evaluating open-source LLMs. I stood up **vLLM** as an OpenAI-compatible API:

```dockerfile
FROM vllm/vllm-openai:v0.6.3
CMD ["--model", "mistralai/Mistral-7B-Instruct-v0.3", "--port", "8080", "--host", "0.0.0.0"]
```

Pin the image tag — do not ship `latest`. vLLM handles KV-cache, continuous batching, and tensor parallelism. The OpenAI chat-completions API meant backend services only had to change the base URL.

I tested a few GPU layouts:
- **H200** with tensor parallelism 2 — better for latency-sensitive calls
- **B200** with tensor parallelism 1 — better throughput at higher concurrency (~80–100 concurrent requests)

There is no universal “best” setting. Optimal concurrency depends on the GPU and the parallelism strategy.

## How the Migration Worked

### Step 1: Extract Data and Models

Copied model weights, embeddings, and any persisted data from GCP VMs to S3. For large models, I used `gsutil` to copy from GCS to a local staging area, then `aws s3 sync` to push to the target bucket.

### Step 2: Containerize Everything

Each workload got its own Dockerfile. The key decisions:

- **Pin base images**: Use specific NVIDIA container image tags (e.g., `nvcr.io/nvidia/tritonserver:24.06-py3`), not `latest`.
- **Bake models into images** for inference workloads: No runtime downloads means faster cold starts and no dependency on external storage at startup.
- **Keep training workloads separate**: Training jobs pull data at runtime from S3 because the datasets change frequently.

### Step 3: Deploy to EKS

All workloads deployed as Kubernetes Deployments in EKS:

- **Node management**: Karpenter provisions GPU nodes (`g6.xlarge`, `g6.2xlarge`) on demand and consolidates when utilization drops. Spot instances for non-critical GPU workloads (training, evals), on-demand for production inference.
- **Ingress**: gRPC-compatible **internal ALB** for the Triton and vLLM endpoints. They are not on the public internet. In-VPC hop cost is small (ALB plus CoreDNS) compared with the old AWS-to-GCP round trip.

### Step 4: Turn Off GCP

Once all traffic was flowing through the AWS endpoints and we had confirmed parity:

1. Stopped all GCP GPU VMs
2. Snapshotted disks for safety
3. Turned off the VMs permanently after a 2-week bake period
4. Closed the GCP billing account

## What I Learned

1. **Containerize before migrating**. If the workload is still running as a bare process on a VM, containerize it first on the source cloud. Debug container issues before adding the complexity of a cloud migration.

2. **TensorRT-LLM is worth the build complexity**. The multi-stage build for Whisper TRT-LLM is not trivial, but the inference performance improvement over running vanilla PyTorch is significant. FP16 engines on an L4 gave us the throughput we needed at a fraction of the cost.

3. **vLLM is the fastest path to serving open-source LLMs**. An OpenAI-compatible API means application code does not care that the model is self-hosted. Continuous batching handles variable concurrency without a custom batcher.

4. **Do not keep GPU nodes running for workloads nobody uses**. The SD3 instance was costing real money for occasional internal use. Scaling to zero and spinning up on demand is the right pattern for bursty GPU workloads.

5. **Consolidating clouds simplifies everything**. One IAM system, one monitoring stack, one CI/CD pipeline, one networking layer. The operational overhead reduction is worth more than the instance cost savings.

For more on how I run GPU workloads across different providers, check out the [Running GPUs in 2026](/docs/running-gpus-in-2026) guide in the docs.
