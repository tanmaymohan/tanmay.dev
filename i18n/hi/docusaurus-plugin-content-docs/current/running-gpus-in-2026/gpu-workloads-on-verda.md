---
sidebar_position: 2
sidebar_label: Verda (B200/B300)
---

import ImageLightbox from '@site/src/components/ImageLightbox';

# B200 या B300 GPU पर GPU वर्कलोड कैसे चलाएं

आइए देखें **Verda (पहले DataCrunch) पर GPU workloads कैसे चलाएं**।

## शुरू करें

Verda एक Finland-based hyperscaler है जहां B300, B200, H200, H100 और RTX Pro 6000 जैसे नए NVIDIA GPUs उपलब्ध हैं। अगर आपको high-end GPU capacity चाहिए, तो यह अच्छा विकल्प है।

शुरू करने के लिए https://console.verda.com पर अकाउंट बनाएं। पहली बार उपयोग के लिए account top-up (उदा. $20) की जरूरत हो सकती है।

### क्या चाहिए

- [Verda अकाउंट](https://console.verda.com)
- SSH public key
- Linux/SSH की बेसिक समझ

## GPU instance लॉन्च करें

1. Verda console में नया instance बनाएं।
2. Pricing mode चुनें:
   - **Spot** — कम लागत, लेकिन interruption संभव
   - **On-demand** — ज्यादा स्थिर, पर कीमत अधिक
3. जरूरत के अनुसार GPU type चुनें (उदा. B300, B200, H200, H100, A100, RTX Pro 6000, L4)।
4. Node settings configure करें:
   - SSH key
   - OS image (उदा. Ubuntu + CUDA)
   - Storage और network settings
5. Instance launch करें और running state का इंतजार करें।
6. SSH से connect करके GPU verify करें:

```bash
nvidia-smi
```

## लागत कम करने के तरीके

- Non-critical workloads के लिए spot instances उपयोग करें
- Production या long-running jobs के लिए on-demand लें
- जरूरत से बड़ा GPU न चुनें
- Idle instances बंद करके hourly cost कम करें

## Screenshots

नीचे प्रक्रिया समझने के लिए screenshots दिए गए हैं:

<ImageLightbox images={[
  { src: '/img/verda/verda-console.png', alt: 'Verda Console Dashboard', caption: 'Verda Console Dashboard' },
  { src: '/img/verda/configure-instance.png', alt: 'Instance Configuration', caption: 'Instance Configuration' },
  { src: '/img/verda/running-instance.png', alt: 'Running instance', caption: 'Running instance' },
  { src: '/img/verda/nvidia-smi-verda.png', alt: 'NVIDIA-SMI', caption: 'Running nvidia-smi command on instance' },
  { src: '/img/verda/running-benchmark.png', alt: 'Sample docker benchmark details', caption: 'Sample docker benchmark details' },
]} />
