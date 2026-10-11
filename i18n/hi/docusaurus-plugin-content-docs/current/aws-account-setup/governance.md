---
sidebar_position: 5
---

# Governance

Account-level policies, audit trails, और tagging standards जो AWS environment को secure और manageable रखते हैं।

## Service Control Policies (SCPs)

अगर account AWS Organization का हिस्सा है, SCPs ऐसे guardrails set करते हैं जो administrators भी override नहीं कर सकते।

### Recommended SCPs

#### Root Console Access Deny करो

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "StringLike": {
          "aws:PrincipalArn": "arn:aws:iam::*:root"
        }
      }
    }
  ]
}
```

Exceptions: अगर ज़रूरत हो तो billing view जैसी specific actions allow करो अलग statement से।

#### Allowed Regions तक Restrict करो

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "NotAction": [
        "iam:*",
        "sts:*",
        "organizations:*",
        "support:*",
        "billing:*"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:RequestedRegion": ["ap-south-1", "ap-south-2"]
        }
      }
    }
  ]
}
```

यह unauthorized regions में resources create करने से रोकता है जबकि global services (IAM, STS, billing) normally काम करती रहें।

#### KMS Encryption Enforce करो

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": "s3:PutObject",
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "aws:kms"
        }
      }
    }
  ]
}
```

#### Public S3 Buckets Prevent करो

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": [
        "s3:PutBucketPublicAccessBlock"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "s3:PublicAccessBlockConfiguration/BlockPublicAcls": "true"
        }
      }
    }
  ]
}
```

Safety net के रूप में **account-level S3 Block Public Access** setting भी enable करो।

## CloudTrail

CloudTrail AWS account की सभी API calls log करता है। Security auditing और incident response के लिए essential।

### Checklist

- [ ] सभी regions में **Trail enabled** (या Organization trail इस्तेमाल करो)
- [ ] Log storage के लिए encryption और versioning वाला **S3 bucket**
- [ ] **Log file validation** enabled (tamper detection)
- [ ] Specific events पर real-time alerting के लिए **CloudWatch integration**
- [ ] **Retention**: CloudWatch में कम से कम 90 दिन logs रखो, longer retention के लिए S3 में archive

### Configure करने वाले Alerts

CloudWatch alarms या EventBridge rules set up करो:

- Root account usage (root से कोई भी API call)
- IAM policy changes
- Security group changes
- Network ACL changes
- CloudTrail configuration changes
- S3 bucket policy changes
- Console sign-in failures
- Critical resources पर delete operations (VPCs, NAT Gateways, RDS instances)

## Tagging Strategy

Tags cost allocation, access control, और operational automation enable करते हैं।

### Required Tags

| Tag Key | Example Values | Purpose |
|---------|---------------|---------|
| `Environment` | `production`, `staging`, `uat` | Cost allocation, access control |
| `Team` | `platform`, `ml`, `frontend` | Cost attribution |
| `Service` | `api`, `worker`, `dashboard` | Resource identification |
| `ManagedBy` | `terraform`, `manual`, `cdk` | IaC coverage track |

### Enforcement

- Required tags check करने के लिए AWS Config rules इस्तेमाल करो
- Required tags बिना resource creation deny करने के लिए SCP policies इस्तेमाल करो (advanced)
- Creation time पर सब tag करो — retroactive tagging painful है

## AWS Config

AWS Config resource configuration changes track करता है और rules के against compliance evaluate करता है।

### Recommended Rules

- `s3-bucket-public-read-prohibited`
- `s3-bucket-server-side-encryption-enabled`
- `rds-instance-public-access-check`
- `ec2-instance-no-public-ip`
- `iam-user-mfa-enabled`
- `root-account-mfa-enabled`
- `eks-endpoint-no-public-access`

Security frameworks (CIS, NIST, etc.) के साथ aligned bundled rule sets के लिए **conformance packs** enable करो।
