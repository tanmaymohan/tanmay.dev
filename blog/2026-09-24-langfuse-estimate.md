---
slug: auditing-my-langfuse-estimate
title: "Auditing My Own Estimate: Langfuse from $3.4K a Month to $1.0K"
authors: [tanmay]
tags: [ai, observability, aws, cost]
description: "How a $3.4K/month Langfuse EKS estimate was 3.5× too high. The lean tier at $1K/month cuts monitoring nodes, provisioned IOPS, and 90-day retention. Includes 4-tier cost table and risk analysis for single ClickHouse node."
keywords: ["Langfuse cost optimization", "ClickHouse cost", "LLM observability pricing", "EKS cost estimation", "observability budget", "Langfuse pricing tiers"]
image: /img/author.jpg
---

The first Langfuse design on EKS was full HA and about **$3,400 a month** at the load I expected. Scenarios ran from about $1.8K to $7.7K. I re-checked it before buying the hardware. The estimate was about **3.5× too high**. The tier that shipped is about **$1,000 a month**, roughly **71% below** the original number.

{/* truncate */}

## What the $3.4K was buying

- ClickHouse, 1 shard and 3 replicas, one per AZ, on r8g.2xlarge, each with a 1,500 GiB gp3 volume at 8,000 IOPS.
- ClickHouse Keeper on 3 separate small nodes.
- RDS PostgreSQL, ElastiCache Valkey, and S3 for events, media, exports, and backups.
- Separate web and ingest deployments, because heavy ingest hurts the UI.

## Where the money actually was

About **$1,000 a month** needed no redesign:

- Monitoring nodes that duplicated a stack that already existed.
- Provisioned IOPS that the workload did not need.
- 90-day retention when 30 days was enough.

About **$1,400 a month** was availability I was not ready to pay for yet: a single ClickHouse replica, no Keeper, and a deferred split between ingest and UI.

| Tier | Monthly cost | What you get |
|---|---|---|
| Pilot | ~$0.55K | 20% trace sampling |
| Lean (shipped) | ~$1.0K | Single ClickHouse node, single-AZ Postgres, one queue node |
| AZ-resilient | ~$1.6K | Survives the loss of an availability zone |
| Full HA | ~$2.5K | Replicated ClickHouse with Keeper, split ingest and UI |

The single queue node looked like silent trace loss in the first design. Langfuse writes the event to S3 before it enqueues it, and the queue holds about 12 hours. A dead queue delays traces. It does not delete them. That is the risk the lean tier accepted.

The as-built runbook overrides the design doc wherever they differ. If you only read the ADR, you will build the $3.4K version.

How the cluster is wired, and the seven outages worth preventing, is in [Self-hosting Langfuse on Kubernetes](/blog/self-hosting-langfuse-on-kubernetes-gotchas).
