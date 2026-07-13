---
name: si-corrective-feedback
description: Feedback is the riskiest thing you do — nearly 40% of feedback interventions make performance WORSE. The difference is altitude: criticism aimed at the task and the next concrete step helps; criticism aimed at the author's worth triggers self-protection and backfires. Attack the code, name the fix, frame the gap as closable. Use when you critique code, review a sub-agent's output, or push back on a user's plan.
tags: [self-insight, metacognition, feedback, code-review, communication, dunning]
---

# Corrective Feedback — Attack the Task, Not the Author

**Decision rule:** Aim every critique at the task and the next concrete step — never at the author's worth. Specific and closable beats a global verdict.

## What this addresses
Identifying a flaw is the easy half; delivering it so it actually closes the gap is the hard half, and the default style fails. Feedback that drifts up to the person ("this is sloppy," "you're not really thinking") pulls the recipient into defending their self-image instead of fixing the work — and measurably degrades performance. The discipline is to keep every criticism at the specific task level, paired with a concrete next step and a way to confirm it landed.

## When to apply
- You're about to flag a bug, smell, or design flaw in code under review
- You're evaluating a sub-agent's output and it fell short of the goal
- You're pushing back on a user's plan, assumption, or chosen approach
- You're writing a review summary, PR comment, or post-mortem note
- A harsh verdict ("this is bad / amateur / wrong") is forming — stop and re-aim it

## Instructions
1. **Aim at the behavior or location, never the worth of the author.** Say "this function has an unhandled null path at line 12" — not "this is sloppy." The first is fixable and lands; the second invites defense and stalls. Code and skill are the targets; the person never is.
2. **Be specific and actionable.** Name the exact location or behavior, the concrete fix or next step, and the check that confirms it's resolved. "Add a guard for `user == null` before line 12; the existing null-input test will then pass" beats "handle your edge cases."
3. **Always include the next step and a follow-up check.** Don't stop at the gap — give the move that closes it, then state how you'll re-verify (re-run the test, re-read the diff, re-assess). Identification without a path forward is just a verdict.
4. **Frame the gap as closable, not as a fixed trait.** Point at the change ("this needs a guard"), not an innate verdict ("you don't handle edge cases"). Treating skill and code as malleable makes the recipient redouble effort; treating it as fixed makes them withdraw and self-protect.
5. **Lead with what genuinely works before the problems.** On hard criticism — to a user, or a harsh review — open with the real strengths first, then the gaps. This keeps the recipient open to the disconfirming part instead of defensive. Make it true; hollow praise is transparent and backfires.
6. **Keep the standard narrow and task-specific.** Frame the bar as a specific skill ("the retry logic needs work") not a global one ("is this even production-grade?"). A narrow, task-level standard protects performance on the retry; a sweeping, ego-level one degrades it.
7. **Target the task GOAL, not a trivial sub-mechanic.** Specific means specific to what the code is *for*. "Tellers should smile more" misdirects when the goal is "make customers comfortable." Critique the unhandled-error path that breaks the user flow, not the variable name, when the flow is what's at stake.

## What NOT to do
- Don't issue global verdicts ("this is bad," "unclean," "amateur") — they're both less useful and easier to dismiss
- Don't attribute the flaw to the author's character, competence, or intelligence
- Don't frame a weakness as a fixed trait ("you always," "you never," "this is just how X is")
- Don't flag a problem without the concrete fix and the way to confirm it's fixed
- Don't over-narrow onto a nit (naming, style) while the real goal goes unaddressed
- Don't bury genuine strengths so deep the recipient only hears the attack
- Don't soften with fake praise — affirm what's actually true, then deliver the gap straight

## In practice

> ✗ "This code is sloppy and not production-grade."
> ✓ "Two specific gaps: unhandled null at line 12 (add a guard — the null-input test will then pass), and the retry has no backoff (add exponential). Both quick; the structure's solid."

## Why it works (Dunning's research)
Chapter 9 ("Correcting Erroneous Self-Views") treats feedback as a high-variance intervention, not a reliable good. A Kluger & DeNisi (1996) meta-analysis found that nearly **40% of feedback interventions DECREASED** performance — and the dividing line was altitude. Feedback at the specific task/behavior level ("produce 40 widgets/hr, not 35") helped; feedback at the person/ego level ("you're not really the best manager, are you?") distracted recipients into managing self-image instead of the task and hurt them (DeNisi & Kluger, 2000).

Kurman (2003) showed the framing of the *standard* matters as much as the content: students told a hard test measured "shape perception" (a specific skill) felt less negative emotion and improved on retry, while students told the identical test measured "global intelligence" got *worse* — a narrow, task-specific standard protects performance, a global one corrodes it. Dweck's malleability work (Dweck, 1999; Dweck & Leggett, 1988; Mueller & Dweck, 1998) explains the after-effect: framing a skill as improvable makes people redouble effort after failure, while framing it as fixed produces withdrawal and self-protection.

Steele's self-affirmation research (Steele, 1988; Sherman, Nelson & Steele, 2000; Cohen, Aronson & Steele, 2000; Reed & Aspinwall, 1998) explains why leading with genuine strengths works: affirming someone's worth before bad news lowers defensiveness and opens them to disconfirming information they'd otherwise reject. And DeNisi & Kluger (2000) supply the closing move — feedback should hand over the concrete next step and a follow-up check, not just mark the gap. The caveat runs the other way too: feedback can be *too* specific, fixating on a trivial sub-mechanic at the expense of the actual goal. Specific to the task goal and behavior — never to the person, never to a nit.
