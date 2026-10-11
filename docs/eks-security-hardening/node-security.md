---
sidebar_position: 1
---

# Node Security

The EKS node OS is the foundation of your cluster's security posture. A compromised node means a compromised cluster.

## Bottlerocket OS

[Bottlerocket](https://aws.amazon.com/bottlerocket/) is Amazon's purpose-built container OS. It is the single most impactful change you can make to node security.

### Why Bottlerocket

| Feature | Amazon Linux 2 | Bottlerocket |
|---------|----------------|-------------|
| Root filesystem | Read-write | **Read-only (immutable)** |
| SSH access | Enabled by default | **No SSH daemon** |
| Package manager | yum | **None** |
| CIS Level 1 | Manual hardening required | **Compliant out of the box** |
| Update model | yum update | **Atomic image-based updates** |
| Shell access | Full bash | **Admin container (auditable)** |

### How to Deploy

#### With Managed Node Groups (Terraform)

```hcl
resource "aws_eks_node_group" "main" {
  # ...
  ami_type = "BOTTLEROCKET_x86_64"
  # For ARM/Graviton:
  # ami_type = "BOTTLEROCKET_ARM_64"
}
```

#### With Karpenter

In your `EC2NodeClass`, specify Bottlerocket as the AMI family:

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

If you need to debug a Bottlerocket node, use the SSM-based admin container:

```bash
aws ssm start-session --target i-0123456789abcdef0
```

This is logged and auditable — unlike SSH, which often has no audit trail.

## AMI Management

### Pin AMI Versions in Production

Do not use `latest` AMIs in production node groups. Pin to a specific AMI version and update deliberately:

```yaml
amiSelectorTerms:
  - alias: bottlerocket@v1.25.0
```

### Refresh Strategy During Upgrades

When upgrading EKS versions, nodes need new AMIs that support the target version:

1. Update the AMI selector to the new version
2. Cordon old nodes
3. Drain pods (with PodDisruptionBudgets respected)
4. Terminate old nodes
5. Karpenter or the managed node group controller launches new nodes with the updated AMI

## No SSH — Ever

Do not add SSH keys to your EKS nodes. If you need debugging access:

- **SSM Session Manager**: Interactive shell access, fully logged to CloudTrail
- **`kubectl debug`**: Ephemeral debug containers attached to running pods
- **`kubectl exec`**: Direct shell access to a running container

SSH keys are a persistent credential that can be stolen, shared, and used without audit trails. SSM is the replacement.
