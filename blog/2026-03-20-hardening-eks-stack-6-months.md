---
slug: hardening-eks-stack-6-months
title: "How I Hardened Our EKS Stack in a Month"
authors: [tanmay]
tags: [kubernetes, aws, security]
description: "4-week EKS security hardening plan: Bottlerocket nodes, private API endpoint, SonarCloud SAST, Trivy container scanning, AWS WAF, IRSA migration, and cluster upgrades. Includes before/after comparison table."
keywords: ["EKS security hardening", "Bottlerocket", "private EKS endpoint", "IRSA", "SonarCloud", "Trivy", "AWS WAF", "Kubernetes security"]
image: /img/author.jpg
---

When I started, the EKS setup had the basics — workloads running, traffic flowing, deployments working. But from a security perspective, there was a lot of surface area: static AWS access keys baked into apps, default Amazon Linux nodes, no container image scanning, and a publicly accessible Kubernetes API. I hardened the stack in **one month**, one week at a time. Here is the journey.

{/* truncate */}

| Week | Job |
|---|---|
| 1 | Shrink the host and hide the API. Bottlerocket, then a private EKS endpoint. |
| 2 | See the bugs. SonarCloud on every PR, Trivy on every image. |
| 3 | Close the perimeter. WAF, branch protection, hardened Dockerfiles. |
| 4 | Kill static keys, upgrade the cluster, and sit the external test. |

## The Starting Point

A quick audit revealed the state of things:

- **Static access keys**: Applications used long-lived AWS access keys (`AKIA*` credentials) to talk to S3, DynamoDB, SQS, and other AWS services. These keys were stored in environment variables and rotated manually (if at all).
- **Default node OS**: EKS nodes were running the default Amazon Linux 2 AMI. Full Linux distribution with SSH access, package managers, and a wide attack surface.
- **No container scanning**: Docker images were built and deployed without any vulnerability scanning. No one knew how many CVEs were in the running images.
- **Public EKS API**: The Kubernetes API server was accessible from the internet, protected only by IAM authentication.
- **No SAST**: Code was reviewed by humans, but there was no static analysis security testing in the CI pipeline.
- **Basic auth in places**: Some internal APIs used hardcoded basic authentication tokens.

Not catastrophic, but not where it needed to be — especially in a regulated environment heading toward formal security audits.

## Week 1: Host and API

### Bottlerocket OS

The first change was switching all EKS nodes from Amazon Linux to **Bottlerocket** — Amazon's purpose-built container OS.

Why Bottlerocket matters:
- **Immutable filesystem**: The root filesystem is read-only. You cannot install packages, modify system files, or do anything that a compromised container might try to do on the host.
- **No SSH**: There is no SSH daemon. You cannot shell into a Bottlerocket node in the traditional sense. Admin access is through the Bottlerocket API or SSM, both of which are auditable.
- **No package manager**: No `yum`, no `apt`, no `dnf`. This eliminates an entire class of supply chain attacks.
- **CIS Level 1 compliant out of the box**: No manual hardening required.

I rolled this out to production first (where it mattered most), then extended to staging and UAT. The migration was straightforward — update the AMI type in the node group configuration, roll the nodes, and verify workloads come back healthy.

### Sealed EKS API

I disabled public access to the EKS API endpoint and enabled private-only access. This means `kubectl` commands only work from within the VPC — which in practice means through the VPN.

This one change eliminates an entire attack vector. Even if someone has valid Kubernetes credentials, they cannot reach the API server from the internet.

## Week 2: See the Bugs

### SonarCloud in CI

I integrated **SonarCloud** directly into GitHub:

- Every pull request to main branches triggers a SonarCloud scan
- **Quality Gates are enforced**: if the scan finds security vulnerabilities, code smells above threshold, or duplications, the PR cannot be merged
- Coverage across Python, Java, JavaScript, TypeScript, Terraform, and YAML
- The SonarCloud bot comments on every PR with findings

This catches a lot of low-hanging fruit — hardcoded secrets, SQL injection patterns, XSS vulnerabilities, insecure random number usage — before code ever reaches production.

### Trivy Container Scanning

After code passes SonarCloud, the CI pipeline builds a Docker image. Before that image is deployed, **Trivy** scans it for:

- Known CVEs in OS packages
- Known CVEs in application dependencies
- Misconfigured Dockerfile patterns

The scan results are logged in the CI console. I left it in log-only mode that week, even for critical CVEs, so I could see the baseline before blocking anyone. Blocking on critical findings waited until the backlog was small enough not to freeze deploys.

## Week 3: Close the Perimeter

### WAF on Load Balancers

