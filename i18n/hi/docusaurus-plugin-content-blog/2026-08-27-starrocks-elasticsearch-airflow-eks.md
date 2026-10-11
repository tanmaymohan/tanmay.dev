---
slug: starrocks-elasticsearch-airflow-on-eks
title: "EKS पर StarRocks, Elasticsearch, और Airflow"
authors: [tanmay]
tags: [kubernetes, aws, cost]
unlisted: true
---

StarRocks, Elasticsearch, और Airflow GPU inference से अलग workload हैं। ये अपने schedule पर ऊपर रहते हैं। Inference session खत्म होने पर ये zero तक नहीं जाते, और `g6e` के साथ NodePool share नहीं करते।

{/* truncate */}

## StarRocks और Elasticsearch

दोनों **r8i-flex** memory-optimized nodes पर। Elasticsearch में **automated S3 snapshots** और **IRSA** — env vars में static AWS keys नहीं। Stateful sets **On-Demand** pools पर pinned। Data node पर Spot quorum सिखाने का महँगा तरीका है।

## Hybrid Airflow

Cost बाँटो:

- **Webserver और scheduler** On-Demand। Scheduler खोना outage है।
- **Workers** Spot पर, task completion callbacks के साथ ताकि reclaim चुपचाप काम न गिराए।

## Trade-offs

| Choice | Flex | Scar | Mitigation |
|---|---|---|---|
| EKS पर stateful DBs | एक control plane | Node death / quorum risk | On-Demand pins; S3 snapshots |
| Airflow workers Spot पर | सस्ती task capacity | Task के बीच reclaim | Completion callbacks; scheduler On-Demand |

Snapshot jobs पर **IRSA**। वहाँ भी `AKIA*` keys नहीं। वही pattern जो [EKS stack harden](/blog/hardening-eks-stack-6-months) करते समय इस्तेमाल किया।
