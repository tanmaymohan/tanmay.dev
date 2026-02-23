---
slug: cost-optimization-journey
title: Q3 2025-26 में मेरी कॉस्ट ऑप्टिमाइज़ेशन यात्रा
authors: [tanmay]
tags: [cloud, cost, optimization]
---

मैं क्लाउड कॉस्ट को समझने और घटाने की एक फोकस्ड यात्रा शुरू कर रहा हूं, बिना
reliability या developer velocity को नुकसान पहुंचाए।

<!-- truncate -->

आने वाले हफ्तों में मैं शेयर करूंगा:

- कैसे मैंने क्लाउड कॉस्ट लगभग 10k USD तक कम किया
- शुरुआती जीतें और वो बदलाव जिनका सबसे बड़ा असर पड़ा
- गलतियां, रिवर्सल्स, और उनसे मिली सीख

अगर आप भी कॉस्ट ऑप्टिमाइज़ेशन पर काम कर रहे हैं, तो उम्मीद है ये नोट्स मदद करेंगे।
और जोड़ना चाहें या कमेंट करना चाहें तो मेरे सोशल्स पर जुड़ सकते हैं।

*** लर्निंग #1

** Kubernetes pod packing

हमेशा अपने deployments में requests और limits को सही तरीके से सेट करें। मेरे केस में
कुछ पुराने, उपयोग में नहीं आने वाले ऐप्स default values या ज़रूरत से ज्यादा values
यूज़ कर रहे थे। इसलिए CPU और memory फ्री करने के लिए मैंने सभी applications को
पहले staging/UAT में reconfigure किया (मैं Devtron से management करता हूं)। संतुष्ट
और stable होने के बाद यही बदलाव production में भी किया। इस activity से मुझे पता चला
कि मेरा stack मुख्य रूप से memory heavy है और CPU usage बहुत कम है।

मैं पहले staging/UAT clusters में m6a.xlarge, c7i-flex और r6a.xlarge का मिश्रण
उपयोग कर रहा था। बदलाव के बाद मैंने सभी environments के लिए r6a.xlarge और r6a.2xlarge
पूरी तरह इस्तेमाल किए। Cursor ऐप से जुड़े Vantage के MCP server की मदद से चैट के
जरिए अलग‑अलग instance types ब्राउज़ करना और ap-south-1 रीजन में स्पॉट के लिए
lowest price तय करना काफी आसान हो गया।

परिणाम: कम instances, बेहतर bin packing, और daemonset pods की संख्या में कमी।

*** लर्निंग #2

** GPU usecase में बदलाव

मैं एक whisper audio usecase के लिए g6.xlarge और g6.2xlarge instances इस्तेमाल कर
रहा था, जहां मैंने एक single pod को पूरा node दे रखा था।
