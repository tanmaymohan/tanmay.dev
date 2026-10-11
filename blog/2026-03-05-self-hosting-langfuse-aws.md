---
slug: self-hosting-langfuse-on-aws
title: "Self-Hosting Langfuse for LLM Observability on AWS"
authors: [tanmay]
tags: [ai, observability, aws]
description: "Complete guide to self-hosting Langfuse v3 on AWS EKS with ClickHouse, PostgreSQL, and Redis. Covers architecture, cost optimization, Docker Compose to Kubernetes migration, and data residency compliance."
keywords: ["Langfuse self-hosting", "LLM observability", "AWS EKS", "ClickHouse", "Langfuse Kubernetes", "LLM tracing", "data residency"]
image: /img/author.jpg
---

Our team was building LLM-powered features — agents, chat interfaces, document analysis — and we had zero visibility into what the models were actually doing. No trace of which prompts were sent, what the latency was, how much each call cost, or whether the outputs were any good.

I evaluated hosted observability platforms, but data residency requirements meant we needed to keep everything in our own cloud account. So I self-hosted **Langfuse** — an open-source LLM observability platform — on AWS. Here is the architecture and what I learned.

{/* truncate */}

## What Langfuse Does

[Langfuse](https://langfuse.com/) is an open-source platform for LLM observability. It gives you:

- **Traces**: Every LLM call logged with input, output, latency, token count, and cost
- **Sessions**: Group related LLM calls into user sessions for debugging conversation flows
- **Evaluations**: Score outputs manually or with automated eval pipelines
- **Metrics**: Dashboards for cost, latency, error rates, and usage trends

Think of it as Datadog for your LLM calls. The SDKs integrate with LangChain, OpenAI, and other LLM frameworks with a few lines of code.

## Why Self-Host

Three reasons:

1. **Data residency**: We could not send prompt/completion data (which may contain sensitive information) to a third-party SaaS outside our cloud account.
2. **Cost at scale**: Langfuse's hosted pricing scales with the number of traces. At our volume, self-hosting was significantly cheaper.
3. **Customization**: We wanted control over retention policies, access controls, and integration with our existing monitoring stack.

## The Architecture

Langfuse v3 has two main components: a **web server** (the UI and API) and a **worker** (background processing). Under the hood, it needs four data stores.

### Compute: ECS Fargate

Both the web server and worker run as **ECS Fargate** services:

- **Web**: 2 vCPU, 4 GB RAM, exposed on port 3000
- **Worker**: 2 vCPU, 4 GB RAM, on port 3030

Fargate was the right choice here because:
- No nodes to manage, patch, or right-size
- Auto-scaling based on CPU/memory utilization
- Isolated from the EKS cluster where application workloads run (blast radius containment)

It's possible they keep secrets such as database passwords and encryption keys with the service configuration, outside the container image.

### OLTP: RDS PostgreSQL

Langfuse uses Postgres for its transactional data — user accounts, project configs, session metadata, evaluation scores. A small `t4g.small` RDS instance handles this easily. Graviton for the price/performance ratio.

### OLAP: ClickHouse on EC2

This is where the trace data lives — and it can get large. Langfuse uses **ClickHouse** for analytical queries over traces, spans, and observations.

I run ClickHouse on a single EC2 instance:
- **Instance type**: `c7g.xlarge` (ARM/Graviton, 4 vCPU, 8 GB RAM)
- **OS**: Ubuntu 24.04
- **Storage**: gp3 EBS volume sized for the expected trace volume

Why not a managed ClickHouse service? Cost. A single EC2 instance with ClickHouse is dramatically cheaper than managed alternatives, and for an internal observability tool, the operational overhead of managing one ClickHouse node is acceptable.

### Cache: Redis (Valkey)

An ElastiCache Valkey node handles caching and job queues between the web and worker services. A single small node is sufficient.

### Blob Storage: S3

Langfuse stores event payloads and media uploads (screenshots, audio files attached to traces) in S3. Two prefixes: `events/` and `media/`.

### Traffic Flow

```
Applications (SDK) ──→ Internal ALB (TLS) ──→ Langfuse Web (:3000)
                                                    │
Team (via VPN) ────→ Internal ALB (TLS) ──→ Langfuse Web (:3000)
                                                    │
                                              Langfuse Worker (:3030)
                                                    │
                                    ┌───────────────┼───────────────┐
                                    │               │               │
                                Postgres       ClickHouse        S3
                                (OLTP)          (OLAP)        (Blobs)
                                    │               │
                                    └───────┬───────┘
                                          Redis
                                        (Cache/Queue)
```

The internal ALB terminates TLS and is only reachable from within the VPC (and through the VPN). Google SSO is enabled for the Langfuse UI so the team signs in with their existing corporate accounts.

## Deployment

The ECS task definitions reference the official Langfuse Docker images (`langfuse/langfuse:3` for web). The worker uses a separate image.

Configuration is entirely through environment variables:
- `DATABASE_URL` — Postgres connection string
- `CLICKHOUSE_URL` — ClickHouse HTTP endpoint (private IP)
- `REDIS_HOST` — ElastiCache endpoint
- `S3_BUCKET` — Blob storage bucket
- `NEXTAUTH_URL` — Public URL for the Langfuse UI
- `ENCRYPTION_KEY` — For encrypting sensitive data at rest in Postgres

Logs go to CloudWatch. I set up a log group per service for easy filtering.

## What It Costs

For a team generating a few hundred thousand traces per month:

| Component | Monthly Cost (approx) |
|-----------|----------------------:|
| ECS Fargate (2 services) | ~$70 |
| RDS t4g.small | ~$30 |
| EC2 c7g.xlarge (ClickHouse) | ~$90 |
| ElastiCache (small Valkey) | ~$15 |
| S3 storage | ~$5 |
| ALB | ~$20 |
| **Total** | **~$230/month** |

Compare that to Langfuse Cloud's pricing at scale, and self-hosting pays for itself quickly.

## What I Learned

1. **ClickHouse on ARM is a great fit**. Graviton instances give you more compute per dollar, and ClickHouse runs natively on ARM. The c7g family is ideal for this.

2. **Separate OLTP and OLAP from the start**. Langfuse v3's architecture with Postgres for transactions and ClickHouse for analytics is the right design. Do not try to run everything on Postgres — trace query performance will degrade quickly.

3. **ECS Fargate is underrated for internal tools**. It is simpler than Kubernetes for stateless web services, especially when you do not need the full power of EKS. Task definitions, service auto-scaling, and ALB integration just work.

4. **It's possible they keep secrets outside the image** for an internal tool. For production application workloads, I would use Secrets Manager or Parameter Store.

5. **VPN-only access is non-negotiable**. LLM traces contain prompts and completions that may include sensitive data. The Langfuse UI should never be exposed to the public internet.

If you are running LLM workloads and have no observability into them, Langfuse is the fastest way to get visibility. The sketch above is the small ECS layout from early 2026.

The design I later built and validated is on EKS, at about $1,000 a month after I cut a $3,400 estimate, with a different set of failure modes. That write-up is [Self-hosting Langfuse on Kubernetes: 7 gotchas](/blog/self-hosting-langfuse-on-kubernetes-gotchas) and [Auditing my own Langfuse estimate](/blog/auditing-my-langfuse-estimate). App cutover off the old Docker Compose box was still pending when I wrote those.
