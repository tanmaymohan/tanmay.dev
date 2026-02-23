---
sidebar_position: 4
sidebar_label: AWS
---

import ImageLightbox from '@site/src/components/ImageLightbox';

# AWS पर GPU वर्कलोड कैसे चलाएं

आइए देखें **Amazon Web Services (EC2) पर GPU इंस्टेंस कैसे लॉन्च और उपयोग करें**।

## शुरू करें

AWS दुनिया के सबसे बड़े क्लाउड प्लेटफॉर्म में से एक है और AI/ML ट्रेनिंग, इंफेरेंस, HPC और ग्राफिक्स के लिए कई GPU EC2 इंस्टेंस फैमिलीज देता है।

AWS में आमतौर पर उपलब्ध GPU विकल्प:

A10G, A100, H100, H200, L4, L40S, B200, T4, RTX PRO आदि।

> **टिप**: अगर आप शुरुआत कर रहे हैं, तो **T4** या **L4** से शुरू करें। छोटे प्रयोग और इंफेरेंस के लिए यह ज्यादा किफायती रहते हैं।

### क्या चाहिए

- Billing-enabled [AWS अकाउंट](https://aws.amazon.com/)
- GPU instances के लिए service quota increase (नए अकाउंट में अक्सर 0 quota होता है)
- Target region में SSH key pair
- AWS Console या CLI की बेसिक समझ

## Availability

AWS regions में GPU और instance availability काफी बदलती रहती है। किसी एक region में capacity मिल सकती है और दूसरे में नहीं। उदाहरण के लिए `g7e.2xlarge` जैसे नए GPU instances कुछ ही regions में उपलब्ध होते हैं। `ap-south-1` (Mumbai) में `g6.xlarge` जैसी L4 capacity अच्छी मिल सकती है, लेकिन spot capacity सीमित हो सकती है।

Instance availability देखने के लिए:
https://docs.aws.amazon.com/ec2/latest/instancetypes/ec2-instance-regions.html

## GPU quota बढ़ाएं (महत्वपूर्ण)

GPU instance launch करने से पहले quota बढ़ाना जरूरी है:

1. [Service Quotas console](https://console.aws.amazon.com/servicequotas/) खोलें
2. **Amazon Elastic Compute Cloud (Amazon EC2)** खोजें
3. अपनी instance family के अनुसार quota चुनें:
   - *Running On-Demand G and VT instances* (G5/G6)
   - *Running On-Demand P instances* (P3/P4/P5)
4. **Request increase at account level** पर क्लिक करें
5. जरूरी vCPU value भरें और approval का इंतजार करें

## GPU instance लॉन्च करें

### Option 1: AWS Console (UI)

1. [EC2 Console](https://console.aws.amazon.com/ec2/) में sign in करें
2. **Launch Instance** पर क्लिक करें
3. Instance name दें (उदा. `gpu-workload-test`)
4. AMI चुनें:
   - **AWS Deep Learning AMI (Ubuntu)** (सबसे आसान)
   - **NVIDIA GPU-Optimized AMI**
   - या plain Ubuntu और manual driver setup
5. Instance type चुनें (उदा. `g6.xlarge`)
6. Key pair चुनें/बनाएं
7. Security group में SSH (port 22) allow करें
8. अगर Session Manager उपयोग कर रहे हैं, तो `AmazonSSMManagedInstanceCore` policy वाला IAM role attach करें
9. Root volume को कम से कम 100 GB रखें
10. **Launch Instance** करें

कनेक्ट होने के बाद (वैकल्पिक) पैकेज अपडेट:

```bash
sudo apt update && sudo apt upgrade -y
```

> Ubuntu AMI के लिए username `ubuntu` और Amazon Linux के लिए `ec2-user` उपयोग करें।

## GPU verify करें

SSH या Session Manager से कनेक्ट होकर यह चलाएं:

```bash
nvidia-smi
```

आपको GPU model, driver version और CUDA version दिखना चाहिए।

<ImageLightbox images={[
  { src: '/img/aws/aws-terminal.png', alt: 'AWS Session Manager', caption: 'AWS Session Manager' },
  { src: '/img/aws/benchmark.png', alt: 'Example Run', caption: 'Example Run' },
]} />

## लागत कम करने के तरीके

- **Spot Instances** का उपयोग करें (fault-tolerant workloads के लिए)
- काम न होने पर instances stop करें
- जरूरत से बड़ा GPU न लें
- Predictable usage हो तो Savings Plans देखें
- सही region चुनें (pricing और capacity region-wise बदलती है)

## अन्य providers से तुलना

AWS के फायदे:

- बहुत बड़ा ecosystem (S3, SageMaker, EKS)
- ज्यादा instance variety
- global availability

चुनौतियां:

- baseline cost कुछ providers से ज्यादा हो सकती है
- quota approval में समय लग सकता है
- setup steps थोड़ा ज्यादा हो सकते हैं
