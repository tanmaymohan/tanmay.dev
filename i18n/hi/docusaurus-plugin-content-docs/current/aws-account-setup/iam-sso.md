---
sidebar_position: 1
---

# IAM Identity Center (SSO)

AWS IAM Identity Center (पहले AWS SSO) individual IAM users की जगह centralized, federated access देता है। Users एक बार corporate identity से sign in करते हैं और AWS Console और CLI के लिए temporary credentials पाते हैं।

## IAM Users से क्यों Migrate करें

| IAM Users | IAM Identity Center |
|-----------|-------------------|
| Static passwords + access keys | Temporary session credentials |
| Per-user MFA configuration | Identity provider enforce करता है MFA |
| Manual user lifecycle management | IdP sync से automatic |
| Key rotation manual | Rotate करने को keys ही नहीं |
| Stale users जमा होना आसान | IdP से हटाने पर users disable |

## Google Workspace के साथ Setup

### 1. IAM Identity Center Enable करो

AWS Console में: IAM Identity Center → Enable। Identity store के लिए AWS Region choose करो।

### 2. Google Workspace को Identity Provider Configure करो

- IAM Identity Center में: Settings → Identity source → External identity provider में बदलो
- AWS से SAML metadata download करो
- Google Workspace Admin में: Apps → Web and mobile apps → SAML app add → AWS metadata upload करो
- Google IdP SAML metadata URL और SSO URL copy करके AWS में वापस paste करो

### 3. Users Provision करो

या तो manually IAM Identity Center में Google Workspace email addresses match करने वाले users create करो, या automatic sync के लिए SCIM provisioning set up करो।

### 4. Permission Sets Assign करो

Permission sets create करो ([Permission Sets guide](../permission-sets) देखो) और specific AWS accounts के लिए users या groups को assign करो।

## Console Access

Users SSO portal से AWS Console access करते हैं:

1. SSO portal URL पर navigate करो (जैसे `https://your-org.awsapps.com/start`)
2. Google Workspace credentials से sign in करो (Google SAML auth पर redirect)
3. MFA Google enforce करता है — कोई अलग AWS MFA नहीं चाहिए
4. Account और role select करो console launch करने के लिए

## CLI Access

Temporary credentials के साथ CLI access:

1. SSO portal पर जाओ
2. Account dropdown → "Access Keys" click करो
3. Temporary credentials copy करो:

```bash
export AWS_ACCESS_KEY_ID="ASIA..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_SESSION_TOKEN="..."
```

ये credentials session duration (typically 1-8 hours) के बाद expire हो जाते हैं। Keys shell history में paste करने से बेहतर है `aws configure sso` और `aws sso login`।

```bash
aws configure sso
# session expire होने पर:
aws sso login --profile my-profile
```

### Alternative: aws-vault

SSO profiles के साथ smoother CLI workflow के लिए [aws-vault](https://github.com/99designs/aws-vault) से session exec करो। Identity Center के लिए **`aws-vault add` मत चलाओ** — वो long-lived IAM keys store करता है।

```bash
# ~/.aws/config
[profile my-profile]
region = ap-south-1
sso_start_url = https://your-org.awsapps.com/start
sso_region = ap-south-1
sso_account_id = 123456789012
sso_role_name = EngineeringEditor

aws-vault exec my-profile
```

## IAM Users Retire करना

Users SSO पर onboard होने के बाद:

1. IAM users के लिए console access disable करो
2. Access keys revoke करो (confirm करने के बाद कि applications IRSA या अन्य role-based access पर migrate हो गई हैं)
3. IAM user को disabled state में audit period के लिए रखो
4. Retention period के बाद delete करो

इसमें जल्दबाज़ी मत करो — ensure करो कि सभी applications, scripts, और CI/CD pipelines IAM user credentials से migrate हो गई हैं delete करने से पहले।
