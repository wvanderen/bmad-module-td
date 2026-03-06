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

1. Run `/bmad-auto-onboard`.
2. Save project preferences into `.pi/bmad-autopilot.json`.
3. Use those preferences as the default operating posture for later runs.

Otto still supports `.bmad-autopilot.json` and `BMAD_AUTOPILOT_CONFIG`, but `.pi/bmad-autopilot.json` is the preferred project-wide home.

## Core Commands

- `/bmad-auto-onboard` - set Otto project preferences
- `/bmad-auto-start` - start the initialize -> next-step loop
- `/bmad-auto-status` - inspect current run state and preference source
- `/bmad-auto-pause` - pause after the current turn
- `/bmad-auto-resume` - continue a paused loop
- `/bmad-auto-stop` - stop the current loop
- `/bmad-auto-dive` - inspect or fork from a checkpoint

## Operating Guidance

- Prefer project preferences over ad hoc flags when the team wants stable behavior.
- Keep fresh-session continuation enabled unless the operator explicitly wants same-session compaction.
- Use `party` mode selectively for workflows that benefit from higher steering, such as architecture or PRD validation.
- Trust runtime evidence, PRD validation, and td state over workflow-completion phrasing alone.
