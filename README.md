# BMAD TD Monorepo

Monorepo for:

- `packages/bmad-module-td` - BMAD td-integration module
- `packages/otto` - Otto, the Pi extension for autonomous BMAD execution

## Overview

This module connects BMAD planning artifacts with td CLI using a focused command model.

**Philosophy:** td is state, BMAD is structure

- **BMAD `.md` files** hold structured planning artifacts (epics, stories, architecture)
- **td issues** hold execution state (status, dependencies, reviews)
- **sidecar** provides observability

## Installation

```bash
# Install from npm (module package)
npm install @wvanderen/bmad-module-td

# Or install from local monorepo package path
npx bmad-method install --custom-content /path/to/repo/packages/bmad-module-td --action update --yes
```

**Note:** The `--custom-content` flag is required because this is a community module not yet in the official BMAD registry.

## Requirements

- td CLI installed and initialized
- Git repository
- BMM module (planning artifacts)

## Commands

| Command                     | Description                                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `/bmad:td:initialize`       | Accept-default onboarding for greenfield or brownfield projects; sets up BMAD artifacts and td dependency mapping |
| `/bmad:td:setup-validation` | Configure project validation methodology used as a critical verification gate                                     |
| `/bmad:td:next-step`        | Unified executor that analyzes workspace state and performs the highest-priority action                           |
| `/bmad:td:validate-prd`     | Validate completed work against PRD requirements, create td follow-up gaps, and report residual risk              |

## next-step Priority

The `next-step` workflow uses this strict priority order:

1. Reviews (highest)
2. Implement ready issues
3. Epic workflows (create-story for empty epics, code-review for completed epics)
4. PRD validation when no reviewable, ready, or epic-maintenance work remains

`next-step` runs entirely from its workflow instructions and does not depend on an external skill file.

## Completion Validation

When execution work is drained, run `/bmad:td:validate-prd` to compare delivered work against PRD requirements.

- It traces PRD requirements against stories, td issues, and delivered evidence.
- It creates new td tasks for missing or partial requirements instead of silently declaring completion.
- If no actionable gaps remain, it reports completion with residual risk and recommended follow-up only when needed.

## Validation Methodology

`setup-validation` creates and maintains a project-specific validation config at `{config:validation_methodology_file}`.

- This is a critical review and implementation gate.
- Agents must verify changes beyond tests (for example: lint, typecheck, build, smoke, security checks where available).
- If validation config is missing, `next-step` runs fallback checks and reports reduced confidence.

### Profile-Based Validation Selection

The validation template supports profile-based gate selection so verification can adapt to project type and runtime context.

- Dimensions: `project_type` (`web`, `cli`, `tui`, `hybrid`), `platform` (`linux`, `macos`, `windows`, `cross-platform`), and `requirement_class` (for example `ui-visual`, `api`, `data`).
- Matching: profiles support explicit values and `*` wildcard matching.
- Deterministic merge order: sort matching profiles by `priority` ascending, then `id` ascending.
- Gate conflict rule: when a gate id appears in multiple matching profiles, the first match in deterministic order wins.
- Fallback: use configured fallback profile; if unavailable, fall back to legacy `gates.mandatory` and `gates.optional` and mark reduced confidence.

Backward compatibility is preserved: existing flat-gate methodology files remain valid without profile sections.

### Visual Evidence Gates

UI-impacting `web` and `hybrid` work must carry visual evidence as part of validation:

- Required gates: `visual-regression`, `contrast`, and `visual-stability` are added to matching UI profiles.
- Required artifacts: desktop and mobile screenshots, plus command output or an explicit skip rationale for each unavailable visual check.
- Reduced confidence: if browser automation, screenshot capture, or contrast tooling is unavailable, `next-step` and reviews must mark confidence as reduced and record compensating checks.

### Evidence Output Contract

Validation evidence should stay machine-checkable across implementations and reviews.

- Required fields: validation context, changed files, gate results, artifact references, confidence, risks, and follow-up issues.
- Approval-grade work should also map changed behavior to PRD, story, or issue requirements and explicitly distinguish real runtime evidence from mocked, simulated, placeholder, or artifact-only signals.
- Web UI work: include screenshot paths or URLs and visual check outputs.
- CLI/TUI work: include representative command transcripts, terminal captures, or equivalent runtime evidence.

## Git Commit Standards

- Create the git commit before `td review`.
- Use lowercase conventional types: `feat`, `fix`, `refactor`, `docs`, `test`, or `chore`.
- Keep the subject in imperative mood, lowercase after the colon, with no trailing period.
- Normalize the subject by trimming whitespace, collapsing duplicate spaces, and removing trailing punctuation.
- Keep the body field order stable: `Task`, `Story`, `td`, implementation bullets, `Tests`, `Refs`.

### Commit Message Format

```
feat(story-X.Y): brief description

Task: {task description}
Story: {story_key}
td: {td_issue_id}

- Implementation details

Tests:
- Test summary

Refs: {td_issue_id}
```

## Development

### Workspace Layout

- `packages/bmad-module-td`: BMAD td module source (publishable)
- `packages/otto`: Otto workspace package for Pi (`@wvanderen/otto`)
- `examples/pi-extension`: local extension fixture for Pi

Operational details: `docs/monorepo-ops.md`

### Sync Source -> Installable Mirror

`_bmad/td-integration` is treated as an installable mirror of module source files.

```bash
# Sync source files into _bmad/td-integration mirror
npm run sync:module

# Check mirror drift (used in test)
npm run sync:check

# Run linting
npm run lint

# Fix formatting
npm run format:fix

# Run tests
npm test
```

## Otto

This repository includes Otto, a Pi-native operating layer for BMAD + td execution:

- `packages/otto`
- `examples/pi-extension/otto.ts`
- `examples/pi-extension/README.md`

Otto is built for developer AI power users who already work fluently inside coding agents and want the next real jump in velocity.

What Otto is optimized for:

- tight, fresh context across repeated execution loops
- strong next-step judgment instead of generic long-context wandering
- review and approval discipline that respects td session separation
- real runtime validation over artifact-only completion signals
- closed-loop execution that can reopen PRD gaps as actionable td work

Current Otto capabilities include:

- an automation loop for `/bmad:td:initialize -> /bmad:td:next-step -> /bmad:td:validate-prd`
- a Pi onboarding flow via `/otto-onboard` that writes project-wide Otto preferences
- workflow wrappers for BMAD planning and review flows
- workflow monitoring, failure budgets, and persisted run state
- fresh-session continuation with checkpoint-based dive and fork tools
- layered JSON preferences from `.otto.json`, `.pi/otto.json`, legacy autopilot config files, and `OTTO_CONFIG`/`BMAD_AUTOPILOT_CONFIG`
- per-workflow execution modes such as `party` for higher-steering workflows
- a packaged `otto` SKILL resource for Pi agents

Otto strategy docs:

- `docs/otto-manifesto.md`
- `docs/otto-dna-roadmap.md`
- `docs/otto-roadmap-4-8-weeks.md`

## Publishing

```bash
# Validate both workspace packages before release/CI
npm run release:check

# Bump module package version (choose one)
npm run release:module:patch
npm run release:module:minor
npm run release:module:major

# Publish module package
npm run publish:module

# One-step bump + publish
npm run release:module:patch:publish

# Bump Otto package version (choose one)
npm run release:otto:patch
npm run release:otto:minor
npm run release:otto:major

# Publish Otto package
npm run publish:otto

# One-step bump + publish
npm run release:otto:patch:publish
```

## License

MIT License — see LICENSE for details.

---

Part of the [BMad Method](https://github.com/bmad-code-org) ecosystem.
