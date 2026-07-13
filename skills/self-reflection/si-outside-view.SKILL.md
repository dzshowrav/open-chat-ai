---
name: si-outside-view
description: For any estimate or prediction — time, effort, success likelihood, will-this-work — the inside view (spinning a scenario of how it goes) is systematically optimistic. Switch to the outside view: reference class, base rates, past data; predict the typical case, not the best case; apply a correction factor. The direct fix for the planning fallacy. Use on every estimate, ETA, or "this should work."
tags: [self-insight, metacognition, planning-fallacy, base-rates, estimation, outside-view, dunning]
---

# Outside View — Predict the Typical Case, Not the Best One

**Decision rule:** Don't read the estimate off your plan. Ask what tasks *like this one* actually take, predict the typical case, then pad it.

## What this addresses

When predicting an outcome, the natural move is to build a scenario: imagine the steps, see them succeed, read off the result. This *inside view* is the engine of the planning fallacy — it constructs the smooth path and ignores the distribution of what actually happens to tasks like this one. The fix is to step outside the single story and consult the reference class: what happens, on average, to projects of this type?

## When to apply

- Estimating time or effort ("this is a quick fix," "about an hour")
- Predicting success ("this should work," "this'll pass")
- Forecasting any future outcome that resembles things that have happened before
- You catch yourself reasoning forward through a best-case sequence of steps

## Instructions

1. **Name the reference class.** Ask: "What usually happens to tasks like this?" Not *this* migration — *migrations in general*. Not *this* bug — *bugs that present this way*. The class, not the instance.

2. **Pull the base rate / past data.** What's the actual track record? How often do "quick fixes" in this codebase turn out quick? How often does the first hypothesis turn out to be the bug? Use real history — including the times it went long — over the vividness of the current plan.

3. **Run the "predict someone else" trick.** Instead of "how long will *I* take," ask "how long would *a typical competent agent/dev* take on this?" Forecasting the generic case strips out the optimism that attaches to your own scenario, then use that as your estimate.

4. **Apply a correction factor.** Take the inside-view number and inflate it — the dam-builder repair (triple it) or the software repair (+30–50%). Don't argue with the intuition; just predict the real outcome will land worse than it.

5. **State estimates as ranges with named hidden costs**, never a single confident point.

## What NOT to do

- Don't read an estimate straight off a best-case scenario.
- Don't treat "this one is different" as a reason to ignore the base rate — that's what everyone in the reference class said.
- Don't drop the times it went badly from the data you're averaging over.
- Don't give a single-point ETA for work with unknowns.

## In practice

> ✗ "This migration's a quick fix — an hour."
> ✓ "Inside view says an hour. Migrations in this repo average a day once tests and rollback are counted. Estimate: half a day to a day."

## Why it works (Dunning's research)

Chapter 7 ("The Merest Decency") and Chapter 9 develop the **inside view vs. outside view** distinction (Kahneman & Lovallo). The planning fallacy persists because people adopt an inside view — focusing on the scenario of finishing early — while **ignoring distributional information**: how long comparable projects actually took, including the ones that ran over or never finished. Dunning's example: a curriculum team's most pessimistic inside estimate was 30 months; a member noted that *comparable* groups took 7+ years and ~40% never finished — the project took 8 years. The outside view is the corrective: factor in past data and the reference class. He even proposes the **"predict others, not yourself" trick** — forecasting the typical person's behavior yields a better self-prediction than introspection does, because self-prediction wrongly treats the self as exempt from the base rate.
