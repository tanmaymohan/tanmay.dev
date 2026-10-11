---
sidebar_position: 4
---

# Networking Cost Optimization

AWS पर networking costs अक्सर surprising होते हैं क्योंकि ये bill देखने तक invisible रहते हैं। Data transfer, NAT Gateway charges, और cross-AZ traffic monthly spend का significant हिस्सा बन सकते हैं।

## VPC Endpoints

S3 और DynamoDB के लिए **VPC Gateway Endpoint** free है और traffic सीधे VPC से service पर route करता है — NAT Gateway bypass करके।

VPC endpoint के बिना, private subnet से S3 तक traffic: **Pod → NAT Gateway → Internet → S3**। हर byte पर NAT Gateway data processing charges ($0.045/GB) pay करते हो।

Gateway endpoint के साथ: **Pod → S3** (direct, free)।

### कैसे Add करें

```bash
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-xxx \
  --service-name com.amazonaws.ap-south-1.s3 \
  --route-table-ids rtb-xxx
```

CloudWatch, Secrets Manager, ECR, और SSM जैसी services के लिए **Interface Endpoints** इस्तेमाल करो। ये ~$7/माह per endpoint per AZ cost करते हैं, लेकिन उन services के NAT charges eliminate करते हैं। Worth है या नहीं traffic volume पर depend करता है — हर service के लिए calculation करो।

### High-Traffic Services

| Service | Endpoint Type | कब worth है |
|---------|--------------|-------------|
| S3 | Gateway (free) | हमेशा |
| DynamoDB | Gateway (free) | हमेशा |
| ECR (image pulls के लिए) | Interface | अगर बार-बार images pull करते हो (EKS nodes, CI/CD) |
| CloudWatch Logs | Interface | अगर high log volumes भेजते हो |
| Secrets Manager | Interface | अगर External Secrets Operator या frequent secret reads इस्तेमाल करते हो |
| SSM | Interface | अगर node management के लिए SSM इस्तेमाल करते हो |

## NAT Gateway Costs

NAT Gateways charge करते हैं:
- **Hourly running cost**: ~$0.045/hour (~$32/माह per NAT GW)
- **Data processing**: $0.045/GB सारे data के लिए जो इससे गुज़रता है

अगर per AZ एक NAT Gateway चलाते हो (common HA pattern), तो सिर्फ़ NAT Gateways के लिए ~$96/माह — data charges से पहले।

### कैसे कम करें

1. **S3 और DynamoDB के लिए gateway endpoints add करो** (ऊपर देखो)
2. **NAT traffic audit करो**: VPC Flow Logs से समझो कौन सा traffic NAT से flow हो रहा है। शायद services unexpected external calls कर रही हों।
3. **Single NAT Gateway consider करो**: Non-production environments के लिए, single AZ में एक NAT Gateway अक्सर काफ़ी है। Staging के लिए HA trade-off acceptable है।
4. **High-traffic interface services के लिए VPC endpoints इस्तेमाल करो**: ECR image pulls EKS clusters पर significant NAT traffic generate कर सकते हैं।

## Cross-AZ Traffic

Availability Zones के बीच data transfer $0.01/GB each direction ($0.02/GB round trip) cost करता है। HA deployments के लिए यह unavoidable है, लेकिन minimize कर सकते हो:

- **जहाँ possible हो services same AZ में deploy करो**: अगर दो services heavily communicate करती हैं, topology-aware routing या affinity rules consider करो same-AZ communication prefer करने के लिए।
- **Kubernetes में topology-aware hints इस्तेमाल करो**: Kubernetes topology-aware routing support करता है जो same-zone endpoints prefer करता है।
- **Cross-AZ backups carefully size करो**: Cross-region backup replication DR के लिए useful है लेकिन ongoing data transfer costs generate करती है। सिर्फ़ उस data के लिए enable करो जिसे सच में geographic redundancy चाहिए।
