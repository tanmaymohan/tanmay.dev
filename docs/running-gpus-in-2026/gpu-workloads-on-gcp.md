---
sidebar_position: 5
sidebar_label: Google Cloud (GCP)
---

# How to run GPU workloads on Google Cloud (GCP)

Let's discover **how to launch GPU workloads on Google Cloud Platform (GCP)**.

## Getting Started

GCP provides GPU options through Compute Engine and managed AI workflows through Vertex AI. You can use GPUs such as T4, L4, A100, and H100 (availability varies by region and quota).

### What you'll need

- A [Google Cloud account](https://cloud.google.com/) with billing enabled
- GPU quota in your target region
- SSH access (or browser-based SSH)
- Basic Linux/CLI familiarity

## Request GPU quota

Before launching GPU VMs, request quota for:

- `GPUS_ALL_REGIONS`
- Specific GPU families in your target region (for example L4, A100, H100)

Use the GCP console: **IAM & Admin -> Quotas**, then request increases for your project.

## Launch a GPU VM (Compute Engine)

1. Go to **Compute Engine -> VM instances -> Create instance**.
2. Select region/zone based on GPU availability.
3. Under **Machine configuration**, add a GPU (for example, 1x L4 or 1x A100).
4. Choose an OS image:
   - Deep Learning VM image (recommended for quick start)
   - Ubuntu + manual NVIDIA driver setup
5. Configure boot disk size (100 GB+ recommended for model/dataset workloads).
6. Allow SSH and create the VM.

## Verify GPU access

After connecting to the VM:

```bash
nvidia-smi
```

If your VM does not include preinstalled drivers, install the NVIDIA driver and reboot.

## Cost optimization tips

- Use smaller GPUs for development and batch jobs.
- Stop VMs when idle.
- Use preemptible/spot VMs for fault-tolerant workloads.
- Pick regions with better GPU availability and pricing.
