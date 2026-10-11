---
sidebar_position: 5
---

# Governance

Account-level policies, audit trails, and tagging standards that keep your AWS environment secure and manageable.

## Service Control Policies (SCPs)

If your account is part of an AWS Organization, SCPs set guardrails that even administrators cannot override.

### Recommended SCPs

#### Deny Root Console Access

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

Exceptions: Allow specific actions like billing view if needed via a separate statement.

#### Restrict to Allowed Regions

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

This prevents anyone from creating resources in unauthorized regions while allowing global services (IAM, STS, billing) to work normally.

#### Enforce KMS Encryption

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

#### Prevent Public S3 Buckets

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

Also enable the **account-level S3 Block Public Access** setting as a safety net.

## CloudTrail

CloudTrail logs all API calls across your AWS account. It is essential for security auditing and incident response.

### Checklist

- [ ] **Trail enabled** in all regions (or use an Organization trail)
- [ ] **S3 bucket** for log storage with encryption and versioning
- [ ] **Log file validation** enabled (tamper detection)
- [ ] **CloudWatch integration** for real-time alerting on specific events
- [ ] **Retention**: Keep logs for at least 90 days in CloudWatch, archive to S3 for longer retention

### Alerts to Configure

Set up CloudWatch alarms or EventBridge rules for:

- Root account usage (any API call from root)
- IAM policy changes
- Security group changes
- Network ACL changes
- CloudTrail configuration changes
- S3 bucket policy changes
- Console sign-in failures
- Delete operations on critical resources (VPCs, NAT Gateways, RDS instances)

## Tagging Strategy

Tags enable cost allocation, access control, and operational automation.

### Required Tags

| Tag Key | Example Values | Purpose |
|---------|---------------|---------|
| `Environment` | `production`, `staging`, `uat` | Cost allocation, access control |
| `Team` | `platform`, `ml`, `frontend` | Cost attribution |
| `Service` | `api`, `worker`, `dashboard` | Resource identification |
| `ManagedBy` | `terraform`, `manual`, `cdk` | Track IaC coverage |

### Enforcement

- Use AWS Config rules to check for required tags
- Use SCP policies to deny resource creation without required tags (advanced)
- Tag everything at creation time — retroactive tagging is painful

## AWS Config

AWS Config tracks resource configuration changes and evaluates compliance against rules.

### Recommended Rules

- `s3-bucket-public-read-prohibited`
- `s3-bucket-server-side-encryption-enabled`
- `rds-instance-public-access-check`
- `ec2-instance-no-public-ip`
- `iam-user-mfa-enabled`
- `root-account-mfa-enabled`
- `eks-endpoint-no-public-access`

Enable **conformance packs** for bundled rule sets aligned with security frameworks (CIS, NIST, etc.).
