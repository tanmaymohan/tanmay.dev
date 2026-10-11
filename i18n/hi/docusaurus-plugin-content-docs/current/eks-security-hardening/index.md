---
sidebar_position: 3
sidebar_label: EKS Security Hardening
---

# EKS Security Hardening Guide

Amazon EKS clusters को secure करने का layered approach — node OS से CI/CD pipeline तक।

## Layers

EKS security एक single setting नहीं है। यह layers का stack है, हर एक अलग attack surface address करता है:

```
┌─────────────────────────────────┐
│        CI/CD Pipeline           │  ← SonarCloud, Trivy, branch protection
├─────────────────────────────────┤
│        Pod Security             │  ← IRSA, Pod Identity, secrets management
├─────────────────────────────────┤
│        Network Security         │  ← Private API, WAF, security groups
├─────────────────────────────────┤
│        Node Security            │  ← Bottlerocket, no SSH, AMI management
├─────────────────────────────────┤
│        Cluster Management       │  ← Upgrades, addon versions, monitoring
└─────────────────────────────────┘
```

नीचे (nodes) से शुरू करो और ऊपर जाओ। हर layer नीचे वाली पर build होती है।

## Guides

| Guide | क्या cover करता है |
|-------|-------------------|
| **[Node Security](./node-security)** | Bottlerocket OS, no SSH, AMI management, node refresh |
| **[Pod Security](./pod-security)** | IRSA, Pod Identity Agent, secrets management, access keys से migration |
| **[Network Security](./network-security)** | Private API endpoint, VPN-only kubectl, security groups, WAF |
| **[CI/CD Security](./cicd-security)** | SonarCloud, Trivy scanning, Quality Gates, branch protection |
| **[Cluster Upgrades](./cluster-upgrades)** | EKS version upgrades, addon compatibility, rollout strategy |

## Priority Order

अगर scratch से शुरू कर रहे हो, इस order में tackle करो:

1. **Bottlerocket** (node security) — single change, host-level attack surface पर biggest impact
2. **Private API endpoint** (network) — cluster को internet से हटाता है
3. **IRSA** (pod security) — static credentials eliminate करता है
4. **SonarCloud + Trivy** (CI/CD) — ship होने से पहले vulnerabilities पकड़ता है
5. **Cluster upgrades** (management) — security patches पर current रहो
