---
sidebar_position: 4
---

# CI/CD Security

Security को CI/CD pipeline में left shift करने से vulnerabilities production पहुँचने से पहले पकड़ में आती हैं।

## Pipeline

एक secure CI/CD pipeline में multiple checkpoints होते हैं:

```
Code Push → SAST Scan → PR Review → Image Build → Container Scan → Deploy
              ↓            ↓                           ↓
          SonarCloud   2+ Approvals                  Trivy
          (Quality     (Branch                    (CVE scan)
           Gate)       Protection)
```

हर checkpoint pipeline block कर सकता है अगर standards पूरे नहीं होते।

## SonarCloud (SAST)

[SonarCloud](https://sonarcloud.io/) हर pull request पर Static Application Security Testing करता है।

### क्या पकड़ता है

- **Security vulnerabilities**: SQL injection, XSS, path traversal, insecure crypto
- **Hardcoded secrets**: Source code में API keys, passwords, tokens
- **Code smells**: Complexity, duplication, maintainability issues
- **Security hotspots**: Code patterns जिन्हें manual security review चाहिए

### कैसे Set Up करें

1. GitHub organization को SonarCloud से connect करो
2. Repositories import करो
3. SonarCloud GitHub App add करो — PRs पर automatically scan होता है
4. अपने standards के साथ **Quality Gates** configure करो:
   - Zero new security vulnerabilities
   - Zero new security hotspots (या सब reviewed)
   - Code coverage threshold से ऊपर (optional)
   - Duplication threshold से नीचे

### Quality Gates Enforce करना

GitHub में, branch protection rules में SonarCloud status check को **required** set करो। Quality Gate fail होने वाले PRs merge नहीं हो सकते।

### Language Support

SonarCloud cover करता है: Python, Java, JavaScript, TypeScript, Go, C#, Kotlin, Terraform, YAML, Dockerfile, और ज़्यादा।

## Trivy (Container Scanning)

[Trivy](https://trivy.dev/) container images को OS packages और application dependencies में known CVEs के लिए scan करता है।

### Integration

अगर CI platform plugins support करता है (जैसे Devtron, GitHub Actions, GitLab CI), Trivy post-build step के रूप में add हो सकता है:

```yaml
# GitHub Actions example
- name: Scan image with Trivy
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: my-image:${{ github.sha }}
    format: table
    severity: CRITICAL,HIGH
    exit-code: 1  # Critical/high CVEs पर build fail करो
```

### Phased Rollout

1. **Phase 1 — सिर्फ़ Log**: Trivy चलाओ और builds fail किए बिना results log करो। CVE baseline समझो।
2. **Phase 2 — CRITICAL पर Block**: Critical CVEs वाली builds fail करो। Base images fix या update करो।
3. **Phase 3 — HIGH+ पर Block**: Critical backlog clear होने के बाद, high severity तक extend करो।

### Dockerfile Hardening

Common patterns जो Trivy findings कम करते हैं:

```dockerfile
FROM python:3.12-slim

# Security patches pick up करने के लिए OS packages update
RUN apt-get update && apt-get upgrade -y && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Non-root के रूप में run
RUN useradd -r -s /bin/false appuser
USER appuser

COPY --chown=appuser:appuser . /app
WORKDIR /app
```

## Branch Protection

GitHub branch protection rules process enforce करती हैं:

| Rule | Purpose |
|------|---------|
| Pull request reviews (2+) ज़रूरी | कोई single person production में push नहीं कर सकता |
| Status checks pass होने चाहिए | SonarCloud + Trivy + CI build succeed होने चाहिए |
| Push करने पर restriction | सिर्फ़ designated leads main में merge कर सकते हैं |
| Linear history ज़रूरी | Merge commits prevent करता है जो changes hide कर सकते हैं |

### कैसे Configure करें

GitHub में: Settings → Branches → Branch protection rules → `main` (और अन्य protected branches) के लिए rule add करो।

ये rules enforced होनी चाहिए, advisory नहीं। Enforcement मतलब repository admins भी bypass नहीं कर सकते (जब तक explicitly allow न करो)।
