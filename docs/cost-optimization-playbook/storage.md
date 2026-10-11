---
sidebar_position: 3
---

# Storage Cost Optimization

Storage costs grow silently. Unlike compute, you rarely get alerts about storage spend because each individual item is cheap — but they accumulate.

## GP2 to GP3 Migration

**GP3** volumes offer better baseline performance (3,000 IOPS, 125 MB/s throughput) at a lower price than GP2. There is almost no reason to keep GP2 volumes.

### How to Migrate

AWS supports online volume type modification — no downtime, no detach/reattach:

1. Go to EC2 → Volumes (or use the CLI)
2. Select a GP2 volume
3. Modify → Change type to GP3
4. The modification happens in the background

For bulk changes, script it:

```bash
aws ec2 describe-volumes \
  --filters Name=volume-type,Values=gp2 \
  --query 'Volumes[*].VolumeId' --output text | \
while read vol; do
  aws ec2 modify-volume --volume-id "$vol" --volume-type gp3
done
```

### Savings

A 100 GB GP2 volume: ~$10/month
A 100 GB GP3 volume: ~$8/month (with better baseline performance)

20% savings with zero effort. At scale (hundreds of volumes), this adds up quickly.

## S3 Intelligent Tiering

For S3 buckets where you are not sure about access patterns, **Intelligent Tiering** automatically moves objects between tiers based on access frequency:

- Frequently accessed → Standard (no change)
- Not accessed for 30 days → Infrequent Access (40% cheaper)
- Not accessed for 90 days → Archive Instant Access (68% cheaper)

### How to Enable

Add a lifecycle configuration to the bucket:

```json
{
  "Rules": [
    {
      "ID": "intelligent-tiering",
      "Status": "Enabled",
      "Filter": {},
      "Transitions": [
        {
          "Days": 0,
          "StorageClass": "INTELLIGENT_TIERING"
        }
      ]
    }
  ]
}
```

There is a small monitoring fee per object ($0.0025 per 1,000 objects/month), but for most buckets the savings far outweigh this.

## EBS Volume Cleanup

### Orphaned Volumes

When EKS nodes are terminated (e.g., during a node group update or Karpenter consolidation), the EBS volumes attached to them may not be automatically deleted — depending on the `DeleteOnTermination` setting.

Check for unattached volumes:

```bash
aws ec2 describe-volumes \
  --filters Name=status,Values=available \
  --query 'Volumes[*].{ID:VolumeId,Size:Size,Created:CreateTime}' \
  --output table
```

Review and delete volumes that have been in `available` state for more than a few days.

### Old Snapshots

EBS snapshots are cheap per GB but can accumulate over years. Audit snapshots older than your retention policy and delete what is no longer needed.

## Multipart Upload Cleanup

When S3 multipart uploads are initiated but never completed (due to client crashes, network failures, or bugs), the parts remain in the bucket and incur storage charges. You cannot see them in the S3 console — they are hidden.

Add a lifecycle rule to abort incomplete multipart uploads:

```json
{
  "Rules": [
    {
      "ID": "abort-incomplete-multipart",
      "Status": "Enabled",
      "Filter": {},
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    }
  ]
}
```

This should be on every S3 bucket by default.

## S3 Bucket Archival

For buckets containing old backups, exports, or data that is kept "just in case":

- **Glacier Instant Retrieval**: Same millisecond access as Standard, 68% cheaper. Good for data accessed once a quarter.
- **Glacier Flexible Retrieval**: Minutes to hours retrieval, 70%+ cheaper. Good for compliance archives.
- **Glacier Deep Archive**: 12+ hour retrieval, cheapest option. Good for data you hope you never need.

Set lifecycle rules to automatically transition objects to the appropriate tier based on age.
