---
sidebar_position: 4
sidebar_label: AWS Account & Access Setup
---

# AWS Account & Access Setup

A checklist-style guide for setting up a production-grade AWS account with proper access controls, SSO, and governance policies.

## Why This Matters

A well-configured AWS account is the foundation for everything else. Mistakes here — overly permissive IAM policies, no MFA enforcement, public S3 buckets — create security gaps that are hard to fix later.

## Guides

| Guide | What it covers |
|-------|---------------|
| **[IAM Identity Center (SSO)](./iam-sso)** | Setting up SSO with Google Workspace, console and CLI access |
| **[Permission Sets](./permission-sets)** | Designing role-based permission sets for different team functions |
| **[EKS Requirements](./eks-requirements)** | Karpenter, addons, node config, logging setup for a production EKS cluster |
| **[Account Services](./account-services)** | VPC, RDS, ElastiCache, S3, CloudFront, and other service configurations |
| **[Governance](./governance)** | SCP policies, CloudTrail, tagging strategy |
