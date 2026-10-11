---
sidebar_position: 3
---

# Network Security

Network-level controls determine करते हैं कि cluster तक कौन पहुँच सकता है और traffic कहाँ flow होता है।

## Private EKS API Endpoint

Default में, EKS API server public internet से accessible है। Valid credentials वाला कोई भी दुनिया में कहीं से भी `kubectl` commands चला सकता है।

### कैसे Lock Down करें

Public access disable करो और private-only enable करो:

```hcl
resource "aws_eks_cluster" "main" {
  # ...
  vpc_config {
    endpoint_private_access = true
    endpoint_public_access  = false
  }
}
```

इस बदलाव के बाद, `kubectl` सिर्फ़ VPC के अंदर से काम करता है — practice में VPN से।

### Operationally इसका मतलब

- Developers को `kubectl` commands चलाने के लिए VPN पर होना ज़रूरी
- CI/CD pipelines VPC के अंदर चलनी चाहिए (जैसे EKS-hosted CI runners, या VPC-connected build agents)
- Emergency access के लिए VPN connectivity चाहिए — VPN resilient होना ensure करो

## Application Load Balancers पर WAF

AWS WAF external-facing APIs को common web attacks से protect करता है।

### क्या Enable करें

1. **AWS Managed Rule Groups** (इनसे शुरू करो):
   - `AWSManagedRulesCommonRuleSet` — SQLi, XSS, path traversal cover करता है
   - `AWSManagedRulesKnownBadInputsRuleSet` — known malicious patterns block करता है
   - `AWSManagedRulesSQLiRuleSet` — SQL injection specific rules

2. **Rate-based rules**:
   - **COUNT mode** में शुरू करो traffic patterns समझने के लिए
   - कुछ हफ़्तों बाद, tuned thresholds के साथ **BLOCK mode** में switch करो
   - अलग-अलग URL paths के लिए अलग thresholds (login endpoints को static assets से stricter limits चाहिए)

3. **Geographic restrictions** (अगर applicable हो):
   - उन regions से traffic block करो जहाँ users नहीं हैं
   - Automated scanners से noise कम करता है

### Deployment

WAF ALB से Kubernetes Ingress resource में annotations या AWS console / Terraform से attach होता है:

```hcl
resource "aws_wafv2_web_acl_association" "main" {
  resource_arn = aws_lb.external.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}
```

### Internal vs External Split

- **External ALBs**: Internet-facing, WAF enabled, public APIs serve करते हैं
- **Internal ALBs**: VPC-only, VPN से accessible, dashboards और internal services serve करते हैं

Internal ALBs को WAF नहीं चाहिए क्योंकि internet से reachable नहीं हैं। यह split यह भी clear करता है कि कौन सी services public-facing हैं (और इसलिए stricter security review चाहिए)।

## Security Groups

### Principle of Least Privilege

- **Node security group**: Inbound सिर्फ़ ALB security group और cluster security group से allow करो। कोई direct internet inbound नहीं।
- **ALB security group**: Internet से inbound (external ALBs के लिए) या VPN CIDR से (internal ALBs के लिए) allow करो।
- **Database security group**: Inbound सिर्फ़ node security group से allow करो। Databases को कभी direct internet access मत दो।

### VPN Access

अगर OpenVPN या similar VPN solution इस्तेमाल करते हो, VPN CIDR इनमें allow होना चाहिए:
- Internal ALB security groups (ताकि VPN users internal tools access कर सकें)
- EKS API security group (अगर private-only endpoint नहीं इस्तेमाल कर रहे)
- Database security groups (admin debugging access के लिए, अगर ज़रूरत हो)
