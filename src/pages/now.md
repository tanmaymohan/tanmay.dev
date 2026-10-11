---
title: Now
description: What I'm focused on right now — updated monthly.
---

# Now (October 2026)

*Inspired by [Derek Sivers' /now movement](https://nownownow.com/about)*

## 🎯 Current Focus

**Building**: A GPU inference platform that scales to $0 idle — Karpenter + KEDA HTTP add-on + metrics-api scalers across 5 model types (LLM, embedding, OCR, vision, multimodal). Running on Blackwell (B200/B300), L40S, and L4 spot fleets.

**Optimizing**: Post-credits cloud cost strategy — splitting bills into baseline (commit) vs variable (on-demand). 1-year no-upfront Compute Savings Plan + targeted RIs for databases. ODCR for business-hours GPU capacity.

**Learning**: NVFP4 quantization on Blackwell, FlashInfer attention backends, vLLM 0.6+ continuous batching improvements, and the Karpenter 1.0 GA release.

**Writing**: Finishing the "Running GPUs in 2026" doc series (6 providers), EKS Security Hardening guide (5 layers), and AWS Account Setup playbook (5 guides).

## 🔧 Active Experiments

- **SOCI parallel-pull + FastImagePull** for sub-50s GPU cold starts
- **Value-based GPU taints** (`nvidia.com/gpu=workload-x`) for perfect NodePool isolation
- **vmagent + vmauth** for edge device metrics (20 GB disk queue > Alloy's 8-hour WAL)
- **Business-hours ODCR** via EventBridge + Lambda for g6 capacity guarantees

## 📚 Reading

- *Designing Data-Intensive Applications* (re-read, Chapter 7: Transactions)
- NVIDIA Blackwell architecture whitepapers
- *The Staff Engineer's Path* by Tanya Reilly

## 🎤 Speaking

- **YouTube**: [GPU Inference at Scale on EKS](https://www.youtube.com/@tanmaymohan) — Karpenter + KEDA deep dive

## 📫 Open To

- **Senior/Staff/Principal roles**: DevOps, Platform, MLOps, Cloud Architecture
- **Consulting**: GPU inference platforms, EKS hardening, cloud cost optimization
- **Conversations**: GPU scheduling, FinOps, Kubernetes security, observability

---

*Last updated: October 2026. This page changes monthly.*