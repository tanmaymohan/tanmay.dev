---
slug: cost-optimization-journey
title: "क्लाउड कॉस्ट $20k से ज़्यादा कैसे कम किया — 8 सीख"
authors: [tanmay]
tags: [cloud, cost, optimization, kubernetes, aws]
---

मैंने एक पूरी तिमाही क्लाउड कॉस्ट को समझने और कम करने में लगाई — बिना reliability या developer velocity को नुकसान पहुँचाए। अंत तक नीचे दिए line items मिलाकर लगभग **$1,800 USD प्रति माह** — यानी सालाना **$20k से ज़्यादा** — AWS और GCP बिल से कट गए। Spot और GPU Reserved Instance discounts इसके ऊपर हैं, और उन्हें एक ही संख्या में बाँधना मुश्किल है।

यहाँ वो 8 चीज़ें हैं जिनसे असल में फ़र्क पड़ा।

{/* truncate */}

अगर आप भी कॉस्ट ऑप्टिमाइज़ेशन पर काम कर रहे हैं, तो उम्मीद है ये नोट्स आपके काम आएंगे। अपनी सीख शेयर करने के लिए मेरे सोशल्स पर जुड़ें।

## सीख #1 — Kubernetes Pod Packing

हमेशा अपने deployments में `requests` और `limits` सही से कॉन्फ़िगर करें। मेरे केस में, कई पुरानी ऐप्लिकेशन्स जो बमुश्किल इस्तेमाल होती थीं, उनमें अभी भी डिफ़ॉल्ट resource values थीं — या फिर runtime usage से कहीं ज़्यादा।

मैंने staging और UAT एनवायरनमेंट से शुरुआत की। मॉनिटरिंग से मिले real usage data के आधार पर हर ऐप्लिकेशन की CPU और memory requests को रीकॉन्फ़िगर किया। जब दो हफ़्ते तक सब स्टेबल रहा, तब production में भी यही बदलाव किए।

नतीजा चौंकाने वाला था: **स्टैक मुख्य रूप से memory-heavy था और CPU usage बहुत कम**। मैं `m6a.xlarge`, `c7i-flex`, और `r6a.xlarge` इंस्टेंसेज़ का मिश्रण चला रहा था — compute-optimized और general-purpose मशीनों का ऐसा कॉम्बिनेशन जो workload प्रोफ़ाइल से बिल्कुल मेल नहीं खाता था।

