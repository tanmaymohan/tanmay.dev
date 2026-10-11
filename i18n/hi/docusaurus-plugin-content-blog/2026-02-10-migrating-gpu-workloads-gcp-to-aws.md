---
slug: migrating-gpu-workloads-across-clouds
title: "एक महीने में 4 GPU Workloads GCP से AWS पर माइग्रेट किए"
authors: [tanmay]
tags: [gpu, cloud, aws, migration]
---

हमारे पास GCP virtual machines पर चार GPU workloads चल रहे थे — speech-to-text (Whisper), एक general Triton inference server, Stable Diffusion 3, और एक open-source LLM server (vLLM)। ये unmanaged थे, undocumented थे, और महँगे थे। मैंने चारों को लगभग एक महीने में AWS EKS पर शिफ़्ट किया। यह रहा पूरा अनुभव और क्या सीखा।

{/* truncate */}

## हमने क्यों शिफ़्ट किया

चार चीज़ों ने यह फ़ैसला push किया:

1. **GCP पर GPU availability inconsistent थी**। Quota increases में समय लगता था, और जो specific GPU SKUs चाहिए थे वो हमारे regions में हमेशा available नहीं होते थे।
2. **Cost consolidation**। एक अलग cloud provider पर GPU workloads चलाने का मतलब था अलग billing, अलग IAM, अलग networking। छोटे GPU fleet के लिए दो clouds मैनेज करने का overhead justify नहीं होता था।
3. **Management overhead**। GCP GPU instances manually provisioned VMs थे — कोई Kubernetes नहीं, कोई CI/CD नहीं, कोई proper monitoring नहीं। हर deployment SSH-and-pray था।
4. **Latency**। Production traffic पहले से AWS में था और GPUs GCP में। Audio, client-facing apps के लिए यह extra hop समस्या था।

लक्ष्य सीधा था: सब कुछ AWS EKS में लाओ जहाँ बाकी infrastructure पहले से है, same CI/CD pipelines और monitoring stack से managed।

## हमने क्या शिफ़्ट किया

### 1. Whisper Audio (Speech-to-Text)

यह सबसे complex workload था। हम OpenAI का Whisper model audio transcription के लिए चला रहे थे।

GCP पर, यह NVIDIA GPU वाली VM पर standalone process के रूप में चलता था। AWS पर, मैंने इसे **NVIDIA Triton Inference Server** और **TensorRT-LLM** से rebuild किया:

- **Multi-stage Docker build**: पहला stage Hugging Face model weights से TRT-LLM engines compile करता है `convert_checkpoint.py` और `trtllm-build` (FP16, max batch size 2) से। दूसरा stage compiled engines को lightweight Triton runtime image में copy करता है।
- **Model weights**: Build time पर S3 से Docker image में sync होते हैं। इससे image self-contained बनती है — कोई runtime downloads नहीं, कोई model registry dependency नहीं।
- **Serving**: Triton gRPC (port 8001) और HTTP (port 8000) endpoints expose करता है। हम backend services से low-latency inference के लिए gRPC endpoint इस्तेमाल करते हैं।
- **Batching**: Triton में dynamic batching enable है, max queue delay 100 microseconds। BLS (Business Logic Scripting) pipeline WAV input → Whisper inference → transcript output handle करती है।

**Target instance**: `g6.xlarge` (NVIDIA L4, 24 GB VRAM) — Whisper FP16 engines के लिए काफ़ी है।

### 2. Triton Inference Server (General)

कई छोटे models host करने वाला general-purpose Triton server। यह सीधा Docker image था (`nvcr.io/nvidia/tritonserver:24.06-py3`) जिसमें persistent storage से model repository mount होती थी।

AWS पर, यह EKS में Karpenter-managed dedicated GPU node pool पर चलता है। Node pool configured है कि सिर्फ़ GPU workloads schedule हों (taints और tolerations से), तो non-GPU pods कभी महँगे GPU nodes पर नहीं आएँगे।

### 3. Image Generation (SD3)

Internal image generation tasks के लिए Stable Diffusion 3। GCP पर `g6.2xlarge`-equivalent VM थी। AWS पर, same instance type (`g6.2xlarge`, NVIDIA L4) EKS में।

Migration के बाद पता चला कि यह workload बहुत कम इस्तेमाल होता है। मैंने node group बंद किया और deployment config Git में रख दिया जब ज़रूरत हो तब के लिए। इससे अकेले `g6.2xlarge` जितना on-demand cost बचा।

### 4. Open-Source LLM Serving

हम open-source large language models evaluate कर रहे थे। मैंने **vLLM** को OpenAI-compatible API server के रूप में सेट किया:

