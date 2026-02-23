---
sidebar_position: 3
sidebar_label: E2E Networks
---

# How to run GPU workloads on E2E Networks

Let's discover **how to launch and run GPU workloads on E2E Networks**.

## Getting Started

E2E Networks is an India-focused cloud provider with GPU options such as H100 and H200. It is a useful option when you want lower-latency access in India and flexible AI/ML infrastructure.

Get started by creating an account at https://myaccount.e2enetworks.com/. You can launch GPU workloads from the TIR AI/ML platform.


### What you'll need

- [E2E Networks account](https://myaccount.e2enetworks.com/)
- SSH key pair
- Basic Linux/SSH familiarity

## Launch a GPU instance

1. Go to AI cloud (TIR) Select the base image (for example, Python 3.10 image).

2. Give the instance a name (for example, `example-node`).

3. Choose the GPU type required for your workload (for example, H200 for large inference/training jobs).

4. Configure storage, SSH keys, and static IP (if needed), then launch the instance.

5. Connect to the instance over SSH.

6. Update system packages:

```bash
sudo apt update && sudo apt upgrade -y
```

## Verify GPU access

After connecting, run:

```bash
nvidia-smi
```

If everything is configured correctly, you should see your GPU model, driver version, and CUDA details.

## Cost optimization tips

- Pick the smallest GPU that meets your latency/throughput target.
- Stop instances when not in use to reduce cost.
- Use larger GPU tiers only when your model size or concurrency requires them.
- Track runtime and storage usage together; storage can add up over time.

## Screenshots

Add screenshots from the E2E console and terminal output (for example, instance config and `nvidia-smi`) to mirror the style used in other provider docs.


