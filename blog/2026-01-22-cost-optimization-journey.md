---
slug: cost-optimization-journey
title: "How I Reduced Cloud Costs by Over $20k — 8 Learnings"
authors: [tanmay]
tags: [cloud, cost, optimization, kubernetes, aws]
description: "8 practical learnings from reducing cloud spend by $20k/year without hurting reliability. Covers Kubernetes pod packing, GPU right-sizing, Spot instances, Savings Plans, database optimization, storage cleanup, and service deprecation."
keywords: ["cloud cost optimization", "Kubernetes cost reduction", "AWS Savings Plans", "GPU reserved instances", "Spot instances EKS", "database right-sizing", "cloud FinOps"]
image: /img/author.jpg
---

I spent a focused quarter understanding and reducing cloud costs without hurting reliability or developer velocity. By the end of it, the line items below added up to roughly **$1,800 USD per month** — over **$20k annualized** — from our AWS and GCP bills. Spot and GPU Reserved Instance discounts sit on top of that and are harder to pin to a single number.

Here are the 8 things that actually moved the needle.

{/* truncate */}

If you are working on cost optimization too, I hope these notes help you. Feel free to connect on my socials to add more or share your own learnings.

## Learning #1 — Kubernetes Pod Packing

Always configure the `requests` and `limits` sections of your deployments properly. In my case, several old applications that were barely used still had default resource values — or values far greater than what they actually consumed at runtime.

I started on staging and UAT environments first. I reconfigured every application's CPU and memory requests using real usage data from monitoring. Once things were stable for a couple of weeks, I rolled the same changes to production.

The result surprised me: **the stack was primarily memory-heavy with very low CPU usage**. I had been running a mix of `m6a.xlarge`, `c7i-flex`, and `r6a.xlarge` instances — a combination of compute-optimized and general-purpose machines that did not match the workload profile at all.