```dockerfile
FROM vllm/vllm-openai:v0.6.3
CMD ["--model", "mistralai/Mistral-7B-Instruct-v0.3", "--port", "8080", "--host", "0.0.0.0"]
```

बेहद सीधा। Image tag pin करो — `latest` मत भेजो। vLLM KV-cache management, continuous batching, और tensor parallelism अपने आप handle करता है। API OpenAI के chat completions format के साथ compatible है, तो backend services को switch करने में zero code changes लगे — बस URL बदला।

इस workload के लिए, मैंने कई GPU types पर test किया:
- **H200** tensor parallelism 2 के साथ — latency-sensitive use cases के लिए अच्छा
- **B200** tensor parallelism 1 के साथ — higher concurrency (~80-100 concurrent requests) पर बेहतर throughput

Benchmarking से पता चला कि optimal concurrency GPU और parallelism strategy पर बहुत depend करता है। कोई universal "best" setting नहीं है।

## Migration कैसे काम किया

### Step 1: Data और Models Extract करो

GCP VMs से model weights, embeddings, और persistent data S3 में copy किया। Large models के लिए, `gsutil` से GCS से local staging area में copy किया, फिर `aws s3 sync` से target bucket में push किया।

### Step 2: सब कुछ Containerize करो

हर workload का अपना Dockerfile बना। मुख्य फ़ैसले:

- **Base images pin करो**: Specific NVIDIA container image tags (जैसे `nvcr.io/nvidia/tritonserver:24.06-py3`) इस्तेमाल करो, `latest` नहीं।
- **Inference workloads में models image में bake करो**: कोई runtime downloads नहीं मतलब faster cold starts और startup पर external storage पर कोई dependency नहीं।
- **Training workloads अलग रखो**: Training jobs runtime पर S3 से data pull करते हैं क्योंकि datasets बार-बार बदलते हैं।

### Step 3: EKS में Deploy करो

सभी workloads EKS में Kubernetes Deployments के रूप में deploy:

- **GPU scheduling**: GPU workloads के लिए `PriorityClass` (value 100000) — ताकि GPU nodes पर किसी lower-priority pods से पहले इन्हें priority मिले।
- **Node management**: Karpenter demand पर GPU nodes (`g6.xlarge`, `g6.2xlarge`) provision करता है और utilization कम होने पर consolidate करता है। Non-critical GPU workloads (training, evals) के लिए Spot instances, production inference के लिए on-demand।
- **Ingress**: Triton और vLLM endpoints के लिए gRPC-compatible **internal ALB**। Public internet पर नहीं। In-VPC hop (ALB + CoreDNS) पुराने AWS-to-GCP round trip से छोटा है।

### Step 4: GCP बंद करो

जब सारा traffic AWS endpoints से flow होने लगा और parity confirm हो गई:

1. सभी GCP GPU VMs बंद किए
2. Safety के लिए disks snapshot लिए
3. 2-week bake period के बाद VMs permanently बंद किए
4. GCP billing account बंद किया

## मैंने क्या सीखा

1. **Migrate करने से पहले containerize करो**। अगर workload अभी भी VM पर bare process के रूप में चल रहा है, तो पहले source cloud पर ही containerize करो। Cloud migration की complexity जोड़ने से पहले container issues debug करो।

2. **TensorRT-LLM build complexity के बावजूद worth है**। Whisper TRT-LLM का multi-stage build trivial नहीं है, लेकिन vanilla PyTorch की तुलना में inference performance improvement significant है। L4 पर FP16 engines ने fraction of the cost पर ज़रूरी throughput दिया।

3. **Open-source LLMs serve करने का सबसे तेज़ तरीका vLLM है**। OpenAI-compatible API का मतलब है कि आपके application code को पता नहीं चलता कि वो self-hosted model से बात कर रहा है। Continuous batching variable concurrency को gracefully handle करती है।

4. **जो GPU workloads कोई use नहीं करता, उनके लिए GPU nodes चालू मत रखो**। SD3 instance occasional internal use के लिए real money खर्च कर रहा था। Bursty GPU workloads के लिए scale to zero और demand पर spin up — यही सही pattern है।

5. **Clouds consolidate करने से सब simplify होता है**। एक IAM system, एक monitoring stack, एक CI/CD pipeline, एक networking layer। Operational overhead reduction instance cost savings से ज़्यादा valuable है।

GPU workloads को अलग-अलग providers पर कैसे चलाता हूँ, इसके बारे में docs में [Running GPUs in 2026](/docs/running-gpus-in-2026) guide देखें।
