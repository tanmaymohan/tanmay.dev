---
sidebar_position: 4
sidebar_label: AWS Account & Access Setup
---

# AWS Account & Access Setup

Production-grade AWS account set up करने के लिए checklist-style guide — proper access controls, SSO, और governance policies के साथ।

## यह क्यों ज़रूरी है

एक अच्छी तरह configured AWS account बाकी सब की foundation है। यहाँ गलतियाँ — overly permissive IAM policies, कोई MFA enforcement नहीं, public S3 buckets — ऐसे security gaps create करती हैं जिन्हें बाद में fix करना मुश्किल है।

## Guides

| Guide | क्या cover करता है |
|-------|-------------------|
| **[IAM Identity Center (SSO)](./iam-sso)** | Google Workspace के साथ SSO set up करना, console और CLI access |
| **[Permission Sets](./permission-sets)** | अलग-अलग team functions के लिए role-based permission sets design करना |
| **[EKS Requirements](./eks-requirements)** | Production EKS cluster के लिए Karpenter, addons, node config, logging setup |
| **[Account Services](./account-services)** | VPC, RDS, ElastiCache, S3, CloudFront, और अन्य service configurations |
| **[Governance](./governance)** | SCP policies, CloudTrail, tagging strategy |
