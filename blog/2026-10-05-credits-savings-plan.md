---
slug: credits-ran-out-first-savings-plan
title: "What to Do After Your Cloud Credits Run Out"
authors: [tanmay]
tags: [cloud, cost, aws, optimization]
description: "Post-credits cloud cost strategy: split bill into baseline (commit) vs variable (on-demand). 5-step order: list steady workloads, move to Spot first, buy 1-year no-upfront Compute Savings Plan, add RIs for databases only, skip <65% utilization. Baseline invoice mostly committed, API spend variable with own budget."
keywords: ["cloud credits expiration", "Savings Plan strategy", "Compute Savings Plan", "Reserved Instances", "Spot instances first", "cloud cost baseline", "FinOps after credits", "AWS commitment"]
image: /img/author.jpg
---

Credits hide the bill. The day they end, the same usage shows up as cash. The useful move is to split that bill into a baseline you can commit to, and a variable line you refuse to commit to, then buy the commitment only after the baseline is real.

{/* truncate */}

## Split the bill before you buy anything

Draw two lines.

- **Baseline.** The compute and databases that are still there after you have rightsized and moved what you can onto Spot. This is the number a Savings Plan or a reserved instance is allowed to cover.
- **Variable.** GenAI and other usage-based APIs. They swing with product traffic. A commitment here either strands money in a quiet month or runs out in a busy one. Leave them on demand and budget them separately.

Rightsizing comes before the commitment. A provider coverage suggestion, often something like 65% of current on-demand spend, is calculated on the bill you have today, including waste you are about to delete. Commit to the floor you expect to still be running, not to today's average.

## Order of operations

1. **List what is steady.** Karpenter node pools that change instance family every week are a Compute Savings Plan problem. Databases that sit on one engine and one size are a reserved-instance problem. Spot GPUs are neither. Do not cover them.
2. **Move eligible workloads to Spot first.** A Savings Plan is a promise to pay for on-demand compute. Shifting that compute to Spot later leaves the promise in place and the discount with nothing to apply to. Downsizing does not do that. Spot moves do.
3. **Buy a 1-year, no-upfront Compute Savings Plan under that floor.** No-upfront keeps the exit cheap if the floor was wrong. One year is long enough for the discount and short enough that a platform change does not outlive the contract.
4. **Add reserved instances only for the databases.** Do not stack a reserved instance and a Savings Plan on the same usage. One coverage instrument per resource.
5. **Skip anything that is busy less than about 65% of the time.** A box that is actually busy about a third of the hours costs more reserved, per hour you use it, than the same box on demand. For a GPU that only has to exist during a workday, hold capacity for that window instead of reserving the instance around the clock. That pattern is in [Booking g6 capacity before the workday](/blog/business-hours-gpu-capacity-reservations).

## What "done" looks like

The baseline invoice is mostly commitment, at a utilization you can actually hit. The API line is still variable, and it has its own budget. If a month is quiet, the Savings Plan is still earning its discount on the floor. If a month is loud, the overage is on demand, which is cheaper than having bought a plan sized for the peak.
