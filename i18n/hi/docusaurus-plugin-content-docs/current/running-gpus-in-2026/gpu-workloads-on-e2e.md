---
sidebar_position: 3
sidebar_label: E2E Networks
---

# E2E पर GPU वर्कलोड कैसे चलाएं

आइए देखें **E2E Networks पर GPU workloads कैसे लॉन्च करें**।

## शुरू करें

E2E Networks, India-focused cloud provider है जहां H100/H200 जैसे GPU options उपलब्ध हैं। भारत में कम latency और region-specific deployment जरूरतों के लिए यह उपयोगी विकल्प है।

शुरू करने के लिए https://myaccount.e2enetworks.com/ पर अकाउंट बनाएं। GPU workloads आप उनके TIR AI/ML platform से चला सकते हैं।

### क्या चाहिए

- [E2E Networks अकाउंट](https://myaccount.e2enetworks.com/)
- SSH key pair
- Linux/SSH की बेसिक समझ

## GPU instance लॉन्च करें

1. Base image चुनें (उदा. Python 3.10 image)।
2. Instance name दें (उदा. `example-node`)।
3. Workload के हिसाब से GPU type चुनें (उदा. H200)।
4. Storage, SSH keys और Static IP (जरूरत हो तो) configure करें, फिर instance launch करें।
5. SSH के जरिए instance से connect करें।
6. System packages अपडेट करें:

```bash
sudo apt update && sudo apt upgrade -y
```

## GPU verify करें

Connect होने के बाद यह command चलाएं:

```bash
nvidia-smi
```

अगर setup सही है, तो GPU model, driver और CUDA details दिख जाएंगी।

## लागत कम करने के तरीके

- शुरुआत में वही GPU लें जो workload के लिए जरूरी हो
- Idle instances बंद करें
- High-tier GPU तभी चुनें जब model size या concurrency justify करे
- Runtime और storage दोनों पर नजर रखें

## Screenshots

नीचे placeholders के रूप में section रखा है; E2E screenshots जोड़ने पर इसे `ImageLightbox` से तुरंत wire कर सकते हैं।
