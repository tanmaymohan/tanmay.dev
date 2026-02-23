---
sidebar_position: 2
sidebar_label: Verda (B200/B300)
---

import ImageLightbox from '@site/src/components/ImageLightbox';

# How to run GPU workloads on B200 or B300 GPU on Verda

Let's discover **how to run GPU workloads on Verda (formerly DataCrunch)**.

## Getting Started

Verda is a Finland-based hyperscaler with access to modern NVIDIA GPUs like B300, B200, H200, H100, and RTX Pro 6000. It is a good choice when you need high-end GPU capacity with flexible deployment options.

Get started by creating an account at https://console.verda.com. For first use, you may need to top up your account (for example, minimum $20).

### What you'll need

- [Verda account](https://console.verda.com)
- SSH public key
- Basic Linux/SSH familiarity

## Launch a GPU instance

1. Create a new instance from the Verda console.

2. Choose pricing mode:
   - **Spot** — lower cost, but can be interrupted
   - **On-demand** — stable capacity, higher cost

3. Select the GPU type you need (for example: B300, B200, H200, H100, A100, RTX Pro 6000, or L4).

4. Configure node details:
   - SSH key
   - OS image (for example, Ubuntu 24.04 + CUDA)
   - Storage and networking

5. Launch the instance and wait until it is in the running state.

6. Connect over SSH and verify GPU access:

```bash
nvidia-smi
```

## Cost optimization tips

- Use spot instances for non-critical jobs and experiments.
- Use on-demand for production or long-running workloads requiring stability.
- Pick the right GPU tier for your use case; avoid over-provisioning.
- Shut down idle instances to control hourly spend.

## Screenshots

Here are some screenshots to help you visualize the process.

<ImageLightbox images={[
  { src: '/img/verda/verda-console.png', alt: 'Verda Console Dashboard', caption: 'Verda Console Dashboard' },
  { src: '/img/verda/configure-instance.png', alt: 'Instance Configuration ', caption: 'Instance Configuration ' },
  { src: '/img/verda/running-instance.png', alt: 'Running instance', caption: 'Running instance' },
  { src: '/img/verda/nvidia-smi-verda.png', alt: 'NVIDIA-SMI', caption: 'Running nvidia-smi command on instance ' },
  { src: '/img/verda/running-benchmark.png', alt: 'Sample docker benchmark details', caption: 'Sample docker benchmark details' },
]} />
