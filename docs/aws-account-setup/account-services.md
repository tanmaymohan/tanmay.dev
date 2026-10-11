---
sidebar_position: 4
---

# Account Services Configuration

A reference for configuring core AWS services in a production account.

## VPC Design

A production VPC should have three tiers of subnets across multiple Availability Zones:

| Tier | Internet Access | Use Case |
|------|----------------|----------|
| **Public** | Direct (IGW) | External ALBs, NAT Gateways |
| **Private with NAT** | Outbound only (via NAT GW) | EKS nodes, application workloads |
| **Private isolated** | None | RDS, ElastiCache, sensitive data stores |

### Checklist

- [ ] CIDR block sized appropriately (e.g., /16 for large environments)
- [ ] At least 2 AZs (3 preferred for production)
- [ ] DNS resolution and DNS hostnames enabled
- [ ] VPC endpoints for S3, DynamoDB (gateway — free), ECR, CloudWatch, Secrets Manager, SSM (interface)
- [ ] VPC peering or PrivateLink for cross-account / cross-service connectivity (e.g., MongoDB Atlas)

## RDS

### Configuration Checklist

- [ ] **Engine**: MySQL 8 or PostgreSQL 16 (latest stable)
- [ ] **Instance class**: Graviton-based (`db.t4g`, `db.r7g`) for price/performance
- [ ] **Storage**: GP3 (better baseline than GP2 at lower cost)
- [ ] **Multi-AZ**: Enabled for production, disabled for non-production
- [ ] **Subnet group**: Private isolated subnets only
- [ ] **Security group**: Allow inbound only from application node SG
- [ ] **Encryption**: Enabled with KMS CMK
- [ ] **Enhanced monitoring**: Enabled
- [ ] **Performance Insights**: Enabled (free tier covers most usage)
- [ ] **Automated backups**: Enabled, 7-35 day retention based on requirements
- [ ] **Parameter group**: Custom, tuned for workload

### RDS Proxy

Consider RDS Proxy for:
- Lambda functions (connection pooling to avoid exhausting DB connections)
- Multi-AZ failover (proxy handles connection routing transparently)
- Applications with bursty connection patterns

## ElastiCache

- [ ] **Engine**: Valkey or Redis OSS
- [ ] **Instance class**: Graviton-based (`cache.t4g`, `cache.r7g`)
- [ ] **Subnet group**: Private subnets
- [ ] **Security group**: Allow from application node SG only
- [ ] **Encryption**: In-transit and at-rest enabled
- [ ] **Parameter group**: Custom, separate from default

## S3

### Bucket Configuration

- [ ] **Default encryption**: SSE-S3 or SSE-KMS
- [ ] **Block public access**: Enabled on all buckets (account-level setting)
- [ ] **Versioning**: Enabled for critical data buckets
- [ ] **Lifecycle rules**: Intelligent Tiering, multipart upload abort, Glacier transition for archival data
- [ ] **Access logging**: Enabled for buckets containing sensitive data

## CloudFront

- [ ] **Origin Access Control (OAC)**: S3 origins should use OAC, not public bucket access
- [ ] **TLS**: Minimum TLS 1.2
- [ ] **Lambda@Edge or CloudFront Functions**: For image optimization, header manipulation, or redirects
- [ ] **WAF**: Attach WAF WebACL for public-facing distributions

## Airflow (MWAA)

For workflow orchestration, Amazon MWAA provides managed Apache Airflow:

- [ ] **Environment class**: Choose based on DAG complexity and parallelism needs
- [ ] **VPC**: Deploy in private subnets with NAT for outbound access
- [ ] **S3**: Dedicated bucket for DAGs, plugins, and requirements
- [ ] **Execution role**: Scoped to required S3, Secrets Manager, and service access
