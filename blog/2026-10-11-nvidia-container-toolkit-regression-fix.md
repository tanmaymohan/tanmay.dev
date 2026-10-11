---
slug: nvidia-container-toolkit-regression-fix
title: "Finding a Regression in NVIDIA Container Toolkit 1.20.0"
authors: [tanmay]
tags: [gpu, kubernetes, opensource, debugging, aws, eks]
description: "How I found a regression in NVIDIA Container Toolkit 1.20.0 that broke GPU workloads on EKS: the new CDI hook tried to mkdir under a read-only ConfigMap mount, the device plugin never started, and every GPU node advertised 0 GPUs. Filed upstream, fixed in 1.20.1."
keywords: ["NVIDIA Container Toolkit", "GPU regression", "Kubernetes", "EKS", "nvidia.com/gpu", "container runtime", "open source contribution", "Amazon EKS AMI"]
image: /img/author.jpg
---

GPU workloads on our EKS clusters started failing after a routine node group upgrade. The error was cryptic: `nvidia.com/gpu` resource not found on nodes that clearly had GPUs. Every GPU pod stuck in `Pending`. This is the story of finding, reproducing, and fixing a regression in NVIDIA Container Toolkit 1.20.0 that shipped in the EKS GPU AMI v20260818.

{/* truncate */}

## The Symptom

After Karpenter launched new nodes using the latest EKS GPU AMI (v20260818, which included NVIDIA Container Toolkit 1.20.0), pods requesting `nvidia.com/gpu` stuck in `Pending`:

```bash
$ kubectl describe pod llm-inference-xyz
Warning  FailedScheduling  default-scheduler  0/3 nodes are available: 3 Insufficient nvidia.com/gpu.
```

But the nodes *had* GPUs — `nvidia-smi` showed them, drivers loaded, everything looked fine. The NVIDIA device plugin just wasn't registering the `nvidia.com/gpu` resource. Something in the toolkit upgrade broke the device plugin's ability to start.

## The Root Cause

Toolkit 1.20.0 added a new **`update-application-profile` CDI hook**. On every container create, this hook runs:

```bash
mkdir -p /etc/nvidia/nvidia-application-profiles-rc.d
```

The NVIDIA device plugin mounts its config at `/etc/nvidia` as a **read-only ConfigMap** (`--config-file=/etc/nvidia/config`). When the hook runs `mkdir` inside that read-only mount, it fails with `EROFS` (read-only file system). The hook exits non-zero, `createContainer` fails, and the device plugin never starts — so the node advertises **0 `nvidia.com/gpu`**.

**Error in kubelet logs:**
```
createContainer hook #6: exit status 1 ... mkdirat /etc/nvidia/nvidia-application-profiles-rc.d: read-only file system
```

## Minimal Repro

I stripped it down to the smallest possible test:

1. Launch a `g5.xlarge` (single L4 GPU) with the affected EKS AMI (v20260818)
2. Deploy a pod that triggers the CDI hook — even a pod with **no GPU request** but with environment-based injection triggers it
3. Mount any ConfigMap at `/etc/nvidia` (read-only)
4. Container creation fails with `EROFS`

The same manifests worked on toolkit 1.19.x.

```yaml
# Minimal repro - deploy this and watch it fail on 1.20.0
apiVersion: v1
kind: Pod
metadata:
  name: toolkit-repro
spec:
  containers:
  - name: test
    image: alpine:3.20
    command: ["sleep", "3600"]
    env:
    - name: NVIDIA_VISIBLE_DEVICES
      value: "all"  # triggers CDI hook
    volumeMounts:
    - name: config
      mountPath: /etc/nvidia
      readOnly: true
  volumes:
  - name: config
    configMap:
      name: dummy-config  # any ConfigMap
```

## The Fix

I filed the issue publicly at **[awslabs/amazon-eks-ami#2790](https://github.com/awslabs/amazon-eks-ami/issues/2790)** with:
- Minimal repro steps
- Exact error from kubelet logs
- EKS AMI version (v20260818)
- Root cause analysis (read-only ConfigMap + mkdir in CDI hook)

NVIDIA engineers confirmed the regression within 24 hours. The fix landed in **[PR #2851](https://github.com/nvidia/container-toolkit/pull/2851)** — the hook now ignores read-only filesystem errors when creating the application profiles directory.

**Released in NVIDIA Container Toolkit 1.20.1.**

## EKS Workaround (Until AMI Update)

If you're on EKS and can't wait for the updated AMI, you have two options:

**Option 1: Pin to the previous EKS GPU AMI**
```hcl
# Terraform - pin to known-good AMI ID
resource "aws_eks_node_group" "gpu" {
  ami_type = "AL2_x86_64_GPU"  # or BOTTLEROCKET_x86_64_NVIDIA
  # Use the AMI ID from before v20260818, not "latest"
  # Find it in EC2 > AMIs > Owned by Amazon > amazon-eks-gpu-*
}
```

**Option 2: Mount the device-plugin config elsewhere (keep `/etc/nvidia` writable)**
```yaml
# Device plugin daemonset patch
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: nvidia-device-plugin-daemonset
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: nvidia-device-plugin-ctr
        # Change config mount path away from /etc/nvidia
        volumeMounts:
        - name: config
          mountPath: /etc/nvidia-device-plugin  # not /etc/nvidia
      volumes:
      - name: config
        configMap:
          name: nvidia-device-plugin-config
```

## What This Taught Me

1. **Pin critical AMIs**. The EKS GPU AMI "latest" moved under us. For GPU workloads, pin the AMI ID in Terraform/Karpenter.

2. **Test GPU registration in CI**. Add a step that launches a test node, installs the device plugin, and asserts `nvidia.com/gpu` > 0.

3. **Upstream first**. The fix was a one-line change once reproduced. Reporting it saved everyone else running GPU workloads on EKS.

4. **CDI hooks run on *every* container create**. Not just GPU pods — any pod with `NVIDIA_VISIBLE_DEVICES` triggers the hook. That's why even non-GPU workloads were affected.

## Links

- **AWS Issue**: [awslabs/amazon-eks-ami#2790](https://github.com/awslabs/amazon-eks-ami/issues/2790)
- **Fix PR**: [nvidia/container-toolkit#2851](https://github.com/nvidia/container-toolkit/pull/2851)
- **Release**: [NVIDIA Container Toolkit 1.20.1](https://github.com/nvidia/container-toolkit/releases/tag/v1.20.1)
- **EKS AMI Reference**: [AWS EKS GPU AMIs](https://github.com/awslabs/amazon-eks-ami)

---

*This fix is now deployed across all our GPU node pools. If you run GPU workloads on EKS, upgrade to Toolkit 1.20.1+ or pin to a known-good AMI.*