---
sidebar_position: 2
---

# Pod Security

Pod-level security controls करता है कि workloads किससे बात कर सकते हैं और किन credentials तक access है।

## IAM Roles for Service Accounts (IRSA)

IRSA एक Kubernetes ServiceAccount को AWS IAM role से map करता है। जब pod उस ServiceAccount को इस्तेमाल करता है, उसे अपने आप उस role के temporary credentials मिल जाते हैं — कोई static access keys नहीं।

### IRSA क्यों ज़रूरी है

| Static Access Keys | IRSA |
|-------------------|------|
| Long-lived credentials | Temporary, auto-rotated |
| Broad permissions (अक्सर `*`) | Per-application scoped |
| Env vars / code में stored | EKS अपने आप inject करता है |
| Manual rotation | Rotation ज़रूरी नहीं |
| Pods में shared | Per ServiceAccount एक role |

### कैसे Set Up करें

#### 1. Cluster के लिए OIDC provider enable करो

```bash
eksctl utils associate-iam-oidc-provider \
  --cluster my-cluster --approve
```

#### 2. Trust policy के साथ IAM role create करो

Trust policy EKS OIDC provider को यह role assume करने देती है, लेकिन सिर्फ़ specific namespace में specific ServiceAccount के लिए:

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

#### 3. Scoped permission policy attach करो

सिर्फ़ वो grant करो जो application को चाहिए। Example — app जो specific S3 bucket से read करती है और specific DynamoDB table में write:

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

#### 4. Kubernetes ServiceAccount create करो

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/my-app-role
```

#### 5. Deployment update करो

```yaml
spec:
  template:
    spec:
      serviceAccountName: my-app
```

### Migration Strategy

अगर बहुत सारी applications static access keys पर हैं:

1. एक low-risk application से शुरू करो। End-to-end verify करो।
2. Interim safety measure के रूप में, पुरानी access keys पर VPC condition policies add करो (सिर्फ़ VPC के अंदर से use हो सकें)।
3. एक-एक application migrate करो: role create → SA create → deployment update → test → पुरानी key revoke।
4. Python apps सबसे आसान हैं (boto3 अपने आप IRSA credentials pick up करता है)। Java apps में SDK configuration changes ज़रूरी हो सकते हैं।

## Pod Identity Agent

**EKS Pod Identity** IRSA का next-generation replacement है। Set up करना simpler है (कोई OIDC provider configuration नहीं) और cross-account access natively support करता है।

अगर fresh start कर रहे हो, Pod Identity इस्तेमाल करो। अगर पहले से IRSA है, gradually migrate करो — दोनों coexist कर सकते हैं।

## Secrets Management

### External Secrets Operator

AWS Secrets Manager या Parameter Store में stored secrets के लिए, [External Secrets Operator](https://external-secrets.io/) उन्हें Kubernetes Secrets में automatically sync करता है:

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

- Secrets at rest encrypt करने के लिए KMS customer-managed keys (CMK) इस्तेमाल करो
- Audit purposes के लिए secret version tracking enable करो
- `refreshInterval` appropriately set करो — ज़्यादातर secrets के लिए 1 hour, rapidly rotating credentials के लिए shorter
- Dockerfile या source code में environment variables में कभी secrets store मत करो
