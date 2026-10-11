---
sidebar_position: 2
---

# Database Cost Optimization

Databases अक्सर compute के बाद दूसरा सबसे बड़ा cost center होते हैं। इन्हें बदलना सबसे मुश्किल भी है क्योंकि downtime unacceptable है और data migration risky। यहाँ safe, proven techniques हैं।

## RDS Right-Sizing

### कैसे Assess करें

1. हर RDS instance के लिए CloudWatch खोलो
2. पिछले 30 दिनों की ये metrics देखो:
   - **CPUUtilization**: लगातार 30% से नीचे रहे तो instance likely oversized है
   - **FreeableMemory**: लगातार total का 50% से ज़्यादा रहे तो excess memory है
   - **DatabaseConnections**: Instance class maximum से compare करो
   - **ReadIOPS / WriteIOPS**: Provisioned IOPS या GP3 baseline से compare करो

### Common Findings

- Instances जो launch पर provision हुईं और कभी revisit नहीं हुईं (जैसे `db.r6g.xlarge` जब `db.t4g.medium` काफ़ी होता)
- Development/staging databases production-class instance types पर चल रही हैं
- Non-production databases पर Multi-AZ enable है (cost double करता है)

### कैसे Downsize करें

1. Snapshot लो (safety net)
2. Maintenance window में instance class modify करो
3. Multi-AZ के लिए, पहले failover होता है — standby modify होता है, फिर failover से वो primary बनता है, फिर पुराना primary modify होता है। Brief interruption (~30 seconds)।

### RDS के लिए Graviton

`db.t4g`, `db.r7g`, और `db.m7g` instance classes ARM-based Graviton processors इस्तेमाल करती हैं। Equivalent x86 instances से typically 10-20% सस्ती हैं, same या better performance के साथ। सभी major RDS engines (MySQL, PostgreSQL, MariaDB) Graviton support करते हैं।

## Service Migration: DocumentDB → MongoDB Atlas

अगर Amazon DocumentDB इस्तेमाल कर रहे हो और workload MongoDB Atlas के साथ compatible है, तो migration से काफ़ी पैसे बच सकते हैं:

- DocumentDB pricing instance hours + storage + I/O पर based है। एक छोटा cluster आसानी से $150-200/माह cost करता है।
- MongoDB Atlas नए customers को free tier और credits offer करता है। Credits के बाद भी, small-to-medium workloads के लिए pricing model अक्सर ज़्यादा favorable होता है।

### Migration Steps

1. DocumentDB से `mongodump` से data export करो
2. MongoDB Atlas cluster create करो (latency के लिए VPC के same region में)
3. Atlas और AWS VPC के बीच VPC Peering set up करो
4. `mongorestore` से data import करो
5. Application connection strings update करो
6. Staging में thoroughly test करो
7. Maintenance window में production cut over करो
8. Rollback period के लिए DocumentDB read-only mode में चालू रखो
9. Bake period के बाद DocumentDB terminate करो

## Databases के लिए Reserved Capacity

24/7 predictable specs पर चलने वाले databases के लिए:

- **RDS Reserved Instances**: 1-year या 3-year commitments, 30-60% savings
- **ElastiCache Reserved Nodes**: Redis/Valkey caches के लिए same model
- **OpenSearch Reserved Instances**: अगर managed OpenSearch चलाते हो

सिर्फ़ right-sizing के बाद commit करो। Pattern हमेशा है: measure → right-size → stabilize → commit।

## Unused Databases Deprecate करो

ऐसे databases audit करो जिनमें:
- पिछले 30 दिनों में zero connections हैं
- किसी specific project के लिए बने थे जो ख़त्म हो गया
- Duplicates हैं (जैसे production mirror करने वाला "test" database)

हर एक के लिए: snapshot लो, team से verify करो कि सच में unused है, फिर stop या delete करो। Snapshots सस्ते हैं; running instances नहीं।
