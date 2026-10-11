---
sidebar_position: 2
sidebar_label: Cost Optimization Playbook
---

# Cloud Cost Optimization Playbook

A practical, opinionated guide to reducing AWS cloud costs without sacrificing reliability or developer velocity.

## Who This Is For

Cloud engineers, DevOps leads, and platform teams who manage AWS infrastructure and want a systematic approach to cost reduction — not just a list of tips.

## The Framework

Cost optimization is not a one-time project. It is a cycle:

1. **Get visibility** — Understand where money is going (Cost Explorer, tags, Vantage)
2. **Right-size** — Match resources to actual usage
3. **Commit** — Lock in discounts on predictable baseline usage
4. **Eliminate** — Turn off what nobody uses
5. **Repeat** — Review monthly, catch drift early

## Guides

| Guide | What it covers |
|-------|---------------|
| **[Compute](./compute)** | Pod right-sizing, spot instances, Savings Plans, Karpenter, instance family selection |
| **[Database](./database)** | RDS right-sizing, service migration (DocumentDB → MongoDB Atlas), reserved capacity |
| **[Storage](./storage)** | GP2 → GP3, S3 Intelligent Tiering, EBS cleanup, multipart upload lifecycle |
| **[Networking](./networking)** | VPC endpoints, NAT Gateway costs, cross-AZ traffic |
| **[Monitoring](./monitoring)** | CloudWatch cost management, log levels, open-source alternatives |

## Quick Wins

If you are looking for the highest-impact changes with the least effort:

1. **Delete unused resources** — idle load balancers, stopped instances with EBS volumes, old Elasticsearch clusters
2. **Enable S3 Intelligent Tiering** — zero effort, automatic savings on infrequently accessed objects
3. **Migrate GP2 to GP3** — better performance at lower cost, online migration with no downtime
4. **Add VPC endpoints for S3 and DynamoDB** — gateway endpoints are free and eliminate NAT Gateway data processing charges for those services
