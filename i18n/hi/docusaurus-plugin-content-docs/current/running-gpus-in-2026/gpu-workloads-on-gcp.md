---
sidebar_position: 5
sidebar_label: Google Cloud (GCP)
---

# Google Cloud (GCP) पर GPU वर्कलोड कैसे चलाएं

आइए देखें **Google Cloud Platform (GCP) पर GPU workloads कैसे लॉन्च करें**।

## शुरू करें

GCP में आप Compute Engine पर GPU VMs चला सकते हैं और managed AI workflows के लिए Vertex AI का उपयोग कर सकते हैं। Region और quota के अनुसार T4, L4, A100, H100 जैसे GPUs उपलब्ध होते हैं।

### क्या चाहिए

- Billing-enabled [Google Cloud अकाउंट](https://cloud.google.com/)
- Target region में GPU quota
- SSH access (या browser-based SSH)
- Linux/CLI की बेसिक समझ

## GPU quota अनुरोध करें

GPU VM बनाने से पहले quotas बढ़ाएं:

- `GPUS_ALL_REGIONS`
- Target region में specific GPU family quotas (L4, A100, H100 आदि)

GCP Console में जाएं: **IAM & Admin -> Quotas** और अपने project के लिए increase request भेजें।

## Compute Engine पर GPU VM लॉन्च करें

1. **Compute Engine -> VM instances -> Create instance** खोलें
2. Region/zone चुनें (GPU availability के हिसाब से)
3. **Machine configuration** में GPU add करें (उदा. 1x L4 या 1x A100)
4. OS image चुनें:
   - Deep Learning VM image (quick start)
   - Ubuntu + manual NVIDIA driver setup
5. Boot disk size 100 GB+ रखें
6. SSH enable करके VM create करें

## GPU verify करें

VM में login करके चलाएं:

```bash
nvidia-smi
```

अगर preinstalled drivers नहीं हैं, तो NVIDIA drivers install करके VM reboot करें।

## लागत कम करने के तरीके

- Dev/test के लिए छोटे GPU से शुरू करें
- Idle VMs stop करें
- Fault-tolerant workloads के लिए spot/preemptible VMs उपयोग करें
- Pricing और availability के हिसाब से region चुनें
