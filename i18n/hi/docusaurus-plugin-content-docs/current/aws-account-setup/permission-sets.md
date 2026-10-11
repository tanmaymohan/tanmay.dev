---
sidebar_position: 2
---

# Permission Sets Design

Permission sets define करते हैं कि users AWS में क्या कर सकते हैं। अच्छी तरह designed permission sets principle of least privilege follow करते हैं और day-to-day काम के लिए practical भी रहते हैं।

## Recommended Permission Sets

### 1. Admin

**Audience**: सिर्फ़ Infrastructure / security team leads।

**Policy**: `AdministratorAccess` (AWS managed)।

**Notes**: Maximum 1-2 लोगों को assign होना चाहिए। Sparingly इस्तेमाल करो — ज़्यादातर daily काम Ops-Infra या Engineering roles से होना चाहिए।

### 2. Ops-Infra-Admin

**Audience**: DevOps / platform engineers जो infrastructure manage करते हैं।

**क्या कर सकते हैं**: Infrastructure services (EC2, EKS, S3, RDS, VPC, Route 53, ALBs, ElastiCache, CloudWatch) पर full access। Billing पर read-only। IAM users/roles या organizational settings modify नहीं कर सकते।

**Key deny rules**:
```json
{
  "Effect": "Deny",
  "Action": [
    "iam:DeleteUser",
    "iam:DeleteRole",
    "iam:PutRolePolicy",
    "iam:AttachRolePolicy"
  ],
  "Resource": "*"
}
```

यह IAM modifications से accidental (या malicious) privilege escalation prevent करता है।

### 3. Ops-Infra-Editor

**Audience**: Junior DevOps engineers या SREs जिन्हें resources create और manage करने हैं लेकिन security-critical operations नहीं करने।

**क्या कर सकते हैं**: EC2, EKS, S3, CloudWatch, RDS, ALBs create, modify, और manage। कोई IAM permissions नहीं।

**Scope**: Staging और lower environments। Production पर partial access (read + specific write operations)।

### 4. Engineering-Editor

**Audience**: Application developers जो application-level resources deploy और manage करते हैं।

**क्या कर सकते हैं**: EC2, S3, Lambda, CloudWatch, DynamoDB, ECS, SQS, SNS पर full access। Debugging के लिए CloudWatch logs पर read access।

**क्या नहीं कर सकते**: कोई IAM changes नहीं, कोई billing access नहीं, कोई organizational changes नहीं।

### 5. Engineering-Readonly

**Audience**: Engineers जिन्हें audit, troubleshoot, या monitor करना है बिना changes किए।

**Policy**: `ReadOnlyAccess` (AWS managed)।

**Scope**: सभी environments। On-call engineers के लिए useful जिन्हें issues investigate करने हैं लेकिन infrastructure changes नहीं करने चाहिए।

### 6. ML-Editor

**Audience**: ML / data engineering team।

**क्या कर सकते हैं**: SageMaker, S3, EC2, CloudWatch, ECR पर full access। कोई IAM या organizational access नहीं।

### 7. Frontend-Admin

**Audience**: Frontend team।

**क्या कर सकते हैं**: Amplify, CloudFront, Route 53, S3, ACM, CloudFormation पर full access। EC2 और DynamoDB पर read-only access।

### 8. Billing

**Audience**: Finance team या engineering leads जिन्हें cost visibility चाहिए।

**Policy**: `AWSBillingReadOnlyAccess` (AWS managed)।

## Design Principles

1. **Restrictive शुरू करो, request पर loosen करो**: Additional permissions grant करना revoke करने से आसान है।
2. **Guardrails के लिए deny rules इस्तेमाल करो**: Permissive `Allow` होने पर भी, destructive IAM operations पर explicit `Deny` escalation prevent करता है।
3. **Read और write अलग करो**: हर role का Editor और Readonly variant होने से हर situation के लिए appropriate access grant कर सकते हो।
4. **Production policies में wildcards नहीं**: `"Action": "*"` सिर्फ़ Admin permission set में होना चाहिए। बाकी सब specific actions list करें।
5. **Quarterly review करो**: Team structure और tooling evolve होने पर, permission sets match करने के लिए update होने चाहिए।
