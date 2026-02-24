# td-integration Module

BMAD expansion module for integrating with td CLI task management.

## Philosophy

**td is state, BMAD is structure**

- **BMAD `.md` files** hold structured planning artifacts (epics, stories, architecture, PRD)
- **td issues** hold execution state (status, dependencies, reviews)
- **sidecar** provides observability

## Installation

This module is installed in `_bmad/td-integration/`.

## Core Workflows

### 1. create-td-story

Creates a BMAD story file AND syncs to td as an epic with child task issues.

```
/bmad:td:create-story
```

**What it does:**
1. Creates comprehensive story file (same as BMM create-story)
2. Creates td epic for the story
3. Creates td issues for each task (with dependencies)
4. Embeds td references in story file

### 2. td-dev-next (Ralph Wiggum Loop)

Implements ONE task per session using the Ralph Wiggum loop.

```
/bmad:td:dev-next
```

**The Loop:**
1. `td next` - Get next ready task
2. Load story context
3. Implement single task (TDD: red-green-refactor)
4. Validate tests pass
5. Update story file
6. **Git commit** with excellent message
7. `td handoff` - Capture implementation details
8. `td review` - Submit for review

**Why one task per session?**
- Maximum speed
- Reduced context rot
- Clean handoffs for reviews
- Dependencies respected automatically

### 3. td-review-story

Epic-level code review after all tasks are complete.

```
/bmad:td:review-story
```

**Prerequisites:**
- All td issues under epic must be closed
- Must run in DIFFERENT session than implementation

**What it does:**
1. Verifies all tasks are approved
2. Loads story context and changes
3. Executes adversarial code review
4. Creates followup issues or approves epic

### 4. td-sync

Bidirectional sync between story file and td.

```
/bmad:td:sync
```

**Detects drift:**
- Story task [x] but td issue open
- td issue closed but task [ ]
- Missing td references
- Status mismatches

### 5. td-status

Shows td integration status for a story.

```
/bmad:td:status
/bmad:td:status story=1-2-auth
```

## File Structure

```
_bmad/td-integration/
├── config.yaml                    # Module configuration
├── data/
│   ├── td-status-mapping.yaml     # BMAD ↔ td status translations
│   └── td-field-schema.yaml       # Field mapping definitions
├── tasks/
│   └── td-ops.xml                 # Reusable td CLI operations
├── templates/
│   └── td-story-template.md       # Story template with td section
└── workflows/
    ├── create-td-story/           # Story creation with td sync
    ├── td-story-dev/              # Ralph Wiggum loop
    ├── td-story-review/           # Epic-level review
    └── sync-story-td/             # Bidirectional sync
```

## Commit Message Format

```
feat(story-X.Y): brief description

Task: {task description}
Story: {story_key}
td: {td_issue_id}

- Implementation detail 1
- Implementation detail 2

Tests:
- Test summary

Refs: {td_issue_id}
```

## Key Principles

1. **One task per session** - Ralph Wiggum loop for maximum speed
2. **Git commit before review** - Changes must be committed
3. **Separate review sessions** - td enforces this automatically
4. **td holds state** - BMAD holds structure
5. **Story file is source of truth** - For planning context

## Integration with BMM

This module extends BMM workflows:

| BMM Workflow | td-integration Equivalent |
|--------------|---------------------------|
| create-story | create-td-story |
| dev-story | td-dev-next (iterative) |
| code-review | td-review-story |

## Requirements

- td CLI installed and initialized
- sidecar (optional, for observability)
- Git repository (for commits)
