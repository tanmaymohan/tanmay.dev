---
sidebar_position: 6
sidebar_label: Local Machine
---

# अपनी लोकल मशीन पर GPU वर्कलोड कैसे चलाएं

आइए देखें **अपनी workstation/desktop मशीन पर GPU workloads कैसे चलाएं**।

## शुरू करें

लोकल मशीन पर GPU चलाना development, testing और छोटे inference workloads के लिए बहुत उपयोगी है। इससे जल्दी iteration होता है और cloud hourly billing का दबाव भी नहीं रहता।

### क्या चाहिए

- NVIDIA GPU (8 GB+ VRAM recommended; बड़े models के लिए 16 GB+ बेहतर)
- नया NVIDIA driver
- Linux (recommended) या Windows + WSL2
- Docker (वैकल्पिक, लेकिन recommended)

## Setup steps

1. NVIDIA driver install/update करें
2. GPU detect हो रहा है या नहीं verify करें:

```bash
nvidia-smi
```

3. Python virtual environment बनाएं:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
```

4. CUDA support वाला ML framework install करें (उदा. PyTorch)
5. Python से CUDA verify करें:

```bash
python3 -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"
```

## Docker workflow (वैकल्पिक)

Container-based workflow के लिए:

```bash
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

यह verify करता है कि Docker container GPU access कर पा रहा है।

## आम समस्याएं

- Driver/CUDA version mismatch
- कम VRAM के कारण OOM errors
- Docker run में `--gpus all` भूल जाना

## लागत और प्रदर्शन

- Local setup में cloud per-hour cost नहीं होती, लेकिन power/thermal limits रहती हैं
- H100/H200 cloud nodes की तुलना में throughput कम हो सकता है, पर prototyping और lightweight inference के लिए यह बहुत अच्छा विकल्प है
