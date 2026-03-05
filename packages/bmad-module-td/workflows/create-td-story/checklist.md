# create-td-story Workflow Checklist

## Pre-Flight Checks
- [ ] td CLI available and initialized (`td usage --new-session` runs successfully)
- [ ] Sprint status file exists OR user provided story identifier
- [ ] Planning artifacts exist (epics.md, architecture.md, etc.)

## Story Creation (BMM Inherited)
- [ ] Story identified from sprint-status or user input
- [ ] Epic content loaded and analyzed
- [ ] Architecture requirements extracted
- [ ] Previous story learnings incorporated (if applicable)
- [ ] Web research completed for latest tech specifics
- [ ] Story file created with comprehensive context
- [ ] Status set to "ready-for-dev"

## td Integration
- [ ] Tasks/Subtasks parsed from story file
- [ ] Dependencies identified from task descriptions
- [ ] td epic created with story metadata
- [ ] td issues created for each task (with dependencies)
- [ ] Task → td mapping table created
- [ ] Story file updated with td Integration section
- [ ] Each task line includes [td:issue-id] reference
- [ ] td Sync Log entry added

## Finalization
- [ ] Sprint status updated (if applicable)
- [ ] Story file saved
- [ ] td epic ID stored in story file
- [ ] User informed of next steps (td-story-dev)

## Quality Gates
- [ ] All acceptance criteria included in story
- [ ] All tasks have td issue references
- [ ] Dependencies correctly linked in td
- [ ] Story file path embedded in td epic/issues metadata
