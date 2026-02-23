---
sidebar_position: 1
sidebar_label: Brev (NVIDIA)
---

import ImageLightbox from '@site/src/components/ImageLightbox';

# Brev by NVIDIA पर GPU वर्कलोड कैसे चलाएं

आइए देखें **Brev by NVIDIA का उपयोग करके जल्दी से GPU workloads कैसे चलाएं**।

## शुरू करें

Brev, NVIDIA का क्लाउड प्लेटफॉर्म है जो कई cloud providers पर GPU environments जल्दी लॉन्च करने में मदद करता है। इसमें CUDA, Python और JupyterLab जैसे टूल्स अक्सर पहले से configured मिलते हैं, इसलिए setup समय कम लगता है।

शुरू करने के लिए https://login.brev.nvidia.com/signin पर अकाउंट बनाएं या https://brev.dev/ पर और जानकारी देखें।

### क्या चाहिए

- [Brev अकाउंट](https://login.brev.nvidia.com/signin)
- Linux/SSH की बेसिक समझ

## Brev क्यों उपयोगी है

- GPU environments जल्दी लॉन्च होते हैं
- Launchables से common workflows one-click में शुरू होते हैं
- CUDA/ML tooling अक्सर pre-configured मिलता है
- Browser, CLI, SSH और VS Code जैसे कई access options उपलब्ध हैं

## GPU environment लॉन्च करें

1. [Brev Console](https://login.brev.nvidia.com/signin) में sign in करें। शुरू करने के लिए NVIDIA account (Developer/NGC) चाहिए।

2. तय करें कि workload किस मोड में चलाना है:
   - **GPU Environments** — फाइन-ट्यूनिंग, ट्रेनिंग और AI/ML मॉडल डिप्लॉय करने के लिए NVIDIA GPUs के साथ पूर्ण VM एक्सेस (ब्राउज़र नोटबुक, CLI या SSH)।
   - **Launchables** — one-click में pre-configured GPU environments।
   - **Deployments** — NVIDIA NIM आधारित मॉडल एक क्लिक में deploy करें।

3. GPU type और region चुनें। Brev multi-cloud capacity देता है, इसलिए options region के हिसाब से बदल सकते हैं।

4. Environment configure करें: SSH keys, storage और जरूरत अनुसार custom settings।

5. Environment launch करें और ready होने तक इंतजार करें।

6. Environment से connect करें:
   - **SSH/CLI**: [Brev CLI](https://docs.nvidia.com/brev/latest/) इंस्टॉल करने के बाद `brev shell`
   - **VS Code**: project खोलने के लिए `brev open`

7. (वैकल्पिक) connect होने के बाद system packages अपडेट करें:

```bash
sudo apt update && sudo apt upgrade -y
```

## GPU verify करें

यह command चलाएं:

```bash
nvidia-smi
```

अगर setup सही है तो GPU model, driver और CUDA जानकारी दिखेगी।

## लागत कम करने के तरीके

- शुरुआत छोटे GPU (जैसे L4) से करें
- Idle environments stop या delete करें
- Storage जरूरत के हिसाब से रखें
- Quick prototyping के लिए Launchables, और advanced use के लिए custom environments चुनें

## Screenshots

नीचे कुछ screenshots दिए गए हैं:

<ImageLightbox images={[
  { src: '/img/brev/console-dashboard.png', alt: 'Brev Console Dashboard', caption: 'Brev Console Dashboard' },
  { src: '/img/brev/example-for-launchables.png', alt: 'Launchable Examples', caption: 'Launchable Examples' },
  { src: '/img/brev/gpu-selection.png', alt: 'GPU Instance Selection', caption: 'GPU Instance Selection' },
  { src: '/img/brev/working-lab-gpu.png', alt: 'Working Lab with GPU', caption: 'Working Lab with GPU' },
]} />
