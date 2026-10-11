---
sidebar_position: 3
---

# Storage Cost Optimization

Storage costs चुपचाप बढ़ते हैं। Compute के विपरीत, storage spend पर alerts शायद ही कभी आते हैं क्योंकि हर individual item सस्ता होता है — लेकिन ये जमा होते रहते हैं।

## GP2 से GP3 Migration

**GP3** volumes कम कीमत पर GP2 से better baseline performance (3,000 IOPS, 125 MB/s throughput) देते हैं। GP2 volumes रखने का लगभग कोई कारण नहीं है।

### कैसे Migrate करें

AWS online volume type modification support करता है — कोई downtime नहीं, कोई detach/reattach नहीं:

1. EC2 → Volumes पर जाओ (या CLI इस्तेमाल करो)
2. GP2 volume select करो
3. Modify → Type GP3 में बदलो
4. Modification background में होता है

Bulk changes के लिए script करो:

```bash
aws ec2 describe-volumes \
  --filters Name=volume-type,Values=gp2 \
  --query 'Volumes[*].VolumeId' --output text | \
while read vol; do
  aws ec2 modify-volume --volume-id "$vol" --volume-type gp3
done
```

### Savings

100 GB GP2 volume: ~$10/माह
100 GB GP3 volume: ~$8/माह (better baseline performance के साथ)

Zero effort से 20% savings। Scale पर (सैकड़ों volumes), यह जल्दी बढ़ता है।

## S3 Intelligent Tiering

S3 buckets जहाँ access patterns sure नहीं हैं, **Intelligent Tiering** access frequency के आधार पर objects को अपने आप tiers के बीच move करता है:

- Frequently accessed → Standard (कोई बदलाव नहीं)
- 30 दिन access न हो → Infrequent Access (40% सस्ता)
- 90 दिन access न हो → Archive Instant Access (68% सस्ता)

### कैसे Enable करें

Bucket में lifecycle configuration add करो:

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

Per object एक छोटी monitoring fee ($0.0025 per 1,000 objects/माह) है, लेकिन ज़्यादातर buckets पर savings इससे कहीं ज़्यादा है।

## EBS Volume Cleanup

### Orphaned Volumes

जब EKS nodes terminate होते हैं (जैसे node group update या Karpenter consolidation में), attached EBS volumes automatically delete नहीं हो सकते — `DeleteOnTermination` setting पर depend करता है।

Unattached volumes check करो:

```bash
aws ec2 describe-volumes \
  --filters Name=status,Values=available \
  --query 'Volumes[*].{ID:VolumeId,Size:Size,Created:CreateTime}' \
  --output table
```

कुछ दिनों से ज़्यादा `available` state में रहे volumes review करो और delete करो।

### पुराने Snapshots

EBS snapshots per GB सस्ते हैं लेकिन सालों में जमा हो जाते हैं। Retention policy से पुराने snapshots audit करो और जो ज़रूरी नहीं delete करो।

## Multipart Upload Cleanup

जब S3 multipart uploads शुरू होते हैं लेकिन कभी complete नहीं होते (client crashes, network failures, या bugs की वजह से), parts bucket में रहते हैं और storage charges लगते हैं। ये S3 console में दिखते नहीं — hidden होते हैं।

Incomplete multipart uploads abort करने की lifecycle rule add करो:

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

यह हर S3 bucket पर default होना चाहिए।

## S3 Bucket Archival

पुराने backups, exports, या "just in case" रखे data वाले buckets के लिए:

- **Glacier Instant Retrieval**: Standard जैसा millisecond access, 68% सस्ता। Quarter में एक बार access होने वाले data के लिए अच्छा।
- **Glacier Flexible Retrieval**: Minutes से hours retrieval, 70%+ सस्ता। Compliance archives के लिए अच्छा।
- **Glacier Deep Archive**: 12+ hour retrieval, सबसे सस्ता option। ऐसे data के लिए जिसकी उम्मीद है कभी ज़रूरत न पड़े।

Age के आधार पर objects को appropriate tier में automatically transition करने के lifecycle rules set करो।
