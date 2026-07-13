---
name: si-define-the-criterion
description: Vague success words — done, clean, secure, fast, good, robust — get defined self-servingly to flatter whatever you produced. Pin the criterion to concrete, observable, falsifiable terms drawn from the task, BEFORE doing the work, so the bar can't move to meet the output. Use whenever success is stated in an ambiguous trait word.
tags: [self-insight, metacognition, ambiguity, definition, done-criteria, dunning]
---

# Define the Criterion — Pin "Done" Before You Move It

**Decision rule:** Translate the vague word (clean / fast / secure / done) into a falsifiable test *before* you build. If no result could fail it, the criterion is decorative.

## What this addresses

Ambiguous success words are evaluative blank checks. "Clean," "secure," "fast," "robust," "done," "good" have no fixed referent, so the agent is free — unconsciously — to define them in whatever way its current output happens to satisfy. The judgment then feels objective ("yes, this is clean") while being circular ("clean *means* what I did"). This skill nails the definition down *first*, while it can still be failed.

## When to apply

- Success is phrased as a trait: "make it clean / secure / fast / robust / production-ready / good"
- You're about to declare work "done" without a pre-agreed definition of done
- The task has a soft, judgment-call standard rather than a hard, checkable one
- You notice you're about to evaluate your own output against your own definition

## Instructions

1. **Translate the trait into observables, up front.** Before writing the solution, convert the vague word into concrete, checkable criteria: "fast" → "p95 < 200ms on the existing benchmark"; "clean" → "passes the linter, no function > 50 lines, no dead code"; "done" → an explicit checklist of behaviors. Write them where they're visible.

2. **Let the task define the bar, not the output.** Derive the criteria from the requirement and the user's need — not by looking at what you produced and reverse-engineering a standard it meets. If the definition arrived *after* the work, distrust it.

3. **Make it falsifiable.** A good criterion can be *failed*. If there's no result that would make you say "not done," the criterion is decorative. State the failing condition explicitly.

4. **Surface the definition to the user when it's load-bearing.** When "secure enough" or "good enough" is a judgment call with real stakes, name your working definition so the user can correct it before, not after.

## What NOT to do

- Don't self-grade against a standard you set after seeing your own work.
- Don't let "done" mean "I stopped."
- Don't use a trait word in a success claim without a concrete referent behind it.
- Don't pick the one sense of an ambiguous word that your output happens to satisfy and quietly ignore the others.

## In practice

> ✗ "Done — the endpoint is fast now."
> ✓ "Pinning 'fast' first: p95 < 200ms on the existing benchmark. Measured 240ms — not done. Here's the bottleneck."

## Why it works (Dunning's research)

Chapter 6 ("In a Word") shows that the **vagueness of trait terms** is what makes self-serving self-views possible. Most evaluative traits (and skills) lack sharp definitions, so people exploit the slack: they **define ambiguous traits in whichever way casts their own attributes as the relevant criterion** ("a good leader is one who has *my* particular strengths"). Dunning distinguishes *vertical* ambiguity (how much of a trait counts) from *horizontal* ambiguity (which behaviors count as the trait at all) — both give room to construct a flattering definition. Where standards are sharply defined and externally fixed, this degree of freedom vanishes and self-assessment tightens. The fix is to remove the ambiguity *before* judging: fix the criterion to concrete, task-derived, falsifiable terms so the bar can't slide to wherever the output already is.
