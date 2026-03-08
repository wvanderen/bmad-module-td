# Otto Evaluation Scorecard

Use `scripts/score-otto-run.mjs` to score an Otto dry run against the near-term roadmap goals in `docs/otto-roadmap-4-8-weeks.md`.

## Purpose

This scorecard tracks the composite success model for Otto:

- next-step decision agreement
- queue-drain rate with acceptable review outcomes
- catching PRD or runtime truth gaps before false completion

It also tracks the supporting behaviors that make those outcomes trustworthy:

- tight session continuity
- strong runtime evidence
- low babysitting overhead

## Files

- Template: `templates/otto-evaluation-scorecard.template.json`
- Scorer: `scripts/score-otto-run.mjs`

## Usage

```bash
npm run score:otto-run -- templates/otto-evaluation-scorecard.template.json
```

JSON output:

```bash
npm run score:otto-run -- templates/otto-evaluation-scorecard.template.json --json
```

## Evaluation Model

The scorecard uses both weighted section scores and computed operational metrics.

## Roadmap thresholds

Treat these as the default success thresholds for the current 4-8 week roadmap:

- `decisionAgreement >= 80%`
- `queueDrainRate >= 75%`
- `approvalRate >= 80%`
- `truthGapCatchRate = 100%`
- `sessionHopSuccessRate >= 75%`
- `oversight.humanInterventions <= 2`

These thresholds map the roadmap goals into something a real dry run can pass or miss.

### Weighted sections

- `decisionQuality` (30)
- `queueDrainQuality` (25)
- `productTruthDetection` (25)
- `contextDiscipline` (10)
- `operatorExperience` (10)

### Required metrics

- `nextStep.total`
- `nextStep.agreed`
- `nextStep.disagreed`
- `nextStep.uncertain`
- `queue.initialReady`
- `queue.completed`
- `queue.approved`
- `queue.reopened`
- `truthGaps.detectedBeforeApproval`
- `truthGaps.escapedFalseCompletion`
- `continuity.sessionHopAttempts`
- `continuity.sessionHopSuccesses`
- `continuity.compactionsUsed`
- `oversight.humanInterventions`

## Evidence expectations

The evaluator should weight signals closest to product truth more heavily:

1. real runtime behavior
2. PRD core-loop validation
3. human review of the working product
4. automated checks
5. workflow completion signals

Tests and workflow completion can support the judgment, but they should not dominate the score when runtime evidence is weak.

## Hard-fail gates

The score fails automatically if any of these are true:

- a false-completion case was approved
- a major PRD truth gap escaped detection
- decision quality was unreliable enough to drive repeated bad next-step choices

## Caution signals

The scorer also raises caution flags for patterns that should shape roadmap work:

- low decision agreement
- weak queue-drain quality
- excessive compaction or continuity loss
- too much human babysitting
- runtime evidence weaker than the apparent completion level

## Recommended use

- score real dry runs, not hypothetical runs
- keep evaluator notes concrete and example-based
- compare runs over time to see whether Otto is improving where it matters
- treat a lower score with strong notes as more useful than a flattering score with weak evidence

## Dry-run loop

1. Run Otto on a real roadmap-relevant task or issue set.
2. Fill in the scorecard JSON with counts, section scores, flags, and notes.
3. Run `npm run score:otto-run -- <filled-scorecard.json>`.
4. Check the overall score, hard-fail gates, caution flags, and per-target pass or miss status.
5. Turn repeated misses into the next control-plane, review-bar, drift-detection, or cockpit tasks.

This keeps evaluation tied to product-truth outcomes instead of a vague impression that the run felt good.
