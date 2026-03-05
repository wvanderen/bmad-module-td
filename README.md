# @wvanderen/bmad-module-td

A BMAD Method module for integrating with td CLI task management.

## Overview

This module connects BMAD planning artifacts with td CLI using a focused command model.

**Philosophy:** td is state, BMAD is structure

- **BMAD `.md` files** hold structured planning artifacts (epics, stories, architecture)
- **td issues** hold execution state (status, dependencies, reviews)
- **sidecar** provides observability

## Installation

```bash
# Install the module
npm install @wvanderen/bmad-module-td

# Register with BMAD (run from your project root)
npx bmad-method install --custom-content ./node_modules/@wvanderen/bmad-module-td --action update --yes
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

## next-step Priority

The `next-step` workflow uses this strict priority order:

1. Reviews (highest)
2. Implement ready issues
3. Epic workflows (create-story for empty epics, code-review for completed epics)

`next-step` runs entirely from its workflow instructions and does not depend on an external skill file.

## Validation Methodology

`setup-validation` creates and maintains a project-specific validation config at `{config:validation_methodology_file}`.

- This is a critical review and implementation gate.
- Agents must verify changes beyond tests (for example: lint, typecheck, build, smoke, security checks where available).
- If validation config is missing, `next-step` runs fallback checks and reports reduced confidence.

## Commit Message Format

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

- `.`: BMAD td module package source (publishable)
- `packages/pi-bmad-autopilot`: Pi autopilot workspace package
- `examples/pi-extension`: extension file used for local Pi installation

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

## Pi Extension Prototype

This repository includes a local Pi extension prototype for autonomous BMAD execution:

- `examples/pi-extension/bmad-autopilot.ts`
- `examples/pi-extension/README.md`

It provides an autopilot loop for `/bmad:td:initialize -> /bmad:td:next-step`, workflow monitoring, and checkpoint-based session dive tools.

## Publishing

```bash
# Patch release
npm run release

# Minor release
npm run release:minor

# Major release
npm run release:major
```

## License

MIT License — see LICENSE for details.

---

Part of the [BMad Method](https://github.com/bmad-code-org) ecosystem.
