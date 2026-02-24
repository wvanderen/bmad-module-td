# td-story-dev Workflow Checklist

## Ralph Wiggum Loop Rules
- [ ] ONE task per session - no exceptions
- [ ] Do not implement multiple tasks
- [ ] Do not skip ahead to future tasks
- [ ] Stop after this task is complete

## Pre-Implementation
- [ ] td session initialized (`td usage --new-session`)
- [ ] Next task identified from td
- [ ] Story file loaded
- [ ] Task context extracted
- [ ] Related ACs identified
- [ ] Dev notes reviewed

## Implementation
- [ ] Tests written FIRST (red phase)
- [ ] Tests confirmed failing before implementation
- [ ] Minimal implementation (green phase)
- [ ] Code refactored for quality
- [ ] All tests passing
- [ ] No regressions introduced
- [ ] Architecture patterns followed

## Story File Updates
- [ ] Task checkbox marked [x]
- [ ] Subtasks marked [x] (if any)
- [ ] File List updated
- [ ] Completion Notes added
- [ ] td Sync Log updated

## Git Commit (CRITICAL!)
- [ ] All changes staged
- [ ] Commit message includes:
  - [ ] Type prefix (feat/fix/refactor)
  - [ ] Story reference in scope
  - [ ] Brief description
  - [ ] Task details in body
  - [ ] Test summary
  - [ ] `Refs: {td_issue_id}` footer
- [ ] Commit successful

## td Workflow
- [ ] td handoff created with details
- [ ] td review submitted
- [ ] Commit hash included in review

## Quality Gates
- [ ] Implementation matches task requirements
- [ ] Related acceptance criteria satisfied
- [ ] Tests exist and pass 100%
- [ ] No regressions in existing tests
- [ ] Code follows project conventions
- [ ] Git commit created BEFORE review
- [ ] Ready for different session to review
