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

| Workflow         | Command                     | Description                                                           |
| ---------------- | --------------------------- | --------------------------------------------------------------------- |
| initialize       | `/bmad:td:initialize`       | Accept-default onboarding for greenfield or brownfield projects       |
| setup-validation | `/bmad:td:setup-validation` | Configure project validation methodology and quality gates            |
| next-step        | `/bmad:td:next-step`        | Unified workflow: review, implement, or epic action based on priority |
| validate-prd     | `/bmad:td:validate-prd`     | Validate completed delivery against the PRD and create td gap tasks   |

**next-step Priority:**

The next-step workflow analyzes workspace state and executes the highest-priority action:

1. Reviews (highest)
2. Implement ready issues
3. Epic workflows (create-story for empty epics, code-review for completed epics)
4. PRD validation when td execution is otherwise drained

next-step runs from workflow instructions directly and does not require an external skill file.

**Validation Methodology Gate:**

Validation methodology is a critical review control.

- Configure it with `/bmad:td:setup-validation`
- next-step must use it for review and implementation verification
- If it is missing, next-step must run fallback checks and flag reduced confidence

**Git Commit Standards:**

- Create the git commit before `td review`.
- Use lowercase conventional types: `feat`, `fix`, `refactor`, `docs`, `test`, or `chore`.
- Keep the subject in imperative mood, lowercase after the colon, with no trailing period.
- Normalize the subject by trimming whitespace, collapsing duplicate spaces, and removing trailing punctuation.
- Keep the body field order stable: `Task`, `Story`, `td`, implementation bullets, `Tests`, `Refs`.

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

| Task   | td Issue  | Status      |
| ------ | --------- | ----------- |
| Task 1 | `td-abc2` | closed      |
| Task 2 | `td-abc3` | closed      |
| Task 3 | `td-abc4` | in_progress |
```

---

## BMM Module (BMAD Method)

Standard BMAD workflows for project management:

- **Planning:** create-prd, create-architecture, create-epics-and-stories
- **Implementation:** create-story, dev-story, code-review
- **Sprint:** sprint-planning, sprint-status, retrospective
