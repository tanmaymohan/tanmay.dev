---
sidebar_position: 5
---

# Monitoring Cost Optimization

Monitoring tools bill पर सबसे महँगे line items में से एक बन सकते हैं — ख़ासकर CloudWatch। यह रहा costs control में रखने का तरीका बिना visibility खोए।

## CloudWatch Cost Drivers

सबसे बड़े CloudWatch costs typically इनसे आते हैं:

1. **Log ingestion**: CloudWatch Logs में भेजे logs के लिए $0.50/GB। एक busy EKS cluster आसानी से 50-100 GB/माह application logs generate कर सकता है।
2. **Container Insights**: Container-level metrics अपने आप collect और aggregate करता है। Moderately sized cluster के लिए data ingestion cost $100-300/माह हो सकता है।
3. **Log Insights queries**: हर query में scan हुए data पर $0.005 per GB। Developers बड़े log groups पर ad-hoc queries चलाकर costs बढ़ा सकते हैं।
4. **Custom metrics**: पहले 10,000 metrics के लिए $0.30 per metric per माह। High-cardinality metrics (per-pod, per-request) हज़ारों custom metrics create कर सकती हैं।

## CloudWatch Costs कैसे कम करें

### 1. Log Levels Control करो

सबसे simple और सबसे effective बदलाव। अगर applications production में `INFO` level पर log करती हैं, तो ज़रूरत से 10x ज़्यादा log data भेज रहे हो।

- Production log level ज़्यादातर services के लिए `WARN` या `ERROR` रखो
- `INFO` सिर्फ़ staging/UAT में जहाँ debugging detail चाहिए
- **Log level toggle** implement करो — debugging के लिए temporarily production service को `INFO` पर switch करो, फिर वापस

### 2. Unused Container Insights Disable करो

अगर CloudWatch Container Insights enable किया लेकिन कोई dashboards नहीं देखता, disable करो। Metric ingestion cost तब भी लगता रहता है चाहे कोई dashboards देखे या नहीं।

Container Insights **EKS control-plane logging** (`cluster.logging`) नहीं है। Observability add-on या उसके log groups चेक करो:

```bash
aws eks list-addons --cluster-name your-cluster \
  --query "addons[?contains(@, 'cloudwatch') || contains(@, 'observability')]"

aws logs describe-log-groups \
  --log-group-name-prefix /aws/containerinsights/
```

### 3. Log Retention Policies Set करो

Default में CloudWatch log groups data forever retain करते हैं। Retention actual needs से match करो:

- Production: 30-90 दिन
- Staging/UAT: 7-14 दिन
- CI/CD: 3-7 दिन

```bash
aws logs put-retention-policy \
  --log-group-name /ecs/my-service \
  --retention-in-days 30
```

### 4. Log Insights की जगह Metric Filters इस्तेमाल करो

अगर regularly same Log Insights query चलाते हो, उसकी जगह **metric filter** create करो। यह metric ingestion time पर extract करता है (log ingestion cost में included) बजाय retroactively logs scan करने के ($0.005/GB)।

## Open-Source Alternatives

जिन teams के लिए CloudWatch costs prohibitive हैं, self-hosted open-source alternatives consider करो:

| Tool | क्या Replace करता है | Deployment |
|------|---------------------|------------|
| **SigNoz** | CloudWatch Metrics + Logs + Traces | EKS पर Helm chart, storage के लिए ClickHouse |
| **Prometheus + Grafana** | CloudWatch Metrics | Helm chart, widely supported |
| **Loki** | CloudWatch Logs | Grafana के साथ pair होता है, label-based indexing |
| **OpenTelemetry Collector** | CloudWatch agent | Vendor-neutral telemetry pipeline |

Trade-off operational overhead है — monitoring infrastructure ख़ुद manage कर रहे हो। लेकिन जो teams पहले से EKS चलाती हैं, उनके लिए Prometheus + Grafana stack add करना straightforward है और ज़्यादातर CloudWatch spend eliminate कर सकता है।

### Hybrid Approach

एक practical middle ground:
- **AWS service metrics** (RDS, ALB, Lambda) के लिए CloudWatch रखो — ये free या सस्ते हैं और natively integrate होते हैं
- **Application और container metrics** के लिए Prometheus/SigNoz इस्तेमाल करो — जहाँ high cardinality और volume CloudWatch costs drive करते हैं
- **सिर्फ़ critical production logs** के लिए CloudWatch Logs — debug/info logs cheaper destination पर route करो
