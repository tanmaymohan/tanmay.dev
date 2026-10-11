---
sidebar_position: 4
---

# Networking Cost Optimization

Networking costs on AWS are often surprising because they are invisible until you look at the bill. Data transfer, NAT Gateway charges, and cross-AZ traffic can add up to a significant portion of your monthly spend.

## VPC Endpoints

A **VPC Gateway Endpoint** for S3 and DynamoDB is free and routes traffic directly from your VPC to the service — bypassing the NAT Gateway entirely.

Without a VPC endpoint, traffic from a private subnet to S3 flows: **Pod → NAT Gateway → Internet → S3**. You pay NAT Gateway data processing charges ($0.045/GB) on every byte.

With a gateway endpoint: **Pod → S3** (direct, free).

### How to Add

```bash
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-xxx \
  --service-name com.amazonaws.ap-south-1.s3 \
  --route-table-ids rtb-xxx
```

For services like CloudWatch, Secrets Manager, ECR, and SSM, use **Interface Endpoints**. These cost ~$7/month per endpoint per AZ, but they eliminate NAT charges for those services. Whether it is worth it depends on your traffic volume — do the math for each service.

### High-Traffic Services to Consider

| Service | Endpoint Type | When it is worth it |
|---------|--------------|---------------------|
| S3 | Gateway (free) | Always |
| DynamoDB | Gateway (free) | Always |
| ECR (for image pulls) | Interface | If you pull images frequently (EKS nodes, CI/CD) |
| CloudWatch Logs | Interface | If you send high log volumes |
| Secrets Manager | Interface | If you use External Secrets Operator or frequent secret reads |
| SSM | Interface | If you use SSM for node management |

## NAT Gateway Costs

NAT Gateways charge for:
- **Hourly running cost**: ~$0.045/hour (~$32/month per NAT GW)
- **Data processing**: $0.045/GB for all data that passes through

If you run one NAT Gateway per AZ (a common HA pattern), that is ~$96/month just for the NAT Gateways — before any data charges.

### How to Reduce

1. **Add gateway endpoints** for S3 and DynamoDB (see above)
2. **Audit NAT traffic**: Use VPC Flow Logs to understand what traffic is flowing through the NAT. You may find services making unexpected external calls.
3. **Consider a single NAT Gateway**: For non-production environments, one NAT Gateway in a single AZ is often sufficient. The HA trade-off is acceptable for staging.
4. **Use VPC endpoints for high-traffic interface services**: ECR image pulls can generate significant NAT traffic on EKS clusters.

## Cross-AZ Traffic

Data transferred between Availability Zones costs $0.01/GB in each direction ($0.02/GB round trip). This is unavoidable for HA deployments, but you can minimize it:

- **Deploy services in the same AZ when possible**: If two services communicate heavily, consider topology-aware routing or affinity rules to prefer same-AZ communication.
- **Use topology-aware hints in Kubernetes**: Kubernetes supports topology-aware routing that prefers same-zone endpoints.
- **Size cross-AZ backups carefully**: Cross-region backup replication is useful for DR but generates ongoing data transfer costs. Only enable it for data that truly needs geographic redundancy.
