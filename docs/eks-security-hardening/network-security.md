---
sidebar_position: 3
---

# Network Security

Network-level controls determine who can reach your cluster and what traffic flows where.

## Private EKS API Endpoint

By default, the EKS API server is accessible from the public internet. Anyone with valid credentials can run `kubectl` commands from anywhere in the world.

### How to Lock It Down

Disable public access and enable private-only:

```hcl
resource "aws_eks_cluster" "main" {
  # ...
  vpc_config {
    endpoint_private_access = true
    endpoint_public_access  = false
  }
}
```

After this change, `kubectl` only works from within the VPC — which in practice means through a VPN.

### What This Means Operationally

- Developers must be on the VPN to run `kubectl` commands
- CI/CD pipelines must run within the VPC (e.g., EKS-hosted CI runners, or VPC-connected build agents)
- Emergency access requires VPN connectivity — make sure your VPN is resilient

## WAF on Application Load Balancers

AWS WAF protects your external-facing APIs from common web attacks.

### What to Enable

1. **AWS Managed Rule Groups** (start with these):
   - `AWSManagedRulesCommonRuleSet` — covers SQLi, XSS, path traversal
   - `AWSManagedRulesKnownBadInputsRuleSet` — blocks known malicious patterns
   - `AWSManagedRulesSQLiRuleSet` — SQL injection specific rules

2. **Rate-based rules**:
   - Start in **COUNT mode** to understand traffic patterns
   - After a few weeks, switch to **BLOCK mode** with tuned thresholds
   - Set different thresholds per URL path (login endpoints need stricter limits than static assets)

3. **Geographic restrictions** (if applicable):
   - Block traffic from regions where you have no users
   - Reduces noise from automated scanners

### Deployment

WAF is attached to the ALB via annotations in the Kubernetes Ingress resource or through the AWS console / Terraform:

```hcl
resource "aws_wafv2_web_acl_association" "main" {
  resource_arn = aws_lb.external.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}
```

### Internal vs External Split

- **External ALBs**: Internet-facing, with WAF enabled, serving public APIs
- **Internal ALBs**: VPC-only, accessible through VPN, serving dashboards and internal services

Internal ALBs do not need WAF because they are not reachable from the internet. This split also makes it clearer which services are public-facing (and therefore need stricter security review).

## Security Groups

### Principle of Least Privilege

- **Node security group**: Allow inbound only from the ALB security group and the cluster security group. No direct internet inbound.
- **ALB security group**: Allow inbound from the internet (for external ALBs) or from the VPN CIDR (for internal ALBs).
- **Database security group**: Allow inbound only from the node security group. Never allow direct internet access to databases.

### VPN Access

If you use OpenVPN or a similar VPN solution, the VPN CIDR should be allowed in:
- Internal ALB security groups (so VPN users can access internal tools)
- EKS API security group (if not using private-only endpoint)
- Database security groups (for admin debugging access, if needed)
