---
name: otto
description: Operate Otto for BMAD + td execution, onboarding, and trustworthy autonomous queue drain in Pi.
---

# Otto

Use this skill when a project has Otto installed and you need to operate its BMAD + td automation loop inside Pi.

## What Otto Does

Otto is a Pi-native operating layer for BMAD + td execution. It helps agents and operators:

- initialize BMAD + td context
- execute `/bmad:td:next-step` with Otto's control loop
- preserve td review separation through fresh-session continuation
- validate queue drain against the PRD and reopen real gaps

## Project Preferences

Before long autonomous runs, prefer a project-local Otto setup:

1. Run `/otto-onboard`.
2. Save project preferences into `.pi/otto.json`.
3. Use those preferences as the default operating posture for later runs.

Otto prefers `.pi/otto.json` and `OTTO_CONFIG`, while still supporting `.bmad-autopilot.json` and `BMAD_AUTOPILOT_CONFIG` for compatibility.

## Core Commands

- `/otto-onboard` - set Otto project preferences
- `/otto-start` - start the initialize -> next-step loop
- `/otto-status` - inspect current run state and preference source
- `/otto-pause` - pause after the current turn
- `/otto-resume` - continue a paused loop
- `/otto-stop` - stop the current loop
- `/otto-dive` - inspect or fork from a checkpoint

## Operating Guidance

- Prefer project preferences over ad hoc flags when the team wants stable behavior.
- Keep fresh-session continuation enabled unless the operator explicitly wants same-session compaction.
- Use `party` mode selectively for workflows that benefit from higher steering, such as architecture or PRD validation.
- Trust runtime evidence, PRD validation, and td state over workflow-completion phrasing alone.
- Use Otto's evidence hierarchy in this order: runtime behavior, direct PRD/requirement validation, human review, automated checks, then workflow/artifact completion.
- For approval-grade work, require explicit requirement mapping, real target-surface evidence when applicable, and a clear weak-evidence callout when runtime proof is missing.
