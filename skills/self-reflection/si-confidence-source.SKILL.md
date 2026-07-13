---
name: si-confidence-source
description: Audit WHY something feels right before trusting the feeling. Three false cues — fluency (easy to generate), pseudorelevance (knowing a lot around the topic), and inherited self-view ("I'm good at this") — produce confidence unconnected to accuracy. Name the cue; if it's one of these, downgrade and verify. Use whenever a confident answer arrives without an explicit check.
tags: [self-insight, metacognition, fluency, confirmation-bias, dunning, verification]
---

# Confidence Source — Where Did This Certainty Come From?

**Decision rule:** Trace the confidence to its source. If it rests on fluency, adjacent knowledge, or a self-label rather than a check — downgrade it and verify.

> **Sits next to:** `si-calibration-gate` sizes the hedge; this skill *diagnoses* which bad cue (fluency / pseudorelevance / self-view) produced the false confidence in the first place.

## What this addresses

Confidence has to be *based on something*. When it isn't based on verified correctness, it's based on a cue that merely correlates with — or feels like — correctness. Dunning catalogues the bad cues. This skill makes the agent trace a confident answer back to its source and ask whether that source is actually load-bearing.

## When to apply

- A confident answer arrives and you can't point to the check that justifies it
- The topic is one you have a lot of *adjacent* knowledge about
- The answer was easy and smooth to generate
- You're reasoning from a self-label ("I'm good at X," "this is a standard pattern") rather than from the specifics in front of you

## Instructions

Run the three-cue audit. For the confident answer, ask: **what is this confidence actually resting on?**

1. **Fluency.** Did it feel confident *because it was easy to produce*? Ease of generation is not evidence of truth — smooth, well-formed, and plausible are free. If the only support is fluency, downgrade and verify.

2. **Pseudorelevant knowledge.** Am I confident because I know a *lot around* this topic, rather than the specific fact asked? Knowing the neighborhood is not knowing the address. Surrounding expertise inflates confidence in the exact claim without supporting it. Isolate the precise claim and check *that*.

3. **Top-down self-view.** Is the estimate leaking from a general self-label ("I'm strong at TypeScript") down onto this specific case? Pre-existing self-views bias performance estimates independent of the actual work. Judge the instance, not the identity.

4. **Then check for confirmatory bias.** Did I go looking only for reasons the answer is right? Deliberately search for the disconfirming case — the input that breaks it, the counter-example, the edge that fails.

If the confidence survives all four — i.e., it rests on a real check, not a cue — proceed. If not, label it provisional and verify.

## What NOT to do

- Don't mistake "I generated this smoothly" for "this is correct."
- Don't let broad familiarity with a domain stand in for the specific answer.
- Don't reason from "I'm good at this kind of thing" — that's the identity, not the evidence.
- Don't only collect confirmations; one disconfirming test is worth ten agreements.

## In practice

> ✗ "I know this library well, so `.flush()` writes synchronously."
> ✓ "That's the 'I know this library' cue (self-view), not a check. Reading the source: flush is buffered. Glad I looked."

## Why it works (Dunning's research)

Chapter 3 ("Clues for Competence") asks where confidence comes from when it's *not* tied to performance. Three sources recur: **explicit reasoning that is only "pseudorelevant"** (people grow confident from knowledge that surrounds but doesn't bear on the answer), **fluency** (the subjective ease of processing gets misread as a signal of correctness, with direct implications for learning — material that feels easy feels learned), and **top-down use of pre-existing self-views** (manipulating someone's self-image shifts their performance estimates even when actual performance is unchanged). Layered on top is **confirmatory bias** — seeking evidence that supports the favored conclusion. None of these cues is reliably connected to being right, which is why the audit, not the feeling, decides.
