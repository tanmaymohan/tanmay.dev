---
slug: hardening-eks-stack-6-months
title: "एक महीने में EKS Stack कैसे Harden किया"
authors: [tanmay]
tags: [kubernetes, aws, security]
---

जब मैंने शुरू किया, EKS setup में basics थे — workloads चल रहे थे, traffic flow हो रहा था, deployments काम कर रहे थे। लेकिन security की नज़र से, काफ़ी surface area था: apps में baked static AWS access keys, default Amazon Linux nodes, कोई container image scanning नहीं, और publicly accessible Kubernetes API। पूरे stack को मैंने **एक महीने** में harden किया, एक हफ़्ता एक बार। यह रही पूरी journey।

{/* truncate */}

| हफ़्ता | काम |
|---|---|
| 1 | Host छोटा करो और API छुपाओ। Bottlerocket, फिर private EKS endpoint। |
| 2 | Bugs दिखें। हर PR पर SonarCloud, हर image पर Trivy। |
| 3 | Perimeter बंद करो। WAF, branch protection, hardened Dockerfiles। |
| 4 | Static keys खत्म, cluster upgrade, और external test। |

## शुरुआती हालत

एक quick audit से स्थिति पता चली:

- **Static access keys**: Applications S3, DynamoDB, SQS, और अन्य AWS services से बात करने के लिए long-lived AWS access keys (`AKIA*` credentials) इस्तेमाल कर रही थीं। ये keys environment variables में stored थीं और manually rotate होती थीं (अगर होती थीं)।
- **Default node OS**: EKS nodes default Amazon Linux 2 AMI पर चल रहे थे। Full Linux distribution — SSH access, package managers, और wide attack surface।
- **कोई container scanning नहीं**: Docker images बिना vulnerability scanning के build और deploy होती थीं। किसी को नहीं पता था running images में कितने CVEs हैं।
- **Public EKS API**: Kubernetes API server internet से accessible था, सिर्फ़ IAM authentication से protected।
- **कोई SAST नहीं**: Code humans review करते थे, लेकिन CI pipeline में कोई static analysis security testing नहीं था।
- **कुछ जगह basic auth**: कुछ internal APIs hardcoded basic authentication tokens इस्तेमाल कर रहे थे।

Catastrophic नहीं, लेकिन जहाँ होना चाहिए वहाँ नहीं — ख़ासकर regulated environment में जहाँ formal security audits आने वाले थे।

## हफ़्ता 1: Host और API

### Bottlerocket OS

पहला बदलाव सभी EKS nodes को Amazon Linux से **Bottlerocket** — Amazon का purpose-built container OS — पर switch करना था।

Bottlerocket क्यों matters:
- **Immutable filesystem**: Root filesystem read-only है। Packages install नहीं कर सकते, system files modify नहीं कर सकते, कुछ भी ऐसा नहीं कर सकते जो compromised container host पर करने की कोशिश करे।
- **कोई SSH नहीं**: कोई SSH daemon नहीं। Traditional sense में Bottlerocket node में shell नहीं कर सकते। Admin access Bottlerocket API या SSM से है, दोनों auditable हैं।
- **कोई package manager नहीं**: कोई `yum`, कोई `apt`, कोई `dnf` नहीं। इससे supply chain attacks की पूरी एक class eliminate हो जाती है।
- **CIS Level 1 compliant out of the box**: कोई manual hardening ज़रूरी नहीं।

मैंने पहले production में rollout किया (जहाँ सबसे ज़्यादा matter करता था), फिर staging और UAT में extend किया। Migration straightforward था — node group configuration में AMI type update किया, nodes roll किए, और verify किया कि workloads healthy वापस आ रहे हैं।

### Sealed EKS API

EKS API endpoint पर public access disable किया और private-only access enable किया। इसका मतलब `kubectl` commands सिर्फ़ VPC के अंदर से काम करते हैं — practice में VPN से।

यह एक बदलाव पूरा attack vector eliminate करता है। अगर किसी के पास valid Kubernetes credentials भी हैं, API server internet से reach नहीं कर सकते।

## हफ़्ता 2: Bugs दिखें

### CI में SonarCloud

**SonarCloud** को GitHub में directly integrate किया:

- Main branches पर हर pull request SonarCloud scan trigger करता है
- **Quality Gates enforce हैं**: अगर scan में security vulnerabilities, threshold से ऊपर code smells, या duplications मिलें, PR merge नहीं हो सकता
- Python, Java, JavaScript, TypeScript, Terraform, और YAML पर coverage
- SonarCloud bot हर PR पर findings comment करता है

यह बहुत सारा low-hanging fruit पकड़ता है — hardcoded secrets, SQL injection patterns, XSS vulnerabilities, insecure random number usage — इससे पहले कि code production तक पहुँचे।

### Trivy Container Scanning

SonarCloud pass होने के बाद, CI pipeline Docker image build करती है। Deploy होने से पहले, **Trivy** scan करता है:

- OS packages में known CVEs
- Application dependencies में known CVEs
- Misconfigured Dockerfile patterns

Scan results CI console में log होते हैं। उस हफ़्ते log-only mode रखा, critical CVEs के लिए भी, ताकि baseline दिखे और किसी का deploy न रुके। Critical findings पर block तब किया जब backlog इतना छोटा था कि deploys freeze न हों।

## हफ़्ता 3: Perimeter बंद

### Load Balancers पर WAF

सभी applications proper AWS Application Load Balancers के पीछे होने के बाद (internal backend services के लिए, external public-facing APIs के लिए), मैंने external-facing ALBs पर **AWS WAF** enable किया:

- Common attack patterns (SQLi, XSS, known bad inputs) के लिए AWS managed rule sets
- Rate-based rules पहले **COUNT mode** में — traffic patterns समझने के लिए बिना accidentally legitimate requests block किए
- कुछ दिन counts, फिर हफ़्ता 4 के external test से पहले tuned thresholds के साथ BLOCK mode

### Branch Protection

Code side पर, stricter branch protection rules enforce किए:

- Main branches में merge करने से पहले minimum 2 PR approvals ज़रूरी
- सिर्फ़ designated lead developers production branches में merge कर सकते हैं
- सभी status checks (SonarCloud, CI build, Trivy scan) pass होने चाहिए

### Dockerfile Hardening

सभी services के Dockerfiles audit किए और hardening approach standardize किया:

- Specific base image tags (कोई `latest` नहीं)
- Security patches pick up करने के लिए build में `apt-get update && apt-get upgrade`
- जहाँ possible हो non-root user से run करो
- Final image से unnecessary packages और tools remove करो

Distroless images और Docker Hardened Images (dhi.io से) भी evaluate किए, लेकिन हमारे ज़्यादातर stack के लिए, `apt upgrade` approach ने security improvement और developer friction का सबसे अच्छा balance दिया।

## हफ़्ता 4: Keys, Upgrade, और External Test

### Access Keys से IRSA

यह सबसे impactful बदलाव था, और मैंने इसे आख़िरी हफ़्ते के लिए रखा ताकि nodes, API, और scanners पहले से अपनी जगह पर हों।

**Problem**: हर application जो AWS services (S3, DynamoDB, SQS, Kinesis, etc.) से बात करती थी, उसका अपना static access keys का set था। ये keys:
- Long-lived थीं (कुछ कभी rotate नहीं हुई थीं)
- Overly broad permissions थीं (अक्सर `s3:*` या worse)
- Environment variables में stored थीं, कभी-कभी code में commit

**Solution**: **IAM Roles for Service Accounts (IRSA)** — हर Kubernetes ServiceAccount एक specific IAM role से map होता है जिसमें scoped-down permissions।

हर application के लिए migration ऐसा दिखता था:

1. Trust policy के साथ IAM role create करो जो EKS OIDC provider को assume करने दे
2. Role की permissions को exactly वही scope करो जो application को चाहिए (जैसे specific S3 buckets read/write, specific DynamoDB tables)
3. IAM role ARN से annotated Kubernetes ServiceAccount create करो
4. Application की deployment update करो नए ServiceAccount इस्तेमाल करने के लिए
5. Verify करो कि application new role के साथ काम कर रही है
6. पुरानी access keys revoke करो

Python applications से शुरू किया (simpler AWS SDK configuration) और फिर Java apps पर गया। Cutover चलते हुए, पुरानी access keys पर VPC-restricted policies add किए — ताकि अगर leak हों भी, सिर्फ़ VPC के अंदर से इस्तेमाल हो सकें।

Applications migrate होने के बाद, पुरानी bot access keys revoke कीं और **Pod Identity Agent** को IRSA annotations के long-term replacement के रूप में deploy किया।

### Cluster Upgrade

सभी environments में EKS v1.30 से v1.31 upgrade किया। Process:

1. **Staging पहले**: Cluster version upgrade करो, फिर addons upgrade करो (CoreDNS, kube-proxy, VPC CNI — हर एक की cluster version के साथ compatibility matrix है), फिर नए AMIs के साथ nodes roll करो।
2. **UAT अगला**: Same process, integration tests से verify करो।
3. **Production last**: Same process, maintenance window और rollback plan के साथ।

सबसे tricky part **addon version matrix** है। हर EKS version के लिए हर addon के specific compatible versions हैं। मैंने Terraform में addon versions explicitly pin किए surprises से बचने के लिए।

### Final Cleanup

- Trivy findings के लिए कई services की Docker images patch कीं
- SonarCloud ने जो hardcoded credentials flag किए, उन्हें remove किया
- Frontend applications पर security headers update किए (HSTS, CSP, XSS protection)
- External **VAPT** (Vulnerability Assessment and Penetration Testing) complete की — starting point से security posture काफ़ी improve हो गया था

## नतीजा

| Area | पहले | बाद में |
|------|------|---------|
| Node OS | Amazon Linux 2 | Bottlerocket (CIS L1) |
| Container scanning | कोई नहीं | हर CI build में Trivy |
| SAST | कोई नहीं | हर PR पर SonarCloud |
| Access keys | Static, long-lived | IRSA / Pod Identity |
| EKS API | Public | Private (VPN-only) |
| WAF | कोई नहीं | सभी external ALBs पर AWS WAF |
| Branch protection | Optional reviews | Enforced 2+ reviews + सभी checks |
| External assessment | कमज़ोर | काफ़ी improved |

## अगर कोई यह शुरू कर रहा हो तो मेरी सलाह

1. **हफ़्ता 1 node OS और API है।** Bottlerocket और private endpoint application code छूने से पहले दो attack surfaces हटा देते हैं।
2. **हफ़्ता 2 visibility है।** SonarCloud और Trivy पहले log-only mode में चलाओ। Baseline समझो इससे पहले कि deployments block करना शुरू करो।
3. **हफ़्ता 4 IRSA है।** EKS पर सबसे बड़ा improvement। आख़िर में करो, एक service एक बार, और हर revoke तक पुरानी keys VPC तक सीमित रखो।
4. **Security project नहीं, habit है।** उस महीने के बाद भी, मैं weekly findings review करता हूँ और ज़रूरत अनुसार patch करता हूँ। Goal continuous improvement है, one-time checkbox नहीं।

इन hardening techniques की step-by-step guides के लिए, docs में [EKS Security Hardening Guide](/docs/eks-security-hardening) देखें।