With all applications behind proper AWS Application Load Balancers (internal for backend services, external for public-facing APIs), I enabled **AWS WAF** on the external-facing ALBs:

- AWS managed rule sets for common attack patterns (SQLi, XSS, known bad inputs)
- Rate-based rules in **COUNT mode** first — to understand traffic patterns without accidentally blocking legitimate requests
- A few days of counts, then BLOCK mode with tuned thresholds before the external test in week 4

### Branch Protection

On the code side, I enforced stricter branch protection rules:

- Minimum of 2 PR approvals required before merging to main branches
- Only designated lead developers can merge to production branches
- All status checks (SonarCloud, CI build, Trivy scan) must pass

### Dockerfile Hardening

I audited the Dockerfiles across all services and standardized on a hardening approach:

- Use specific base image tags (no `latest`)
- Run `apt-get update && apt-get upgrade` in the build to pick up security patches
- Run as non-root user where possible
- Remove unnecessary packages and tools from the final image

I also evaluated distroless images and Docker Hardened Images (from dhi.io), but for most of our stack, the `apt upgrade` approach provided the best balance of security improvement and developer friction.

## Week 4: Keys, Upgrade, and the External Test

### Access Keys to IRSA

This was the most impactful change, and I kept it for the last week so the nodes, the API, and the scanners were already in place.

**The problem**: Every application that needed to talk to AWS services (S3, DynamoDB, SQS, Kinesis, etc.) had its own set of static access keys. These keys:
- Were long-lived (some had never been rotated)
- Had overly broad permissions (often `s3:*` or worse)
- Were stored in environment variables, sometimes committed to code

**The solution**: **IAM Roles for Service Accounts (IRSA)** — each Kubernetes ServiceAccount gets mapped to a specific IAM role with scoped-down permissions.

The migration for each application looked like this:

1. Create an IAM role with a trust policy that allows the EKS OIDC provider to assume it
2. Scope the role's permissions to exactly what the application needs (e.g., read/write to specific S3 buckets, specific DynamoDB tables)
3. Create a Kubernetes ServiceAccount annotated with the IAM role ARN
4. Update the application's deployment to use the new ServiceAccount
5. Verify the application works with the new role
6. Revoke the old access keys

I started with Python applications (simpler AWS SDK configuration) and moved to Java apps next. While that cutover was in progress, I added VPC-restricted policies to the old access keys — so even if they leaked, they could only be used from within the VPC.

After the applications were migrated, I revoked the old bot access keys and deployed the **Pod Identity Agent** as the long-term replacement for IRSA annotations.

### Cluster Upgrade

Upgraded EKS from v1.30 to v1.31 across all environments. The process:

1. **Staging first**: Upgrade the cluster version, then upgrade addons (CoreDNS, kube-proxy, VPC CNI — each has a compatibility matrix with the cluster version), then roll nodes with new AMIs.
2. **UAT next**: Same process, verify with integration tests.
3. **Production last**: Same process, with a maintenance window and rollback plan.

The trickiest part is the **addon version matrix**. Each EKS version has specific compatible versions for each addon. I pinned addon versions explicitly in Terraform to avoid surprises.

### Final Cleanup

- Patched Docker images across multiple services for Trivy findings
- Removed hardcoded credentials that SonarCloud flagged
- Updated security headers on frontend applications (HSTS, CSP, XSS protection)
- Completed an external **VAPT** (Vulnerability Assessment and Penetration Testing) — the security posture had improved significantly from the starting point

## The Result

| Area | Before | After |
|------|--------|-------|
| Node OS | Amazon Linux 2 | Bottlerocket (CIS L1) |
| Container scanning | None | Trivy in every CI build |
| SAST | None | SonarCloud on every PR |
| Access keys | Static, long-lived | IRSA / Pod Identity |
| EKS API | Public | Private (VPN-only) |
| WAF | None | AWS WAF on all external ALBs |
| Branch protection | Optional reviews | Enforced 2+ reviews + all checks |
| External assessment | Poor | Significantly improved |

## What I Would Tell Someone Starting This

1. **Week 1 is the node OS and the API.** Bottlerocket plus a private endpoint removes two whole attack surfaces before you touch application code.
2. **Week 2 is visibility.** Run SonarCloud and Trivy in log-only mode first. Understand the baseline before you start blocking deployments.
3. **Week 4 is IRSA.** It is the biggest improvement on EKS. Do it last, one service at a time, and VPC-restrict the old keys until each revoke lands.
4. **Security is not a project, it is a habit.** After that month, I still review findings weekly and patch as needed. The goal is continuous improvement, not a one-time checkbox.

For step-by-step guides on each of these hardening techniques, check out the [EKS Security Hardening Guide](/docs/eks-security-hardening) in the docs.
