# Self-Reflection & Metacognition Skills

A comprehensive collection of 10 metacognition skills inspired by Dunning's Self-Insight framework. These skills help AI agents calibrate their confidence, seek unbiased feedback, and avoid cognitive biases.

## Included Skills

| # | File | Purpose |
|---|------|---------|
| 1 | `si-calibration-gate.SKILL.md` | Calibrate confidence against actual accuracy |
| 2 | `si-competence-floor.SKILL.md` | Recognize minimum competence thresholds |
| 3 | `si-confidence-source.SKILL.md` | Trace confidence to evidence quality |
| 4 | `si-feedback-integrity.SKILL.md` | Maintain integrity when receiving feedback |
| 5 | `si-egocentric-check.SKILL.md` | Counteract egocentric bias in perspective-taking |
| 6 | `si-define-the-criterion.SKILL.md` | Define clear success criteria before evaluating |
| 7 | `si-outside-view.SKILL.md` | Adopt the outside view (base rates, reference class) |
| 8 | `si-construe-the-situation.SKILL.md` | Recognize how situations shape behavior |
| 9 | `si-corrective-feedback.SKILL.md` | Seek diagnostic corrective feedback |
| 10 | `si-blame-the-task.SKILL.md` | Attribute failure to task difficulty, not ability |

## Usage

Load individual skills as needed:
```
skill_use(skill_names=["si-calibration-gate"])
```

Or load all:
```
skill_use(skill_names=[
  "si-calibration-gate", "si-competence-floor", "si-confidence-source",
  "si-feedback-integrity", "si-egocentric-check", "si-define-the-criterion",
  "si-outside-view", "si-construe-the-situation", "si-corrective-feedback",
  "si-blame-the-task"
])
```
