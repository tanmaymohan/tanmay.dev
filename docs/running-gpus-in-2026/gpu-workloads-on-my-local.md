---
sidebar_position: 6
sidebar_label: Local Machine
---

# How to run GPU workloads on your local machine

Let's discover **how to run GPU workloads on your own workstation**.

## Getting Started

Running locally is perfect for development, testing, and small-scale inference. You get full control, no cloud billing surprises, and faster iteration cycles.

### What you'll need

- NVIDIA GPU (8 GB+ VRAM recommended; 16 GB+ for larger models)
- Recent NVIDIA driver
- Linux (recommended) or Windows with WSL2
- Docker (optional, but strongly recommended)

## Setup steps

I have a Windows 11 x64 based system, so I am using Ubuntu 24.04 LTS with WSL and Docker Desktop enabled

1. Install or update your NVIDIA driver.
2. Confirm the GPU is detected:

```bash
nvidia-smi
```

3. Install Python and create a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
```

4. Install your framework build with CUDA support (for example, PyTorch).

5. Validate CUDA from Python:

```bash
python3 -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"
```

## Docker-based workflow (optional)

If you prefer containers:

```bash
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

This confirms Docker can access your GPU.

## Common issues

- Driver/CUDA mismatch between host and framework
- Insufficient VRAM causing OOM errors
- Missing `--gpus all` when running containers

## Cost and performance notes

- Local setups have zero per-hour cloud cost, but power/thermal limits apply.
- You may get lower throughput than cloud H100/H200 systems, but local is ideal for prototyping and lightweight inference.
