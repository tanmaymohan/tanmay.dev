---
sidebar_position: 1
---

# IAM Identity Center (SSO)

AWS IAM Identity Center (formerly AWS SSO) replaces individual IAM users with centralized, federated access. Users sign in once with their corporate identity and get temporary credentials for the AWS Console and CLI.

## Why Migrate from IAM Users

| IAM Users | IAM Identity Center |
|-----------|-------------------|
| Static passwords + access keys | Temporary session credentials |
| Per-user MFA configuration | MFA enforced by the identity provider |
| Manual user lifecycle management | Automatic via IdP sync |
| Key rotation is manual | No keys to rotate |
| Easy to accumulate stale users | Users disabled when removed from IdP |

## Setting Up with Google Workspace

### 1. Enable IAM Identity Center

In the AWS Console: IAM Identity Center → Enable. Choose the AWS Region for your identity store.

### 2. Configure Google Workspace as the Identity Provider

- In IAM Identity Center: Settings → Identity source → Change to External identity provider
- Download the SAML metadata from AWS
- In Google Workspace Admin: Apps → Web and mobile apps → Add SAML app → Upload the AWS metadata
- Copy the Google IdP SAML metadata URL and SSO URL back into AWS

### 3. Provision Users

Either manually create users in IAM Identity Center that match Google Workspace email addresses, or set up SCIM provisioning for automatic sync.

### 4. Assign Permission Sets

Create permission sets (see [Permission Sets guide](../permission-sets)) and assign them to users or groups for specific AWS accounts.

## Console Access

Users access the AWS Console through the SSO portal:

1. Navigate to the SSO portal URL (e.g., `https://your-org.awsapps.com/start`)
2. Sign in with Google Workspace credentials (redirects to Google for SAML auth)
3. MFA is enforced by Google — no separate AWS MFA needed
4. Select the account and role to launch the console

## CLI Access

For CLI access with temporary credentials:

1. Go to the SSO portal
2. Click on the account dropdown → "Access Keys"
3. Copy the temporary credentials:

```bash
export AWS_ACCESS_KEY_ID="ASIA..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_SESSION_TOKEN="..."
```

These credentials expire after the session duration (typically 1-8 hours). Prefer `aws configure sso` plus `aws sso login` over pasting keys, so credentials stay in the SSO cache instead of your shell history.

```bash
aws configure sso
# then, when the session expires:
aws sso login --profile my-profile
```

### Alternative: aws-vault

For a smoother CLI workflow with SSO profiles, use [aws-vault](https://github.com/99designs/aws-vault) to exec into a session. Do **not** use `aws-vault add` for Identity Center — that command stores long-lived IAM keys.

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

## Retiring IAM Users

Once users are onboarded to SSO:

1. Disable console access for IAM users
2. Revoke access keys (after confirming applications have migrated to IRSA or other role-based access)
3. Keep the IAM user in a disabled state for an audit period
4. Delete after the retention period

Do not rush this — ensure all applications, scripts, and CI/CD pipelines have been migrated off IAM user credentials before deleting them.
