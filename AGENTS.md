## MANDATORY: Use td for Task Management

You must run td usage --new-session at conversation start (or after /clear) to see current work.
Use td usage -q for subsequent reads.

---

## BMAD Modules

### td-integration Module

**Purpose:** Integrates BMAD planning artifacts with td CLI task management.

**Philosophy:** td is state, BMAD is structure
- BMAD `.md` files hold structured planning artifacts (epics, stories, architecture)
- td issues hold execution state (status, dependencies, reviews)
- sidecar provides observability

**Core Workflows:**

| Workflow | Command | Description |
|----------|---------|-------------|
| create-td-story | `/bmad:td:create-story` | Create story with td epic + task issues |
| td-dev-next | `/bmad:td:dev-next` | Ralph Wiggum loop - implement next task |
| td-dev-task | `/bmad:td:dev-task <id>` | Implement specific task by td ID |
| td-review-story | `/bmad:td:review-story` | Epic-level code review |
| td-sync | `/bmad:td:sync` | Bidirectional sync story ↔ td |
| td-status | `/bmad:td:status` | Show story td integration status |

**Ralph Wiggum Loop:**

The td-dev-next workflow implements one task per session for maximum speed and reduced context rot:

1. `td next` - Get next ready task
2. Load story context
3. Implement single task (TDD)
4. Validate tests pass
5. Update story file
6. **Git commit** (excellent message)
7. `td handoff` - Capture details
8. `td review` - Submit for review

**Commit Message Format:**
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

**Review Separation:**

td enforces review separation - you cannot approve issues you implemented. Always use a DIFFERENT session for reviews.

**Story File td Integration Section:**

```markdown
## td Integration

- **td Epic**: `td-abc1`
- **td Tasks**: 5 issues (2 open, 1 in-progress, 0 blocked)
- **Last Sync**: 2026-02-23T10:30:00Z
- **Sync Status**: synced

### Task → td Mapping

| Task | td Issue | Status |
|------|----------|--------|
| Task 1 | `td-abc2` | closed |
| Task 2 | `td-abc3` | closed |
| Task 3 | `td-abc4` | in_progress |
```

---

## BMM Module (BMAD Method)

Standard BMAD workflows for project management:

- **Planning:** create-prd, create-architecture, create-epics-and-stories
- **Implementation:** create-story, dev-story, code-review
- **Sprint:** sprint-planning, sprint-status, retrospective
