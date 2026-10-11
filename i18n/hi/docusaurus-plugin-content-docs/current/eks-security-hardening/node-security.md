---
sidebar_position: 1
---

# Node Security

EKS node OS cluster की security posture का foundation है। Compromised node मतलब compromised cluster।

## Bottlerocket OS

[Bottlerocket](https://aws.amazon.com/bottlerocket/) Amazon का purpose-built container OS है। Node security में सबसे impactful single change।

### Bottlerocket क्यों

| Feature | Amazon Linux 2 | Bottlerocket |
|---------|----------------|-------------|
| Root filesystem | Read-write | **Read-only (immutable)** |
| SSH access | Default enabled | **कोई SSH daemon नहीं** |
| Package manager | yum | **कोई नहीं** |
| CIS Level 1 | Manual hardening ज़रूरी | **Out of the box compliant** |
| Update model | yum update | **Atomic image-based updates** |
| Shell access | Full bash | **Admin container (auditable)** |

### कैसे Deploy करें

#### Managed Node Groups (Terraform) के साथ

```hcl
resource "aws_eks_node_group" "main" {
  # ...
  ami_type = "BOTTLEROCKET_x86_64"
  # ARM/Graviton के लिए:
  # ami_type = "BOTTLEROCKET_ARM_64"
}
```

#### Karpenter के साथ

`EC2NodeClass` में Bottlerocket AMI family specify करो:

```yaml
apiVersion: karpenter.k8s.aws/v1
kind: EC2NodeClass
spec:
  amiSelectorTerms:
    - alias: bottlerocket@latest
  blockDeviceMappings:
    - deviceName: /dev/xvda
      ebs:
        volumeSize: 150Gi
        volumeType: gp3
        encrypted: true
```

### Admin Access

Bottlerocket node debug करना हो तो SSM-based admin container इस्तेमाल करो:

```bash
aws ssm start-session --target i-0123456789abcdef0
```

यह logged और auditable है — SSH के विपरीत, जिसमें अक्सर कोई audit trail नहीं होता।

## AMI Management

### Production में AMI Versions Pin करो

Production node groups में `latest` AMIs इस्तेमाल मत करो। Specific AMI version pin करो और deliberately update करो:

```yaml
amiSelectorTerms:
  - alias: bottlerocket@v1.25.0
```

### Upgrades में Refresh Strategy

EKS versions upgrade करते समय, nodes को नए AMIs चाहिए जो target version support करें:

1. AMI selector को new version पर update करो
2. पुराने nodes cordon करो
3. Pods drain करो (PodDisruptionBudgets respect करते हुए)
4. पुराने nodes terminate करो
5. Karpenter या managed node group controller updated AMI के साथ नए nodes launch करता है

## कभी SSH नहीं

EKS nodes पर SSH keys add मत करो। Debugging access चाहिए तो:

- **SSM Session Manager**: Interactive shell access, पूरी तरह CloudTrail में logged
- **`kubectl debug`**: Running pods से attached ephemeral debug containers
- **`kubectl exec`**: Running container में direct shell access

SSH keys persistent credential हैं जो चुराई जा सकती हैं, share की जा सकती हैं, और बिना audit trails के इस्तेमाल हो सकती हैं। SSM उसकी replacement है।
