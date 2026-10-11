---
sidebar_position: 4
---

# Account Services Configuration

Production account में core AWS services configure करने का reference।

## VPC Design

Production VPC में multiple Availability Zones में तीन tiers के subnets होने चाहिए:

| Tier | Internet Access | Use Case |
|------|----------------|----------|
| **Public** | Direct (IGW) | External ALBs, NAT Gateways |
| **Private with NAT** | सिर्फ़ Outbound (NAT GW से) | EKS nodes, application workloads |
| **Private isolated** | कोई नहीं | RDS, ElastiCache, sensitive data stores |

### Checklist

- [ ] CIDR block appropriately sized (जैसे large environments के लिए /16)
- [ ] कम से कम 2 AZs (production के लिए 3 preferred)
- [ ] DNS resolution और DNS hostnames enabled
- [ ] S3, DynamoDB (gateway — free), ECR, CloudWatch, Secrets Manager, SSM (interface) के लिए VPC endpoints
- [ ] Cross-account / cross-service connectivity के लिए VPC peering या PrivateLink (जैसे MongoDB Atlas)

## RDS

### Configuration Checklist

- [ ] **Engine**: MySQL 8 या PostgreSQL 16 (latest stable)
- [ ] **Instance class**: Price/performance के लिए Graviton-based (`db.t4g`, `db.r7g`)
- [ ] **Storage**: GP3 (GP2 से कम cost पर better baseline)
- [ ] **Multi-AZ**: Production के लिए enabled, non-production के लिए disabled
- [ ] **Subnet group**: सिर्फ़ Private isolated subnets
- [ ] **Security group**: Inbound सिर्फ़ application node SG से allow
- [ ] **Encryption**: KMS CMK के साथ enabled
- [ ] **Enhanced monitoring**: Enabled
- [ ] **Performance Insights**: Enabled (free tier ज़्यादातर usage cover करता है)
- [ ] **Automated backups**: Enabled, requirements के अनुसार 7-35 दिन retention
- [ ] **Parameter group**: Custom, workload के लिए tuned

### RDS Proxy

RDS Proxy consider करो:
- Lambda functions (DB connections exhaust होने से बचने के लिए connection pooling)
- Multi-AZ failover (proxy transparently connection routing handle करता है)
- Bursty connection patterns वाली applications

## ElastiCache

- [ ] **Engine**: Valkey या Redis OSS
- [ ] **Instance class**: Graviton-based (`cache.t4g`, `cache.r7g`)
- [ ] **Subnet group**: Private subnets
- [ ] **Security group**: सिर्फ़ application node SG से allow
- [ ] **Encryption**: In-transit और at-rest enabled
- [ ] **Parameter group**: Custom, default से अलग

## S3

### Bucket Configuration

- [ ] **Default encryption**: SSE-S3 या SSE-KMS
- [ ] **Block public access**: सभी buckets पर enabled (account-level setting)
- [ ] **Versioning**: Critical data buckets के लिए enabled
- [ ] **Lifecycle rules**: Intelligent Tiering, multipart upload abort, archival data के लिए Glacier transition
- [ ] **Access logging**: Sensitive data वाले buckets के लिए enabled

## CloudFront

- [ ] **Origin Access Control (OAC)**: S3 origins OAC इस्तेमाल करें, public bucket access नहीं
- [ ] **TLS**: Minimum TLS 1.2
- [ ] **Lambda@Edge या CloudFront Functions**: Image optimization, header manipulation, या redirects के लिए
- [ ] **WAF**: Public-facing distributions पर WAF WebACL attach

## Airflow (MWAA)

Workflow orchestration के लिए, Amazon MWAA managed Apache Airflow provide करता है:

- [ ] **Environment class**: DAG complexity और parallelism needs के आधार पर choose
- [ ] **VPC**: Outbound access के लिए NAT वाले private subnets में deploy
- [ ] **S3**: DAGs, plugins, और requirements के लिए dedicated bucket
- [ ] **Execution role**: Required S3, Secrets Manager, और service access तक scoped
