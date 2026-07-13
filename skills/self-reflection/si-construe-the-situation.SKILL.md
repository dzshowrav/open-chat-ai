---
name: si-construe-the-situation
description: Most prediction errors are misread situations, not unknown selves. Before claiming "this will work," get the actual situation — read the real file, check the real env/config/versions, look at the real data shape and the error paths — instead of predicting against a clean, abstract, happy-path sketch. Lower confidence in proportion to how much of the real situation you haven't seen. Use before predicting any runtime behavior, claiming code will work, or estimating an outcome.
tags: [self-insight, metacognition, situation, affective-forecasting, prediction, dunning]
---

# Construe the Situation — Predict Against the Real One, Not the Imagined One

**Decision rule:** Before "this will work," get the real situation — the actual file, env, data, and error paths — not the clean version you'd design from scratch.

## What this addresses

When an agent predicts how code or a plan will behave, the prediction is only as good as its picture of the *situation* the code will actually run in. The default failure is not a gap in self-knowledge — it is **under-construal**: reasoning against a clean, abstract sketch (fresh state, default config, documented behavior, valid inputs, the happy path) instead of the real, specific, messy circumstances. The plan is "right" for a situation that does not exist. This skill forces the situation to be made concrete *before* the behavior is predicted.

## When to apply

- About to say "this will work," "this handles X," "this is safe to run"
- Predicting runtime behavior from a remembered file, a default config, or documentation rather than the actual current state
- Estimating an outcome where the inputs, environment, versions, or data shape are assumed rather than checked
- Reasoning about the happy path when malformed input, concurrency, empty/large data, or error paths are the part that will actually decide the result

## Instructions

1. **Get the situation before predicting the behavior.** Read the *real* file, not your memory of it. Check the *real* env, config, versions, and data shape. Look at the actual runtime/production context, not a generic one. The order is fixed: construe, then predict — never predict, then assume the situation matched.

2. **Name what you are assuming away.** List the concrete unknowns — input validity, state freshness, config values, version skew, data volume, network/filesystem conditions. Each silent assumption is a place the prediction is fictional. Surface them; do not absorb them.

3. **Construe the "hot" conditions, not just the cold ones.** The abstract picture is a cold-state guess. The behavior that actually ships happens under real load, real concurrency, real malformed input, real edge data — conditions invisible when reasoning abstractly. Predict against those explicitly, the way an honest forecast accounts for the moment, not the plan.

4. **Account for endowment and context shifts.** Owning a constraint changes it: an existing migration, a populated table, a config the user has already tuned, a file with local edits. Predict for the situation *as it now is* after those changes, not for the greenfield version you would design from scratch.

5. **Scale confidence to how much of the situation is unseen.** Every layer you assumed instead of checked lowers the prediction's reliability. State it: "this should work *given* X, Y, Z — which I have not verified." A cheap look at the real situation beats a confident claim about an imagined one.

## What NOT to do

- Don't predict behavior against a remembered file — re-read it; line numbers and contents drift.
- Don't assume clean inputs, default config, fresh state, or the documented behavior — those are the abstract sketch, not the situation.
- Don't reason only about the happy path when the error paths and edge data are what decide the outcome.
- Don't treat a plan that is correct in the abstract as correct in place — the concrete situation is where it is tested.
- Don't carry full confidence into a prediction whose situation you have mostly imagined.

## In practice

> ✗ "This handles the user list fine."
> ✓ "That assumed a populated, well-formed list. The real endpoint returns `null` on empty and paginates at 50 — re-checking against that before I claim it works."

## Why it works (Dunning's research)

Chapter 8 of *Self-Insight*, "Beyond One's Self," makes the case that many errors people make about their own future behavior are **not failures of self-knowledge but failures to read the situation** — "The Importance of Getting the Situation Right." Dunning separates two faults: **misconstruing** the situation (reading it wrong) and **under-construing** it (predicting against a vague, abstract version instead of filling in the concrete details of what the circumstance will actually be like). People forecast from a *cold* state and mispredict the *hot* one — they fail to anticipate how fear, embarrassment, and social inhibition will actually shape behavior in the moment (affective-forecasting errors). They also misjudge how **ownership and endowment** change valuation and behavior (the endowment effect), and they fail to learn this even from direct experience. The repair Dunning draws out is exactly this skill's discipline: get the situation right *before* predicting behavior, and dial back confidence because you may not know how the situation will actually play out. For an agent, the runtime *is* the situation — and the abstract, happy-path sketch is the under-construed one.
