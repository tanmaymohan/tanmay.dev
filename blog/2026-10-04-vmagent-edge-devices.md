---
slug: vmagent-over-alloy-for-edge-devices
title: "Why I Chose vmagent over Grafana Alloy for Edge Devices"
authors: [tanmay]
tags: [observability, aws, networking]
description: "Why vmagent beat Grafana Alloy for edge device monitoring: 20 GB on-disk queue vs 8-hour WAL, per-device tokens via vmauth, path-locked ALB + WAF, macOS launchd, 3-step onboarding. VictoriaMetrics + Grafana read-only architecture."
keywords: ["vmagent vs Alloy", "edge device monitoring", "VictoriaMetrics", "vmauth", "Grafana Alloy", "on-prem metrics", "macOS launchd", "device token authentication"]
image: /img/author.jpg
---

On-prem workstations were reporting health by cron scripts that posted into chat. The replacement ships metrics from macOS and Linux machines into VictoriaMetrics. Planning docs looked at Grafana Alloy over Tailscale. That is not what shipped.

{/* truncate */}

```mermaid
flowchart LR
    subgraph DEV["On-prem workstation"]
        NE["node_exporter"] --> VA["vmagent, allow-list, 20 GB disk queue"]
    end
    VA -->|"HTTPS POST, device token"| ALB["Public ALB plus WAF, path-locked"]
    ALB --> VMA["vmauth, per-device tokens"]
    VMA --> VMDB["VictoriaMetrics"]
    VMDB --> GF["Grafana, read-only token"]
    DEV -->|"heartbeat push"| UK["Uptime Kuma"]
```

`node_exporter` and **vmagent** run on the device. An allow-list means only `node_*` and `up` leave the machine. Logs stay local. vmagent keeps a **20 GB on-disk queue**, so a site that goes dark for days still drains when the link returns. Alloy's write-ahead log covers roughly **8 hours**. That was the deciding gap.

Devices push HTTPS to a **path-locked public ALB with WAF**. The default response is 403. Only POST on the write path is allowed. **vmauth** checks a per-device token and forwards to VictoriaMetrics. Grafana reads with a different, read-only token. Uptime Kuma, in push mode, alerts when heartbeats stop, which is how you notice a powered-off machine that cannot scrape itself.

Naming is a `device_id` plus a token. macOS keeps the agent up with `launchd`. Onboarding is three steps: a short doc, a script that registers the token, and an onboard script for Linux or Mac. Status codes in the troubleshooting guide map to device, network, receiver, or Grafana, so a 403 is not treated as "the agent is down."

This is phase 3 of the rollout, not a finished fleet.
