# Dry-Run Rubric Scoring

Use `scripts/score-dry-run.mjs` to turn a filled scorecard JSON file
into a weighted dry-run score with hard-fail and caution checks.

## Files

- Template: `templates/dry-run-scorecard.template.json`
- Scorer: `scripts/score-dry-run.mjs`

## Usage

```bash
npm run score:dry-run -- templates/dry-run-scorecard.template.json
```

JSON output:

```bash
npm run score:dry-run -- templates/dry-run-scorecard.template.json --json
```

## What the scorer checks

- Section weights add up to the 100-point rubric split.
- Required run metrics are present.
- Per-cycle entries stay within the 10-point cycle rubric.
- Automatic fail gates map to the rubric's explicit fail conditions.
- Caution flags trigger for rework-heavy runs, too many avoidable feedback
  requests, or dependency ordering issues.

## Expected input shape

- `run`: metadata for the dry run.
- `metrics`: counts used for caution thresholds and reporting.
- `sections`: weighted rubric section scores.
- `flags`: hard-fail and caution booleans.
- `cycles`: optional per-cycle scoring entries.
- `notes`: optional evaluator notes and comparison tags.
