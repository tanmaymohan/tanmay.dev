---
sidebar_position: 3
sidebar_label: EKS Security Hardening
---

# EKS Security Hardening Guide

A layered approach to securing Amazon EKS clusters — from the node OS to the CI/CD pipeline.

## The Layers

EKS security is not a single setting. It is a stack of layers, each addressing a different attack surface:

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

Start from the bottom (nodes) and work up. Each layer builds on the one below it.

## Guides

| Guide | What it covers |
|-------|---------------|
| **[Node Security](./node-security)** | Bottlerocket OS, no SSH, AMI management, node refresh |
| **[Pod Security](./pod-security)** | IRSA, Pod Identity Agent, secrets management, migrating from access keys |
| **[Network Security](./network-security)** | Private API endpoint, VPN-only kubectl, security groups, WAF |
| **[CI/CD Security](./cicd-security)** | SonarCloud, Trivy scanning, Quality Gates, branch protection |
| **[Cluster Upgrades](./cluster-upgrades)** | EKS version upgrades, addon compatibility, rollout strategy |

## Priority Order

If you are starting from scratch, tackle these in order:

1. **Bottlerocket** (node security) — single change, biggest impact on host-level attack surface
2. **Private API endpoint** (network) — removes the cluster from the internet
3. **IRSA** (pod security) — eliminates static credentials
4. **SonarCloud + Trivy** (CI/CD) — catches vulnerabilities before they ship
5. **Cluster upgrades** (management) — stay current on security patches
