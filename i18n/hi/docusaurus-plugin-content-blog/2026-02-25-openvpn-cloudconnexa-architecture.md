---
slug: openvpn-cloudconnexa-architecture
title: "Strict Compliance वाली टीम के लिए VPN Access कैसे डिज़ाइन किया"
authors: [tanmay]
tags: [security, networking, compliance]
---

जब मैंने infrastructure lead के रूप में join किया, तो internal tools जैसे dashboards, databases, और monitoring public internet पर accessible थे — सिर्फ़ application-level authentication से protected। यह काफ़ी नहीं है जब आप regulated environment में sensitive data handle कर रहे हों। मुझे ऐसा VPN solution चाहिए था जो manage करने में आसान हो, compliance requirements पूरा करे, और टीम को slow न करे।

यह रहा कैसे मैंने **OpenVPN CloudConnexa** से इसे डिज़ाइन किया।

{/* truncate */}

## Requirements

1. **सभी internal tools VPN के पीछे**: Dashboards, databases, internal APIs, monitoring — इनमें से कुछ भी public internet से reachable नहीं होना चाहिए।
2. **Compliance-ready**: Setup को ISO 27001 और अन्य security standards के अनुरूप होना था — encryption in transit, access logging, periodic audits।
3. **आसान onboarding**: नए टीम members को 10 मिनट से कम में बिना IT की मदद के VPN access सेट कर लेना चाहिए।
4. **Single identity**: अलग VPN credentials नहीं। वही corporate identity (Google Workspace) जो टीम बाकी सब के लिए इस्तेमाल करती है।

## CloudConnexa क्यों चुना

मैंने self-hosted OpenVPN, WireGuard, और Tailscale evaluate किए। Deciding factors:

- **Cloud-hosted**: कोई VPN server maintain, patch, या scale नहीं करना। CloudConnexa managed service के रूप में चलता है।
- **Multi-cloud connectivity**: मुझे AWS और GCP के VPCs connect करने थे। CloudConnexa hub की तरह काम करता है जो दोनों को interconnect करता है।
- **SAML integration**: Google Workspace as identity provider के लिए native support — VPN access और बाकी सब पर same MFA policies enforce कर सकता हूँ।

## Architecture

### Split Tunnel

VPN **split tunnel** के रूप में configured है: सिर्फ़ internal network ranges के लिए destined traffic VPN tunnel से जाता है। बाकी सारा internet traffic सीधे user की device से internet पर जाता है।

यह दो कारणों से ज़रूरी है:
- **Performance**: Users को slower browsing, video calls, या downloads का अनुभव नहीं होता क्योंकि वो traffic VPN को छूता ही नहीं।
- **Cost**: VPN bandwidth metered है। सारा traffic tunnel से route करना wasteful और महँगा होगा।

### Authentication

- **Google SAML SSO**: Users अपने corporate Google account से sign in करते हैं। कोई अलग VPN username/password नहीं।
- **Enforced MFA**: Google Workspace सभी users के लिए multi-factor authentication enforce करता है। चूँकि VPN auth Google से होता है, VPN access के लिए भी MFA automatically required है।
- **Automated profiles**: जब user पहली बार login करता है, VPN profile अपने आप generate होकर OpenVPN Connect app में deploy हो जाती है। कोई manual config file distribution नहीं।

### Device और Location Policies

- **Per user एक device**: हर व्यक्ति एक device (work laptop) register कर सकता है VPN access के लिए। इससे credential sharing रुकती है और attack surface सीमित होता है।
- **Geographic restriction**: VPN connections सिर्फ़ India से accept होते हैं। यह CloudConnexa level पर enforce है और compromised credentials के unexpected location से use होने पर protection का एक layer जोड़ता है।
- **Shield**: CloudConnexa का Shield feature continuous monitoring से potential threats detect करता है।

## VPN के पीछे क्या जाता है

CloudConnexa deploy करने के बाद, मैंने सभी internal tools इसके पीछे रखे:

- Business intelligence dashboards
- LLM observability platform
- CI/CD platform UI
- Database admin access
- Internal APIs और microservice endpoints जिन्हें external exposure की ज़रूरत नहीं
- Configuration management tools
- Monitoring और alerting dashboards

सभी के लिए traffic flow same है: **VPN user → Route 53 DNS → Internal load balancer (TLS के साथ) → Service**।

Internal load balancers public internet से reachable नहीं हैं। ये private subnets में हैं और सिर्फ़ VPN CIDR range और VPC से traffic accept करते हैं।

## Compliance Alignment

Regulated environments में काम करने वाली teams के लिए, यह architecture क्या provide करता है:

| Requirement | कैसे पूरा होता है |
|-------------|-----------------|
| Encryption in transit | सारा VPN traffic OpenVPN protocol से encrypted; internal ALBs TLS terminate करते हैं |
| Access logging | CloudConnexa user connections, authentication events, और DNS queries के detailed logs maintain करता है |
| MFA enforcement | Google Workspace SAML handle करता है — bypass का कोई तरीका नहीं |
| Periodic audits | Connection logs और DNS logs audit review के लिए exportable हैं |
| Access control | सिर्फ़ specific user groups specific applications access कर सकते हैं |
| Device control | Per user single registered device |

## Onboarding Flow

नए टीम member के लिए day one पर:

1. CloudConnexa portal URL पर navigate करो
2. Corporate Google account से sign in करो (Google SAML पर redirect)
3. अपने OS के लिए OpenVPN Connect app download करो
4. Profile अपने आप app में import हो जाती है
5. Nearest region select करो और connect करो

Total time: 5 मिनट से कम। कोई IT tickets नहीं, कोई config files नहीं, कोई manual steps नहीं।

## मैं क्या अलग करता

- **Point-to-point rules**: अभी, एक बार VPN पर आने के बाद, internal network पर कोई भी host reach कर सकते हो। एक mature setup user group के आधार पर access restrict करेगा — जैसे developers सिर्फ़ staging reach कर सकें, production databases नहीं। यह मेरे roadmap पर है।
- **MDM integration**: VPN access को mobile device management solution के साथ combine करने से device-level policies (encryption, OS version, patch level) VPN access की condition के रूप में enforce कर सकता हूँ।

## मुख्य बात

CloudConnexa जैसा managed VPN self-hosting का operational burden हटाता है और enterprise-grade access controls देता है। SAML SSO, enforced MFA, split tunneling, और geographic restrictions का combination ज़्यादातर compliance requirements cover करता है बिना solution को overengineer किए।

सबसे अच्छी बात: setup में लगभग एक हफ़्ता लगा, और नए user को onboard करने में 5 मिनट।
