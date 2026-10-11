---
sidebar_position: 2
---

# Database Cost Optimization

Databases are often the second largest cost center after compute. They are also the hardest to change because downtime is unacceptable and data migration is risky. Here are safe, proven techniques.

## RDS Right-Sizing

### How to Assess

1. Open CloudWatch for each RDS instance
2. Check these metrics over the last 30 days:
   - **CPUUtilization**: If consistently below 30%, the instance is likely oversized
   - **FreeableMemory**: If consistently above 50% of total, you have excess memory
   - **DatabaseConnections**: Compare to the instance class maximum
   - **ReadIOPS / WriteIOPS**: Compare to the provisioned IOPS or GP3 baseline

### Common Findings

- Instances provisioned at launch and never revisited (e.g., `db.r6g.xlarge` when `db.t4g.medium` would suffice)
- Development/staging databases running on production-class instance types
- Multi-AZ enabled on non-production databases (doubles the cost)

### How to Downsize

1. Take a snapshot (safety net)
2. Modify the instance class during a maintenance window
3. For Multi-AZ, the failover happens first — the standby is modified, then a failover makes it primary, then the old primary is modified. Brief interruption (~30 seconds).

### Graviton for RDS

`db.t4g`, `db.r7g`, and `db.m7g` instance classes use ARM-based Graviton processors. They are typically 10-20% cheaper than equivalent x86 instances with the same or better performance. All major RDS engines (MySQL, PostgreSQL, MariaDB) support Graviton.

## Service Migration: DocumentDB → MongoDB Atlas

If you are using Amazon DocumentDB and your workload is compatible with MongoDB Atlas, the migration can save significant money:

- DocumentDB pricing is based on instance hours + storage + I/O. A small cluster easily costs $150-200/month.
- MongoDB Atlas offers free tier and credits for new customers. Even after credits, the pricing model is often more favorable for small-to-medium workloads.

### Migration Steps

1. Export data from DocumentDB using `mongodump`
2. Create a MongoDB Atlas cluster (same region as your VPC for latency)
3. Set up VPC Peering between Atlas and your AWS VPC
4. Import data using `mongorestore`
5. Update application connection strings
6. Test thoroughly in staging
7. Cut over production during a maintenance window
8. Keep DocumentDB running in read-only mode for a rollback period
9. Terminate DocumentDB after the bake period

## Reserved Capacity for Databases

For databases that run 24/7 with predictable specs:

- **RDS Reserved Instances**: 1-year or 3-year commitments for 30-60% savings
- **ElastiCache Reserved Nodes**: Same model for Redis/Valkey caches
- **OpenSearch Reserved Instances**: If you run managed OpenSearch

Only commit after right-sizing. The pattern is always: measure → right-size → stabilize → commit.

## Deprecating Unused Databases

Audit for databases that:
- Have zero connections over the last 30 days
- Were created for a specific project that has ended
- Are duplicates (e.g., a "test" database that mirrors production)

For each: snapshot, verify with the team that it is truly unused, then stop or delete. Snapshots are cheap; running instances are not.
