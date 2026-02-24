# Story {{epic_num}}.{{story_num}}: {{story_title}}

Status: ready-for-dev

<!-- BMAD-TD Integration: This story is synced with td epic {{td_epic_id}} -->

## td Integration

- **td Epic**: `{{td_epic_id}}`
- **td Tasks**: {{td_task_count}} issues ({{td_open_count}} open, {{td_in_progress_count}} in-progress, {{td_blocked_count}} blocked)
- **Last Sync**: {{sync_timestamp}}
- **Sync Status**: {{sync_status}}

### Task → td Mapping

| Task | td Issue | Status |
|------|----------|--------|
{{#each td_task_mapping}}
| {{this.task_id}} | `{{this.td_issue_id}}` | {{this.status}} |
{{/each}}

---

## Story

As a {{role}},
I want {{action}},
so that {{benefit}}.

## Acceptance Criteria

1. [Add acceptance criteria from epics/PRD]

## Tasks / Subtasks

- [ ] Task 1 (AC: #1) [td:{{td_task_1_id}}]
  - [ ] Subtask 1.1
- [ ] Task 2 (AC: #2) [td:{{td_task_2_id}}]
  - [ ] Subtask 2.1
- [ ] Task 3 (AC: #3) [td:{{td_task_3_id}}]
  - [ ] Subtask 3.1

## Dev Notes

- Relevant architecture patterns and constraints
- Source tree components to touch
- Testing standards summary

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
- Detected conflicts or variances (with rationale)

### References

- Cite all technical details with source paths and sections, e.g. [Source: docs/<file>.md#Section]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

---

## td Sync Log

| Timestamp | Action | Details |
|-----------|--------|---------|
| {{sync_timestamp}} | initialized | Story created with td epic {{td_epic_id}} |
