---
sidebar_position: 5
---

# Monitoring Cost Optimization

Monitoring tools can become one of the most expensive line items on your bill — especially CloudWatch. Here is how to keep costs under control without losing visibility.

## CloudWatch Cost Drivers

The biggest CloudWatch costs typically come from:

1. **Log ingestion**: $0.50/GB for logs sent to CloudWatch Logs. A busy EKS cluster can easily generate 50-100 GB/month of application logs.
2. **Container Insights**: Automatically collects and aggregates container-level metrics. The data ingestion cost can be $100-300/month for a moderately sized cluster.
3. **Log Insights queries**: $0.005 per GB of data scanned per query. Developers running ad-hoc queries on large log groups can rack up costs.
4. **Custom metrics**: $0.30 per metric per month for the first 10,000 metrics. High-cardinality metrics (per-pod, per-request) can create thousands of custom metrics.

## How to Reduce CloudWatch Costs

### 1. Control Log Levels

The simplest and most effective change. If your applications log at `INFO` level in production, you are likely sending 10x more log data than you need.

- Set production log level to `WARN` or `ERROR` for most services
- Use `INFO` only in staging/UAT where you need debugging detail
- Implement a **log level toggle** — the ability to temporarily switch a production service to `INFO` for debugging, then switch back

### 2. Disable Unused Container Insights

If you enabled CloudWatch Container Insights but nobody uses the dashboards, disable it. The metric ingestion cost continues whether anyone looks at the dashboards or not.

Container Insights is **not** EKS control-plane logging (`cluster.logging`). Check for the observability add-on or the log groups it creates:

```bash
aws eks list-addons --cluster-name your-cluster \
  --query "addons[?contains(@, 'cloudwatch') || contains(@, 'observability')]"

aws logs describe-log-groups \
  --log-group-name-prefix /aws/containerinsights/
```

### 3. Set Log Retention Policies

By default, CloudWatch log groups retain data forever. Set retention to match your actual needs:

- Production: 30-90 days
- Staging/UAT: 7-14 days
- CI/CD: 3-7 days

```bash
aws logs put-retention-policy \
  --log-group-name /ecs/my-service \
  --retention-in-days 30
```

### 4. Use Metric Filters Instead of Log Insights

If you regularly run the same Log Insights query, create a **metric filter** instead. It extracts the metric at ingestion time (included in the log ingestion cost) rather than scanning logs retroactively ($0.005/GB).

## Open-Source Alternatives

For teams where CloudWatch costs are prohibitive, consider self-hosted open-source alternatives:

| Tool | Replaces | Deployment |
|------|----------|------------|
| **SigNoz** | CloudWatch Metrics + Logs + Traces | Helm chart on EKS, uses ClickHouse for storage |
| **Prometheus + Grafana** | CloudWatch Metrics | Helm chart, widely supported |
| **Loki** | CloudWatch Logs | Pairs with Grafana, log aggregation with label-based indexing |
| **OpenTelemetry Collector** | CloudWatch agent | Vendor-neutral telemetry pipeline |

The trade-off is operational overhead — you are managing the monitoring infrastructure yourself. But for teams already running EKS, adding a Prometheus + Grafana stack is straightforward and can eliminate most CloudWatch spend.

### Hybrid Approach

A pragmatic middle ground:
- Keep CloudWatch for **AWS service metrics** (RDS, ALB, Lambda) — these are free or cheap and integrate natively
- Use Prometheus/SigNoz for **application and container metrics** — where the high cardinality and volume drives CloudWatch costs
- Use CloudWatch Logs for **critical production logs only** — route debug/info logs to a cheaper destination