After the change, I moved entirely to **`r6a.xlarge` and `r6a.2xlarge`** (memory-optimized) across all environments. I used [Vantage's MCP server](https://www.vantage.sh/) connected to Cursor to quickly browse instance types and find the lowest spot price in my region.

**Result**: Fewer instances, better bin packing, and fewer DaemonSet pods running across the fleet.

## Learning #2 — Change of GPU Use Case

I was running `g6.xlarge` and `g6.2xlarge` instances (NVIDIA L4 GPUs) with a full node dedicated to a single pod for a whisper audio transcription workload. Each node was reserved entirely for one use case — speech-to-text, image generation, and a general inference server.

After auditing the actual GPU utilization, I realized:

- The whisper workload could run with **TensorRT-LLM** on Triton Server using FP16, reducing the memory footprint significantly
- Multiple inference workloads could share GPU nodes using **Kubernetes PriorityClasses** and proper resource scheduling
- Some workloads that were running on dedicated GPU nodes could be batched more efficiently (max batch size tuning brought down idle GPU time)

I moved the GPU instances to **Reserved Instances** since they were now long-running and predictable. This alone saved a meaningful chunk compared to on-demand pricing.

**Result**: Fewer GPU nodes, better utilization per node, and RI pricing instead of on-demand.

## Learning #3 — Spot Instances on EKS

This was the easiest win with the highest return. I started with non-production environments first:

1. Added spot capacity to UAT and staging node groups
2. Configured **Karpenter** with NodePools that mix `spot` and `on-demand` capacity types
3. Set consolidation to kick in after a few minutes of underutilization — Karpenter automatically replaces or removes underused nodes

Once I was confident in the spot interruption handling, I extended spot to production for stateless workloads and GPU training jobs.

The key insight: **use memory-optimized spot instances** (like `r6a` and `m6a` families) because they tend to have better spot availability and lower interruption rates in the `ap-south-1` region than compute-optimized types.

**Result**: Significant reduction in compute costs across all non-production environments and for bursty production workloads.

## Learning #4 — Reserved Instances and Savings Plans

After right-sizing, I had a clear picture of baseline compute needs. I committed to:

- **GPU Reserved Instances**: The `g6.xlarge` and `g6.2xlarge` instances running production inference were now predictable and long-running — perfect for 1-year RIs
- **Compute Savings Plans**: For the general EKS compute baseline, a Compute Savings Plan gave roughly a **20% discount** on the predictable portion of the bill (~$550/month in savings)

The trick is to not buy RIs or Savings Plans *before* right-sizing. I see teams lock in commitments on oversized instances and then struggle to use the capacity. Right-size first, commit second.

**Result**: ~$550/month savings from Savings Plans alone, plus additional savings from GPU RIs.

## Learning #5 — Database Optimization

Databases were a surprising cost center. Three changes made an impact:

1. **Migrated from DocumentDB to MongoDB Atlas**: DocumentDB was costing ~$170/month. MongoDB Atlas offered credits for new customers, and the migration was straightforward (export, import, update connection strings). The ongoing cost was covered by credits for the first year, and the Atlas pricing was lower even after credits expired.

2. **RDS right-sizing**: Several RDS instances were running on oversized specs from when they were first provisioned. I reviewed CloudWatch metrics for CPU, memory, connections, and IOPS — then downsized where safe. This saved ~$150/month across the fleet.

3. **Archived unused databases**: An old data science database that nobody had queried in months was snapshotted and shut down.

**Result**: ~$320/month combined savings from database changes.

## Learning #6 — Storage Optimization

Storage costs creep up silently. Here is what I found:

- **GP2 to GP3 migration**: GP3 volumes offer better baseline performance at a lower price than GP2. Migrating EBS volumes from GP2 to GP3 saved ~$50/month with zero downtime (AWS supports online volume type changes).
- **S3 Intelligent Tiering**: Enabled on buckets where access patterns were unpredictable. Objects that are not accessed for 30 days automatically move to a cheaper tier.
- **Delete archived buckets**: Old backup buckets and data exports that were no longer needed were cleaned up.
- **Multipart upload lifecycle rules**: Incomplete multipart uploads can accumulate silently. Adding a lifecycle rule to abort them after 7 days cleaned up wasted storage.

**Result**: ~$50/month from EBS changes, plus ongoing savings from S3 lifecycle management.

## Learning #7 — Deprecating Unused Services

This was the single biggest category. Services that were set up for a specific purpose, used for a while, and then forgotten — but kept running and billing:

- **Old Elasticsearch cluster**: Fully deprecated after workloads moved to a newer, right-sized setup. This was costing **$504/month** — the single largest line item I eliminated.
- **Unused load balancers**: Classic load balancers that were no longer routing traffic. Each idle ALB/CLB still costs ~$16-22/month. Removing them saved ~$50/month.
- **Unused Lambda functions**: Old functions that were never triggered but had provisioned concurrency or attached resources. Cleanup saved ~$15/month.
- **CloudWatch Insights**: Container Insights was enabled on EKS clusters but the dashboards were never used. The data ingestion alone was costing ~$200/month. Disabled it after confirming nobody relied on it.

**Result**: ~$769/month from service deprecation — the largest single category before Savings Plans.

## Learning #8 — Billing and Account Structure

Two changes that do not involve any infrastructure work:

1. **Moved to invoiced billing on AWS**: Instead of credit card payments, I switched to invoiced billing. This enabled better payment terms and opened the door for volume discounts through the account team (typically 5-10% on the monthly bill for committed spend).

2. **Closed old cloud accounts**: We had a GCP project that was mostly unused after migrating workloads to AWS. Archiving the project and cleaning up remaining resources reduced the GCP bill by ~10,000 INR/month.

**Result**: Better payment terms on AWS and eliminated an entire cloud provider bill.

---

## The Total

| Category | Monthly Savings (approx) |
|----------|------------------------:|
| Savings Plans (compute) | $550 |
| Elasticsearch deprecation | $504 |
| CloudWatch Insights | $200 |
| DocumentDB → MongoDB Atlas | $170 |
| RDS right-sizing | $150 |
| Load balancer cleanup | $50 |
| GP2 → GP3 | $50 |
| Lambda cleanup | $15 |
| GCP project closure | ~$120 (10k INR) |
| **Total** | **~$1,800+/month** |

With the spot instance savings (harder to attribute a fixed number) and GPU RI discounts on top, the annualized number comfortably exceeds **$20,000 USD**.

---

## What I Would Tell Someone Starting This

1. **Start with visibility**: You cannot cut what you cannot see. Set up cost allocation tags and use AWS Cost Explorer or a tool like Vantage before making changes.
2. **Right-size before committing**: Do not buy Savings Plans or RIs until you have right-sized your instances. Otherwise you lock in waste.
3. **Non-production first**: Test every change (spot instances, instance type changes, database migrations) in staging before touching production.
4. **Deprecate aggressively**: The biggest savings almost always come from turning off things nobody uses anymore, not from making running things cheaper.
5. **Make it a habit**: Cost optimization is not a one-time project. I now review the bill monthly and look for anything that has drifted.

For step-by-step guides on each of these techniques, check out the [Cost Optimization Playbook](/docs/cost-optimization-playbook) in the docs section.
