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
- `queue.initialReady`
- `queue.completed`
- `queue.approved`
- `queue.reopened`
- `truthGaps.detectedBeforeApproval`
- `truthGaps.escapedFalseCompletion`
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
