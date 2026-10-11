---
sidebar_position: 2
---

# Pod Security

Pod-level security controls who your workloads can talk to and what credentials they have access to.

## IAM Roles for Service Accounts (IRSA)

IRSA maps a Kubernetes ServiceAccount to an AWS IAM role. When a pod uses that ServiceAccount, it automatically gets temporary credentials for that role — no static access keys needed.

### Why IRSA Matters

| Static Access Keys | IRSA |
|-------------------|------|
| Long-lived credentials | Temporary, auto-rotated |
| Broad permissions (often `*`) | Scoped per-application |
| Stored in env vars / code | Injected by EKS automatically |
| Manual rotation | No rotation needed |
| Shared across pods | One role per ServiceAccount |

### How to Set Up

#### 1. Enable the OIDC provider for your cluster

```bash
eksctl utils associate-iam-oidc-provider \
  --cluster my-cluster --approve
```

#### 2. Create an IAM role with a trust policy

The trust policy allows the EKS OIDC provider to assume this role, but only for a specific ServiceAccount in a specific namespace:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/oidc.eks.REGION.amazonaws.com/id/CLUSTER_ID"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.REGION.amazonaws.com/id/CLUSTER_ID:aud": "sts.amazonaws.com",
          "oidc.eks.REGION.amazonaws.com/id/CLUSTER_ID:sub": "system:serviceaccount:NAMESPACE:SA_NAME"
        }
      }
    }
  ]
}
```

#### 3. Attach a scoped permission policy

Only grant what the application needs. Example for an app that reads from a specific S3 bucket and writes to a specific DynamoDB table:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::my-bucket", "arn:aws:s3:::my-bucket/*"]
    },
    {
      "Effect": "Allow",
      "Action": ["dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:Query"],
      "Resource": "arn:aws:dynamodb:*:*:table/my-table"
    }
  ]
}
```

#### 4. Create the Kubernetes ServiceAccount

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/my-app-role
```

#### 5. Update the Deployment to use it

```yaml
spec:
  template:
    spec:
      serviceAccountName: my-app
```

### Migration Strategy

If you have many applications on static access keys:

1. Start with one low-risk application. Verify it works end-to-end.
2. As an interim safety measure, add VPC condition policies to old access keys (they can only be used from within the VPC).
3. Migrate applications one at a time: create role → create SA → update deployment → test → revoke old key.
4. Python apps are easiest (boto3 automatically picks up IRSA credentials). Java apps may need SDK configuration changes.

## Pod Identity Agent

**EKS Pod Identity** is the next-generation replacement for IRSA. It is simpler to set up (no OIDC provider configuration) and supports cross-account access natively.

If you are starting fresh, use Pod Identity. If you already have IRSA, migrate gradually — both can coexist.

## Secrets Management

### External Secrets Operator

For secrets stored in AWS Secrets Manager or Parameter Store, the [External Secrets Operator](https://external-secrets.io/) syncs them into Kubernetes Secrets automatically:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-app-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: my-app-secrets
  data:
    - secretKey: database-url
      remoteRef:
        key: /prod/my-app/database-url
```

### Best Practices

- Use KMS customer-managed keys (CMK) for encrypting secrets at rest
- Enable secret version tracking for audit purposes
- Set `refreshInterval` appropriately — 1 hour for most secrets, shorter for rapidly rotating credentials
- Never store secrets in environment variables in your Dockerfile or source code
