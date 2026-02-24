# @wvanderen/bmad-module-td

A BMAD Method module for integrating with td CLI task management.

## Overview

This module connects BMAD planning artifacts with td CLI for enhanced observability and the Ralph Wiggum development loop.

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

## Core Workflows

| Workflow        | Command                  | Description                             |
| --------------- | ------------------------ | --------------------------------------- |
| create-td-story | `/bmad:td:create-story`  | Create story with td epic + task issues |
| td-dev-next     | `/bmad:td:dev-next`      | Ralph Wiggum loop - implement next task |
| td-dev-task     | `/bmad:td:dev-task <id>` | Implement specific task by td ID        |
| td-review-story | `/bmad:td:review-story`  | Epic-level code review                  |
| td-sync         | `/bmad:td:sync`          | Bidirectional sync story ↔ td           |
| td-status       | `/bmad:td:status`        | Show story td integration status        |

## Ralph Wiggum Loop

The td-dev-next workflow implements one task per session for maximum speed and reduced context rot:

1. `td next` - Get next ready task
2. Load story context
3. Implement single task (TDD)
4. Validate tests pass
5. Update story file
6. **Git commit** (excellent message)
7. `td handoff` - Capture details
8. `td review` - Submit for review

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

```bash
# Run linting
npm run lint

# Fix formatting
npm run format:fix

# Run tests
npm test
```

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
