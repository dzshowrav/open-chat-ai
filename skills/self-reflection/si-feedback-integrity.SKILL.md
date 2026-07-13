---
name: si-feedback-integrity
description: A passing signal rarely proves what it seems to. Feedback is probabilistic, incomplete, hidden, ambiguous, absent, or biased — and the default habit is to accept what flatters and explain away what doesn't. Before treating a green test, a "looks good," or a success as proof, ask what it does NOT establish, and seek the disconfirming signal. Use when a result is about to be read as validation.
tags: [self-insight, metacognition, feedback, testing, confirmation-bias, dunning]
---

# Feedback Integrity — What a Green Light Doesn't Prove

**Decision rule:** Before a passing signal becomes "done," name the one thing it does NOT prove — then decide whether that gap matters.

## What this addresses

Agents are supposed to learn from outcomes: tests pass, the user says "great," the build is green. But raw experience does not automatically teach the right lesson — the feedback channel is lossy and biased, and the *habits* for reading it tilt toward self-confirmation. This skill treats every success signal as evidence that must be interrogated, not a verdict to be banked.

## When to apply

- A test, build, or check just passed and you're about to call the work correct
- The user said "looks good," "thanks," or went quiet — and you're reading that as confirmation
- You succeeded and are about to attribute it to your approach being right
- You're deciding what a result *means* before deciding what it *covers*

## Instructions

1. **Ask what the signal does NOT prove.** A green test proves the cases it tests passed — not that the behavior is correct, not that edge cases hold, not that you tested the right thing. State the boundary: "This confirms X; it does not touch Y."

2. **Account for the six ways feedback misleads.** Before trusting a signal, check whether it's *probabilistic* (worked once ≠ works), *incomplete* (only part of the behavior is observed), *hidden* (the failure is real but unobservable from here), *ambiguous* (could mean several things), *absent* (no signal is not a pass), or *biased* (the channel favors good news).

3. **Resist the self-serving reading.** The default habits: accept positive feedback at face value but scrutinize negative feedback until it goes away; credit success to your method but blame failure on the environment; remember the hits. Invert deliberately — scrutinize the *good* news as hard as the bad.

4. **Go looking for the disconfirming case.** Don't wait for failure to surface. Write the test that would fail if you're wrong. Seek the feedback that would contradict your self-image of "done," not the feedback that confirms it.

## What NOT to do

- Don't treat "no error" or silence as proof of correctness — absent feedback is not positive feedback.
- Don't explain away a failing signal to preserve a "done" conclusion.
- Don't claim credit for a success without checking whether it generalizes.
- Don't seek only the feedback likely to agree with you.

## In practice

> ✗ "Tests pass — the feature works."
> ✓ "Tests pass, proving the three cases they cover. They don't touch empty input or concurrent writes — the parts most likely to break. Adding those before I call it done."

## Why it works (Dunning's research)

Chapter 4 ("The Dearest Teacher") dismantles the assumption that experience reliably teaches self-insight. Dunning lists six structural failures of feedback: it is **probabilistic, incomplete, hidden, ambiguous, absent, and biased**. Worse, people's *monitoring habits* compound the problem: they focus on positive co-occurrences, create self-fulfilling prophecies, fail to recognize mistakes in hindsight, disproportionately seek feedback consistent with their self-image, **accept positive feedback while scrutinizing the negative**, code their positive actions broadly and negative ones narrowly, attribute good outcomes to self and bad ones to anything else, and simply misremember feedback. A meta-analysis found nearly **40% of organizational feedback interventions actually decreased performance** (Kluger & DeNisi, 1996). Experience is the dearest teacher precisely because the tuition is so often wasted.
