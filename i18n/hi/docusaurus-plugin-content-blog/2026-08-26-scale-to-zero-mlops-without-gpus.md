---
slug: scale-to-zero-mlops-without-gpus
title: "EKS पर Scale-to-Zero Preprocessing और Private Bedrock"
authors: [tanmay]
tags: [mlops, kubernetes, aws, cost]
unlisted: true
---

Preprocessing CPU पर memory spike है। Bedrock एक private API call है — उन models के लिए जिन्हें हम ख़ुद host नहीं करते। इनमें से किसी को GPU node नहीं चाहिए।

GPU path — Spot waterfalls, NVFP4, और sub-60-second cold starts — [Scale-to-Zero MLOps on EKS](/blog/scale-to-zero-mlops-on-eks) में है।

{/* truncate */}

वही event-driven idea, दूसरा hardware। Replica count अब भी KEDA के पास। Nodes अब भी Karpenter के पास। Signal queue depth है, और nodes memory-optimized workers हैं, `g6e` नहीं।

## Data-heavy काम के लिए SQS burst-pool

Preprocessing memory-heavy और spiky है। Producers काम **SQS** पर डालते हैं; KEDA queue depth पढ़कर **r8i-flex** workers scale करता है। Queue खाली तो workers zero।

```yaml
triggers:
  - type: aws-sqs-queue
    metadata:
      queueURL: https://sqs.region.amazonaws.com/acct/preprocess
      queueLength: "10"
      awsRegion: ap-south-1
```

| Traffic shape | Scaler | Capacity |
|---|---|---|
| Spiky / async preprocessing | SQS depth + Karpenter Spot | r8i-flex |

## बिना public internet के Bedrock

**Amazon Bedrock** तक **VPC interface endpoints** से private connectivity। Inference payloads AWS network पर रहते हैं। जो models हम ख़ुद operate नहीं करना चाहते, उनके लिए self-hosted GPU path के बगल में।

## Security baseline

AWS से बात करने वाले हर EKS workload पर **IRSA**। Queue workers में कोई `AKIA*` keys नहीं। वही pattern जो [EKS stack harden](/blog/hardening-eks-stack-6-months) करते समय इस्तेमाल किया।

## Trade-offs (scars)

| Choice | Flex | Scar | Mitigation |
|---|---|---|---|
| SQS workers zero तक | Idle preprocess spend नहीं | पहला job scale-up भरता है | Queue length threshold; Spot r8i-flex |
| Local manifests | तेज़ ship | Bus factor = 1 | Terraform + GitOps (Argo CD / Flux) exit है |

Local YAML ने इस तरफ़ को खड़ा किया। Bus-factor-of-one नहीं चलता। ईमानदार अगला कदम Terraform plus GitOps है।

## Checklist

1. **Workers queue depth से scale करो**, idle process के CPU से नहीं। खाली SQS का मतलब zero `r8i-flex` replicas।
2. **Workers पर IRSA।** Queue consumers static keys की जगह नहीं हैं।
3. **GitOps migration प्लान करो।** Laptop folder के manifests MLOps platform नहीं हैं।

Personal sandbox AWS पर चलता है, **Restic** backups S3 और local NVMe पर।
