---
sidebar_position: 2
---

# Permission Sets Design

Permission sets define what users can do in AWS. A well-designed set of permission sets follows the principle of least privilege while remaining practical for day-to-day work.

## Recommended Permission Sets

### 1. Admin

**Audience**: Infrastructure / security team leads only.

**Policy**: `AdministratorAccess` (AWS managed).

**Notes**: This should be assigned to 1-2 people maximum. Use it sparingly — most daily work should use Ops-Infra or Engineering roles.

### 2. Ops-Infra-Admin

**Audience**: DevOps / platform engineers who manage infrastructure.

**What they can do**: Full access to infrastructure services (EC2, EKS, S3, RDS, VPC, Route 53, ALBs, ElastiCache, CloudWatch). Read-only access to billing. Cannot modify IAM users/roles or organizational settings.

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

This prevents accidental (or malicious) privilege escalation through IAM modifications.

### 3. Ops-Infra-Editor

**Audience**: Junior DevOps engineers or SREs who need to create and manage resources but not perform security-critical operations.

**What they can do**: Create, modify, and manage EC2, EKS, S3, CloudWatch, RDS, ALBs. No IAM permissions at all.

**Scope**: Staging and lower environments. Partial production access (read + specific write operations).

### 4. Engineering-Editor

**Audience**: Application developers who deploy and manage application-level resources.

**What they can do**: Full access to EC2, S3, Lambda, CloudWatch, DynamoDB, ECS, SQS, SNS. Read access to CloudWatch logs for debugging.

**What they cannot do**: No IAM changes, no billing access, no organizational changes.

### 5. Engineering-Readonly

**Audience**: Engineers who need to audit, troubleshoot, or monitor without making changes.

**Policy**: `ReadOnlyAccess` (AWS managed).

**Scope**: All environments. Useful for on-call engineers who need to investigate issues but should not make infrastructure changes.

### 6. ML-Editor

**Audience**: ML / data engineering team.

**What they can do**: Full access to SageMaker, S3, EC2, CloudWatch, ECR. No IAM or organizational access.

### 7. Frontend-Admin

**Audience**: Frontend team.

**What they can do**: Full access to Amplify, CloudFront, Route 53, S3, ACM, CloudFormation. Read-only access to EC2 and DynamoDB.

### 8. Billing

**Audience**: Finance team or engineering leads who need cost visibility.

**Policy**: `AWSBillingReadOnlyAccess` (AWS managed).

## Design Principles

1. **Start restrictive, loosen on request**: It is easier to grant additional permissions than to revoke them.
2. **Use deny rules for guardrails**: Even if a permissive `Allow` exists, explicit `Deny` on destructive IAM operations prevents escalation.
3. **Separate read and write**: Having both an Editor and Readonly variant of each role lets you grant appropriate access for each situation.
4. **No wildcards in production policies**: `"Action": "*"` should only exist in the Admin permission set. Everything else should list specific actions.
5. **Review quarterly**: As team structure and tooling evolve, permission sets should be updated to match.
