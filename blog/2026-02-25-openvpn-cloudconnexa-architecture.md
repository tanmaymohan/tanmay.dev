---
slug: openvpn-cloudconnexa-architecture
title: "Designing VPN Access for a Team That Needs Strict Compliance"
authors: [tanmay]
tags: [security, networking, compliance]
description: "How I designed a compliant VPN architecture using OpenVPN CloudConnexa with Google SAML SSO, split tunneling, and device registration. Replaced public-facing internal tools with zero-trust access."
keywords: ["zero-trust VPN", "CloudConnexa", "OpenVPN", "Google SAML SSO", "compliance VPN", "split tunneling", "internal tools security"]
image: /img/author.jpg
---

When I joined as the infrastructure lead, internal tools like dashboards, databases, and monitoring were accessible over the public internet — protected only by application-level authentication. That is not good enough when you are handling sensitive data in a regulated environment. I needed a VPN solution that was easy to manage, met compliance requirements, and did not slow down the team.

Here is how I designed it using **OpenVPN CloudConnexa**.

{/* truncate */}

## The Requirements

1. **All internal tools behind VPN**: Dashboards, databases, internal APIs, monitoring — none of these should be reachable from the public internet.
2. **Compliance-ready**: The setup needed to align with ISO 27001 and other security standards — encryption in transit, access logging, periodic audits.
3. **Easy onboarding**: New team members should be able to set up VPN access in under 10 minutes without IT hand-holding.
4. **Single identity**: No separate VPN credentials. Use the same corporate identity (Google Workspace) that the team already uses for everything else.

## Why CloudConnexa

I evaluated self-hosted OpenVPN, WireGuard, and Tailscale before settling on CloudConnexa. The deciding factors:

- **Cloud-hosted**: No VPN server to maintain, patch, or scale. CloudConnexa runs as a managed service.
- **Multi-cloud connectivity**: I needed to connect VPCs across AWS and GCP. CloudConnexa acts as a hub that interconnects both.
- **SAML integration**: Native support for Google Workspace as an identity provider meant I could enforce the same MFA policies across VPN access and everything else.

## The Architecture

### Split Tunnel

The VPN is configured as a **split tunnel**: only traffic destined for internal network ranges is routed through the VPN tunnel. All other internet traffic goes directly from the user's device to the internet.

This is important for two reasons:
- **Performance**: Users do not experience slower browsing, video calls, or downloads because that traffic never touches the VPN.
- **Cost**: VPN bandwidth is metered. Routing all traffic through the tunnel would be wasteful and expensive.

### Authentication

- **Google SAML SSO**: Users sign in with their corporate Google account. No separate VPN username/password.
- **Enforced MFA**: Google Workspace enforces multi-factor authentication for all users. Since VPN auth goes through Google, MFA is automatically required for VPN access too.
- **Automated profiles**: When a user logs in for the first time, their VPN profile is automatically generated and deployed to the OpenVPN Connect app. No manual config file distribution.

### Device and Location Policies

- **Single device per user**: Each person can register one device (their work laptop) for VPN access. This prevents credential sharing and limits the attack surface.
- **Geographic restriction**: VPN connections are only accepted from within India. This is enforced at the CloudConnexa level and adds a layer of protection against compromised credentials being used from unexpected locations.
- **Shield**: CloudConnexa's Shield feature provides an additional security layer that continuously monitors the connection for potential threats.

## What Goes Behind the VPN

After deploying CloudConnexa, I moved all internal tools behind it:

- Business intelligence dashboards
- LLM observability platform
- CI/CD platform UI
- Database admin access
- Internal APIs and microservice endpoints that do not need external exposure
- Configuration management tools
- Monitoring and alerting dashboards

The traffic flow for all of these is the same: **VPN user → Route 53 DNS → Internal load balancer (with TLS) → Service**.

The internal load balancers are not reachable from the public internet. They live in private subnets and only accept traffic from the VPN CIDR range and the VPC itself.

## Compliance Alignment

For teams operating in regulated environments, here is what this architecture provides:

| Requirement | How it is met |
|-------------|--------------|
| Encryption in transit | All VPN traffic encrypted using OpenVPN protocol; internal ALBs terminate TLS |
| Access logging | CloudConnexa maintains detailed logs of user connections, authentication events, and DNS queries |
| MFA enforcement | Handled by Google Workspace SAML — no way to bypass |
| Periodic audits | Connection logs and DNS logs are exportable for audit review |
| Access control | Only specific user groups can access specific applications behind the VPN |
| Device control | Single registered device per user |

## The Onboarding Flow

This is what a new team member does on day one:

1. Navigate to the CloudConnexa portal URL
2. Sign in with their corporate Google account (redirects to Google SAML)
3. Download the OpenVPN Connect app for their OS
4. The profile is automatically imported into the app
5. Select the nearest region and connect

Total time: under 5 minutes. No IT tickets, no config files, no manual steps.

## What I Would Do Differently

- **Point-to-point rules**: Currently, once you are on the VPN, you can reach any host on the internal network. A more mature setup would restrict access based on user group — for example, developers can only reach staging, not production databases. This is on my roadmap.
- **MDM integration**: Combining VPN access with a mobile device management solution would let me enforce device-level policies (encryption, OS version, patch level) as a condition for VPN access.

## Key Takeaway

A managed VPN like CloudConnexa removes the operational burden of self-hosting while still giving you enterprise-grade access controls. The combination of SAML SSO, enforced MFA, split tunneling, and geographic restrictions covers most compliance requirements without overengineering the solution.

The best part: it took about a week to set up, and onboarding a new user takes 5 minutes.
