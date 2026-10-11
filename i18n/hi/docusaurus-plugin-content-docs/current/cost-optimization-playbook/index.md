---
sidebar_position: 2
sidebar_label: Cost Optimization Playbook
---

# Cloud Cost Optimization Playbook

AWS cloud costs कम करने की practical, opinionated guide — बिना reliability या developer velocity sacrifice किए।

## यह किसके लिए है

Cloud engineers, DevOps leads, और platform teams जो AWS infrastructure manage करती हैं और cost reduction के लिए systematic approach चाहती हैं — सिर्फ़ tips की list नहीं।

## Framework

Cost optimization एक बार का project नहीं है। यह एक cycle है:

1. **Visibility लो** — समझो पैसा कहाँ जा रहा है (Cost Explorer, tags, Vantage)
2. **Right-size करो** — Resources को actual usage से match करो
3. **Commit करो** — Predictable baseline usage पर discounts lock करो
4. **Eliminate करो** — जो कोई इस्तेमाल नहीं करता, बंद करो
5. **दोहराओ** — Monthly review करो, drift जल्दी पकड़ो

## Guides

| Guide | क्या cover करता है |
|-------|-------------------|
| **[Compute](./compute)** | Pod right-sizing, spot instances, Savings Plans, Karpenter, instance family selection |
| **[Database](./database)** | RDS right-sizing, service migration (DocumentDB → MongoDB Atlas), reserved capacity |
| **[Storage](./storage)** | GP2 → GP3, S3 Intelligent Tiering, EBS cleanup, multipart upload lifecycle |
| **[Networking](./networking)** | VPC endpoints, NAT Gateway costs, cross-AZ traffic |
| **[Monitoring](./monitoring)** | CloudWatch cost management, log levels, open-source alternatives |

## Quick Wins

अगर सबसे कम effort में सबसे ज़्यादा impact वाले बदलाव ढूँढ रहे हो:

1. **Unused resources delete करो** — idle load balancers, stopped instances जिनके EBS volumes हैं, पुराने Elasticsearch clusters
2. **S3 Intelligent Tiering enable करो** — zero effort, infrequently accessed objects पर automatic savings
3. **GP2 से GP3 migrate करो** — कम cost पर better performance, बिना downtime के online migration
4. **S3 और DynamoDB के लिए VPC endpoints add करो** — gateway endpoints free हैं और इन services के लिए NAT Gateway data processing charges eliminate करते हैं