बदलाव के बाद, मैंने सभी एनवायरनमेंट में पूरी तरह **`r6a.xlarge` और `r6a.2xlarge`** (memory-optimized) पर शिफ़्ट किया। मैंने [Vantage के MCP server](https://www.vantage.sh/) को Cursor से कनेक्ट करके instance types ब्राउज़ किए और अपने region में सबसे कम spot price खोजा।

**नतीजा**: कम instances, बेहतर bin packing, और fleet में कम DaemonSet pods।

## सीख #2 — GPU Use Case में बदलाव

मैं `g6.xlarge` और `g6.2xlarge` इंस्टेंसेज़ (NVIDIA L4 GPUs) चला रहा था — हर node पूरी तरह एक ही pod को dedicated था — whisper audio transcription, image generation, और एक general inference server के लिए।

GPU utilization का ऑडिट करने के बाद पता चला:

- Whisper workload **TensorRT-LLM** के साथ Triton Server पर FP16 में चल सकता था, जिससे memory footprint काफ़ी कम हो गया
- कई inference workloads **Kubernetes PriorityClasses** और proper resource scheduling से GPU nodes शेयर कर सकते थे
- कुछ workloads जो dedicated GPU nodes पर चल रहे थे, उन्हें ज़्यादा efficiently batch किया जा सकता था (max batch size tuning से idle GPU time कम हुआ)

मैंने GPU instances को **Reserved Instances** पर शिफ़्ट किया क्योंकि अब वे long-running और predictable थे। इससे on-demand pricing की तुलना में काफ़ी बचत हुई।

**नतीजा**: कम GPU nodes, हर node पर बेहतर utilization, और on-demand की जगह RI pricing।

## सीख #3 — EKS पर Spot Instances

यह सबसे आसान जीत थी और सबसे ज़्यादा रिटर्न वाली। मैंने non-production एनवायरनमेंट से शुरुआत की:

1. UAT और staging node groups में spot capacity जोड़ी
2. **Karpenter** को ऐसे NodePools के साथ कॉन्फ़िगर किया जो `spot` और `on-demand` capacity types मिक्स करते हैं
3. Consolidation को कुछ मिनट के underutilization के बाद किक इन होने दिया — Karpenter अपने आप underused nodes को replace या remove करता है

जब spot interruption handling पर भरोसा हो गया, तब production में भी stateless workloads और GPU training jobs के लिए spot एक्सटेंड किया।

मुख्य बात: **memory-optimized spot instances इस्तेमाल करें** (`r6a` और `m6a` families जैसी) क्योंकि `ap-south-1` region में इनकी spot availability बेहतर होती है और interruption rates compute-optimized types से कम।

**नतीजा**: सभी non-production एनवायरनमेंट और bursty production workloads में compute costs में काफ़ी कमी।

## सीख #4 — Reserved Instances और Savings Plans

Right-sizing के बाद, baseline compute needs की साफ़ तस्वीर थी। मैंने commit किया:

- **GPU Reserved Instances**: Production inference चलाने वाले `g6.xlarge` और `g6.2xlarge` instances अब predictable और long-running थे — 1-year RIs के लिए बिल्कुल सही
- **Compute Savings Plans**: General EKS compute baseline के लिए, Compute Savings Plan ने बिल के predictable हिस्से पर लगभग **20% discount** दिया (~$550/माह बचत)

ट्रिक यह है कि right-sizing *से पहले* RIs या Savings Plans न ख़रीदें। मैंने देखा है कि टीमें oversized instances पर commitments लॉक कर लेती हैं और फिर capacity use करने में दिक्कत होती है। पहले right-size करो, फिर commit करो।

**नतीजा**: सिर्फ़ Savings Plans से ~$550/माह बचत, plus GPU RIs से अतिरिक्त बचत।

## सीख #5 — Database Optimization

Databases एक चौंकाने वाला cost center थे। तीन बदलावों से फ़र्क पड़ा:

1. **DocumentDB से MongoDB Atlas में माइग्रेशन**: DocumentDB ~$170/माह खर्च कर रहा था। MongoDB Atlas ने नए customers को credits ऑफ़र किए, और माइग्रेशन सीधा था (export, import, connection strings अपडेट)। पहले साल credits से कॉस्ट कवर हुई, और credits ख़त्म होने के बाद भी Atlas pricing कम थी।

2. **RDS right-sizing**: कई RDS instances ओवरसाइज़्ड specs पर चल रहे थे जो शुरू में provision किए गए थे। मैंने CPU, memory, connections, और IOPS के लिए CloudWatch metrics रिव्यू किए — फिर जहाँ safe था वहाँ downsize किया। इससे fleet में ~$150/माह बचत हुई।

3. **Unused databases को archive किया**: एक पुराना data science database जिसे महीनों से किसी ने query नहीं किया था, उसका snapshot लिया और बंद कर दिया।

**नतीजा**: Database बदलावों से कुल ~$320/माह बचत।

## सीख #6 — Storage Optimization

Storage costs चुपचाप बढ़ते हैं। मुझे ये मिला:

- **GP2 से GP3 माइग्रेशन**: GP3 volumes GP2 से कम कीमत पर बेहतर baseline performance देते हैं। EBS volumes को GP2 से GP3 में migrate करने से zero downtime के साथ ~$50/माह बचत हुई (AWS online volume type changes सपोर्ट करता है)।
- **S3 Intelligent Tiering**: उन buckets पर enable किया जहाँ access patterns unpredictable थे। 30 दिन access न होने पर objects अपने आप cheaper tier में चले जाते हैं।
- **Archived buckets डिलीट किए**: पुराने backup buckets और data exports जिनकी ज़रूरत नहीं थी, साफ़ किए।
- **Multipart upload lifecycle rules**: Incomplete multipart uploads चुपचाप जमा होते रहते हैं। 7 दिन बाद abort करने की lifecycle rule से wasted storage साफ़ हुई।

**नतीजा**: EBS बदलावों से ~$50/माह, plus S3 lifecycle management से ongoing बचत।

## सीख #7 — Unused Services बंद करना

यह सबसे बड़ी category थी। ऐसी services जो किसी ख़ास काम के लिए सेटअप की गईं, कुछ समय इस्तेमाल हुईं, और फिर भूल गए — लेकिन चलती रहीं और बिल आता रहा:

- **पुराना Elasticsearch cluster**: Workloads newer, right-sized setup में जाने के बाद पूरी तरह deprecated किया। यह **$504/माह** खर्च कर रहा था — सबसे बड़ा single line item जो मैंने हटाया।
- **Unused load balancers**: Classic load balancers जो अब traffic route नहीं कर रहे थे। हर idle ALB/CLB अभी भी ~$16-22/माह खर्च करता है। इन्हें हटाने से ~$50/माह बचत हुई।
- **Unused Lambda functions**: पुराने functions जो कभी trigger नहीं होते थे लेकिन provisioned concurrency या attached resources थे। Cleanup से ~$15/माह बचत।
- **CloudWatch Insights**: EKS clusters पर Container Insights enable था लेकिन dashboards कभी इस्तेमाल नहीं हुए। सिर्फ़ data ingestion ~$200/माह खर्च कर रही थी। Confirm करने के बाद कि कोई इस पर depend नहीं करता, disable किया।

**नतीजा**: Service deprecation से ~$769/माह — Savings Plans से पहले सबसे बड़ी single category।

## सीख #8 — Billing और Account Structure

दो बदलाव जिनमें कोई infrastructure काम नहीं:

1. **AWS पर invoiced billing में शिफ़्ट किया**: Credit card payments की जगह invoiced billing पर गए। इससे better payment terms मिले और account team से volume discounts का रास्ता खुला (committed spend पर typically 5-10% monthly bill पर)।

2. **पुराने cloud accounts बंद किए**: एक GCP project था जो AWS में workloads migrate करने के बाद ज़्यादातर unused था। Project archive करने और बचे resources साफ़ करने से GCP bill ~10,000 INR/माह कम हुआ।

**नतीजा**: AWS पर better payment terms और एक पूरा cloud provider bill ख़त्म।

---

## कुल बचत

| Category | मासिक बचत (लगभग) |
|----------|------------------:|
| Savings Plans (compute) | $550 |
| Elasticsearch deprecation | $504 |
| CloudWatch Insights | $200 |
| DocumentDB → MongoDB Atlas | $170 |
| RDS right-sizing | $150 |
| Load balancer cleanup | $50 |
| GP2 → GP3 | $50 |
| Lambda cleanup | $15 |
| GCP project closure | ~$120 (10k INR) |
| **कुल** | **~$1,800+/माह** |

Spot instance savings (जिसकी fixed number बताना मुश्किल है) और GPU RI discounts मिलाकर, सालाना आँकड़ा आराम से **$20,000 USD** से ज़्यादा है।

---

## अगर कोई इसकी शुरुआत कर रहा हो तो मेरी सलाह

1. **Visibility से शुरू करो**: जो दिखता नहीं, उसे काट नहीं सकते। बदलाव करने से पहले cost allocation tags सेट करो और AWS Cost Explorer या Vantage जैसा tool इस्तेमाल करो।
2. **Commit करने से पहले right-size करो**: जब तक instances right-size नहीं हो जाते, Savings Plans या RIs मत ख़रीदो। वरना waste लॉक हो जाएगा।
3. **पहले non-production**: हर बदलाव (spot instances, instance type changes, database migrations) production छूने से पहले staging में टेस्ट करो।
4. **Aggressively deprecate करो**: सबसे बड़ी बचत हमेशा उन चीज़ों को बंद करने से आती है जो अब कोई इस्तेमाल नहीं करता — न कि चलती हुई चीज़ों को सस्ता करने से।
5. **आदत बनाओ**: Cost optimization एक बार का प्रोजेक्ट नहीं है। मैं अब हर महीने बिल रिव्यू करता हूँ और drift ढूँढता हूँ।

इन techniques की step-by-step guides के लिए, docs section में [Cost Optimization Playbook](/docs/cost-optimization-playbook) देखें।
