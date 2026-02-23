---
slug: cost-optimization-journey
title: My Cost Optimization Journey in Q3 2025-26
authors: [tanmay]
tags: [cloud, cost, optimization]
---

I am starting a focused journey to understand and reduce cloud costs without
hurting reliability or developer velocity.

<!-- truncate -->

In the coming weeks I will share:

- How I reduced cloud costs by almost 10k USD
- Early wins and the changes that made the biggest impact
- Mistakes, reversals, and what I learned from them

If you are working on cost optimization too, I hope these notes help you , feel free to connect on my social to add more or comments


*** Learning #1

** Kubernetes pod packing

Always remember to configure the requests and limit sections of your deployments properly. In my case some of my old apps which are not in use were using default values or values greater than what they actually required during runtime. Therefore to free up cpu and memory from those I reconfigured all my applications (I use Devtron for Management) on staging/UAT environments first. Once satisfied and stable the activity was done on production as well. This activity resulted in me knowing my stack is primarily memory heavy and cpu usage is very minimal. 
I was earlier using a mix of m6a.xlarge, c7i-flex and r6a.xlarge machines on my staging/UAT clusters. But after the change I completely used r6a.xlarge and r6a.2xlarge for all the environments . Using Vantage's MCP server connected to my Cursor app, it became very easy to browse the different instance types using chat and determine the lowest price for spot in the ap-south-1 region. 

Result : Lower number of instances, better bin packing, and less number of daemonset pods

*** Learning #2

**Change of GPU usecase

I was using the g6.xlarge and g6.2xlarge instance for one of whisper audio usecase, where I had given full node to a single pod only. The running usecases for 
