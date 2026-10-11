---
title: अभी
description: अभी मैं किस पर focus कर रहा हूँ — महीने दर महीने update होता है।
---

# अभी (October 2026)

*Inspired by [Derek Sivers' /now movement](https://nownownow.com/about)*

## 🎯 Current Focus

**Building**: एक GPU inference platform जो $0 idle पर scale करती है — Karpenter + KEDA HTTP add-on + metrics-api scalers across 5 model types (LLM, embedding, OCR, vision, multimodal)। Running on Blackwell (B200/B300), L40S, और L4 spot fleets.

**Optimizing**: Post-credits cloud cost strategy — bills को baseline (commit) vs variable (on-demand) में split करना। 1-year no-upfront Compute Savings Plan + targeted RIs databases के लिए। ODCR business-hours GPU capacity के लिए।

**Learning**: NVFP4 quantization on Blackwell, FlashInfer attention backends, vLLM 0.6+ continuous batching improvements, और Karpenter 1.0 GA release।

**Writing**: "Running GPUs in 2026" doc series (6 providers) खत्म करना, EKS Security Hardening guide (5 layers), और AWS Account Setup playbook (5 guides)।

## 🔧 Active Experiments

- **SOCI parallel-pull + FastImagePull** sub-50s GPU cold starts के लिए
- **Value-based GPU taints** (`nvidia.com/gpu=workload-x`) perfect NodePool isolation के लिए
- **vmagent + vmauth** edge device metrics के लिए (20 GB disk queue > Alloy's 8-hour WAL)
- **Business-hours ODCR** via EventBridge + Lambda g6 capacity guarantees के लिए

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

*Last updated: October 2026. यह page monthly change होता है।*