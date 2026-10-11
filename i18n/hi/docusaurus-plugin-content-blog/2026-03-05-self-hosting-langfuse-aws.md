---
slug: self-hosting-langfuse-on-aws
title: "AWS पर LLM Observability के लिए Langfuse Self-Host किया"
authors: [tanmay]
tags: [ai, observability, aws]
---

हमारी टीम LLM-powered features बना रही थी — agents, chat interfaces, document analysis — और हमें बिल्कुल visibility नहीं थी कि models actually क्या कर रहे हैं। कोई trace नहीं कि कौन से prompts भेजे गए, latency क्या थी, हर call कितना cost कर रही थी, या outputs अच्छे थे या नहीं।

मैंने hosted observability platforms evaluate किए, लेकिन data residency requirements की वजह से सब कुछ अपने cloud account में ही रखना था। तो मैंने **Langfuse** — एक open-source LLM observability platform — AWS पर self-host किया। यह रहा architecture और क्या सीखा।

{/* truncate */}

## Langfuse क्या करता है

[Langfuse](https://langfuse.com/) LLM observability के लिए एक open-source platform है। यह देता है:

- **Traces**: हर LLM call input, output, latency, token count, और cost के साथ logged
- **Sessions**: Related LLM calls को user sessions में group करो conversation flows debug करने के लिए
- **Evaluations**: Outputs को manually या automated eval pipelines से score करो
- **Metrics**: Cost, latency, error rates, और usage trends के dashboards

इसे LLM calls के लिए Datadog समझो। SDKs LangChain, OpenAI, और अन्य LLM frameworks के साथ कुछ lines of code में integrate हो जाते हैं।

## Self-Host क्यों

तीन कारण:

1. **Data residency**: हम prompt/completion data (जिसमें sensitive information हो सकती है) किसी third-party SaaS को अपने cloud account के बाहर नहीं भेज सकते थे।
2. **Scale पर cost**: Langfuse की hosted pricing traces की संख्या पर scale होती है। हमारे volume पर, self-hosting काफ़ी सस्ता था।
3. **Customization**: Retention policies, access controls, और existing monitoring stack के साथ integration पर हमें control चाहिए था।

## Architecture

Langfuse v3 के दो main components हैं: एक **web server** (UI और API) और एक **worker** (background processing)। इसके पीछे चार data stores चाहिए।

### Compute: ECS Fargate

Web server और worker दोनों **ECS Fargate** services के रूप में चलते हैं:

- **Web**: 2 vCPU, 4 GB RAM, port 3000 पर expose
- **Worker**: 2 vCPU, 4 GB RAM, port 3030 पर

Fargate यहाँ सही choice था क्योंकि:
- कोई nodes manage, patch, या right-size नहीं करने
- CPU/memory utilization पर auto-scaling
- EKS cluster से isolated जहाँ application workloads चलते हैं (blast radius containment)

हो सकता है वे database passwords और encryption keys जैसे secrets service configuration के साथ रखें, container image के बाहर।

### OLTP: RDS PostgreSQL

Langfuse transactional data के लिए Postgres इस्तेमाल करता है — user accounts, project configs, session metadata, evaluation scores। एक छोटा `t4g.small` RDS instance इसे आसानी से handle करता है। Price/performance ratio के लिए Graviton।

### OLAP: EC2 पर ClickHouse

यहाँ trace data रहता है — और यह बड़ा हो सकता है। Langfuse traces, spans, और observations पर analytical queries के लिए **ClickHouse** इस्तेमाल करता है।

मैं ClickHouse एक single EC2 instance पर चलाता हूँ:
- **Instance type**: `c7g.xlarge` (ARM/Graviton, 4 vCPU, 8 GB RAM)
- **OS**: Ubuntu 24.04
- **Storage**: Expected trace volume के हिसाब से sized gp3 EBS volume

Managed ClickHouse service क्यों नहीं? Cost। Single EC2 instance पर ClickHouse managed alternatives से dramatically सस्ता है, और एक internal observability tool के लिए, एक ClickHouse node manage करने का operational overhead acceptable है।

### Cache: Redis (Valkey)

ElastiCache Valkey node web और worker services के बीच caching और job queues handle करता है। एक छोटा single node काफ़ी है।

### Blob Storage: S3

Langfuse event payloads और media uploads (traces से attached screenshots, audio files) S3 में store करता है। दो prefixes: `events/` और `media/`।

### Traffic Flow

```
Applications (SDK) ──→ Internal ALB (TLS) ──→ Langfuse Web (:3000)
                                                    │
Team (VPN से) ─────→ Internal ALB (TLS) ──→ Langfuse Web (:3000)
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

Internal ALB TLS terminate करता है और सिर्फ़ VPC के अंदर (और VPN से) reachable है। Langfuse UI के लिए Google SSO enable है ताकि टीम existing corporate accounts से sign in करे।

## Deployment

ECS task definitions official Langfuse Docker images reference करती हैं (`langfuse/langfuse:3` web के लिए)। Worker अलग image इस्तेमाल करता है।

Configuration पूरी तरह environment variables से:
- `DATABASE_URL` — Postgres connection string
- `CLICKHOUSE_URL` — ClickHouse HTTP endpoint (private IP)
- `REDIS_HOST` — ElastiCache endpoint
- `S3_BUCKET` — Blob storage bucket
- `NEXTAUTH_URL` — Langfuse UI का public URL
- `ENCRYPTION_KEY` — Postgres में sensitive data at rest encrypt करने के लिए

Logs CloudWatch में जाते हैं। हर service के लिए अलग log group — easy filtering के लिए।

## Cost

कुछ लाख traces per month generate करने वाली team के लिए:

| Component | मासिक Cost (लगभग) |
|-----------|-------------------:|
| ECS Fargate (2 services) | ~$70 |
| RDS t4g.small | ~$30 |
| EC2 c7g.xlarge (ClickHouse) | ~$90 |
| ElastiCache (small Valkey) | ~$15 |
| S3 storage | ~$5 |
| ALB | ~$20 |
| **कुल** | **~$230/माह** |

Scale पर Langfuse Cloud की pricing से compare करो, और self-hosting जल्दी pay for itself कर लेता है।

## मैंने क्या सीखा

1. **ARM पर ClickHouse great fit है**। Graviton instances per dollar ज़्यादा compute देते हैं, और ClickHouse ARM पर natively चलता है। c7g family इसके लिए ideal है।

2. **शुरू से OLTP और OLAP अलग रखो**। Langfuse v3 का Postgres (transactions) और ClickHouse (analytics) वाला architecture सही design है। सब कुछ Postgres पर चलाने की कोशिश मत करो — trace query performance जल्दी degrade होगी।

3. **Internal tools के लिए ECS Fargate underrated है**। Stateless web services के लिए Kubernetes से simpler है, ख़ासकर जब EKS की full power की ज़रूरत न हो। Task definitions, service auto-scaling, और ALB integration बस काम करता है।

4. **हो सकता है वे secrets image के बाहर रखें**, internal tool के लिए। Production application workloads के लिए Secrets Manager या Parameter Store इस्तेमाल करूँगा।

5. **VPN-only access non-negotiable है**। LLM traces में prompts और completions होते हैं जिनमें sensitive data हो सकता है। Langfuse UI कभी public internet पर expose नहीं होना चाहिए।

अगर आप LLM workloads चला रहे हैं और उनमें कोई observability नहीं है, तो Langfuse visibility पाने का सबसे तेज़ तरीका है। Self-hosting में लगभग एक दिन लगता है और small-to-medium team के लिए $250/माह से कम cost है।
