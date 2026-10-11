---
sidebar_position: 4
---

# CI/CD Security

Shifting security left into the CI/CD pipeline catches vulnerabilities before they reach production.

## The Pipeline

A secure CI/CD pipeline has multiple checkpoints:

```
Code Push → SAST Scan → PR Review → Image Build → Container Scan → Deploy
              ↓            ↓                           ↓
          SonarCloud   2+ Approvals                  Trivy
          (Quality     (Branch                    (CVE scan)
           Gate)       Protection)
```

Each checkpoint can block the pipeline if standards are not met.

## SonarCloud (SAST)

[SonarCloud](https://sonarcloud.io/) performs Static Application Security Testing on every pull request.

### What It Catches

- **Security vulnerabilities**: SQL injection, XSS, path traversal, insecure crypto
- **Hardcoded secrets**: API keys, passwords, tokens in source code
- **Code smells**: Complexity, duplication, maintainability issues
- **Security hotspots**: Code patterns that need manual security review

### How to Set Up

1. Connect your GitHub organization to SonarCloud
2. Import repositories
3. Add the SonarCloud GitHub App — it automatically scans on PRs
4. Configure **Quality Gates** with your standards:
   - Zero new security vulnerabilities
   - Zero new security hotspots (or all reviewed)
   - Code coverage above a threshold (optional)
   - Duplication below a threshold

### Enforcing Quality Gates

In GitHub, set the SonarCloud status check as **required** in branch protection rules. PRs that fail the Quality Gate cannot be merged.

### Language Support

SonarCloud covers: Python, Java, JavaScript, TypeScript, Go, C#, Kotlin, Terraform, YAML, Dockerfile, and more.

## Trivy (Container Scanning)

[Trivy](https://trivy.dev/) scans container images for known CVEs in OS packages and application dependencies.

### Integration

If you use a CI platform that supports plugins (e.g., Devtron, GitHub Actions, GitLab CI), Trivy can be added as a post-build step:

```yaml
# GitHub Actions example
- name: Scan image with Trivy
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: my-image:${{ github.sha }}
    format: table
    severity: CRITICAL,HIGH
    exit-code: 1  # Fail the build on critical/high CVEs
```

### Phased Rollout

1. **Phase 1 — Log only**: Run Trivy and log results without failing builds. Understand your CVE baseline.
2. **Phase 2 — Block on CRITICAL**: Fail builds that have critical CVEs. Fix or update base images.
3. **Phase 3 — Block on HIGH+**: Once the critical backlog is cleared, extend to high severity.

### Dockerfile Hardening

Common patterns that reduce Trivy findings:

```dockerfile
FROM python:3.12-slim

# Update OS packages to pick up security patches
RUN apt-get update && apt-get upgrade -y && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Run as non-root
RUN useradd -r -s /bin/false appuser
USER appuser

COPY --chown=appuser:appuser . /app
WORKDIR /app
```

## Branch Protection

GitHub branch protection rules enforce process:

| Rule | Purpose |
|------|---------|
| Require pull request reviews (2+) | No single person can push to production |
| Require status checks to pass | SonarCloud + Trivy + CI build must succeed |
| Restrict who can push | Only designated leads can merge to main |
| Require linear history | Prevents merge commits that can hide changes |

### How to Configure

In GitHub: Settings → Branches → Branch protection rules → Add rule for `main` (and other protected branches).

These rules should be enforced, not advisory. Enforcement means that even repository admins cannot bypass them (unless you explicitly allow it).
