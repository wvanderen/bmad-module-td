# Otto Extension (Local Prototype)

Otto adds a lightweight automation loop to Pi for BMAD + td workflows:

1. Runs `/bmad:td:initialize` once (optional)
2. Repeats `/bmad:td:next-step`
3. Tracks progress, failures, and checkpoints
4. Lets you dive into previous loop checkpoints

## File

- `examples/pi-extension/bmad-autopilot.ts`

## Install Locally in Pi

Copy or symlink this file into your Pi extension directory.

Global:

```bash
mkdir -p ~/.pi/agent/extensions
cp examples/pi-extension/bmad-autopilot.ts ~/.pi/agent/extensions/bmad-autopilot.ts
```

Project-local:

```bash
mkdir -p .pi/extensions
cp examples/pi-extension/bmad-autopilot.ts .pi/extensions/bmad-autopilot.ts
```

Then run `/reload` in Pi.

## Commands

- `/bmad:td:initialize` (extension wrapper)
- `/bmad:td:next-step` (extension wrapper)
- `/bmad:td:validate-prd` (extension wrapper)
- `/bmad-td-initialize` (alias)
- `/bmad-td-next-step` (alias)
- `/bmad-td-validate-prd` (alias)
- `/bmad-auto-onboard`
- `/otto-onboard` (alias)
- `/bmad-auto-start [--skip-init] [--max-iterations=N] [--max-failures=N] [--same-session]`
- `/bmad-auto-status`
- `/bmad-auto-pause`
- `/bmad-auto-resume`
- `/bmad-auto-stop [reason]`
- `/bmad-auto-dive`

## Preferences And Onboarding

Run `/bmad-auto-onboard` to save project-wide Otto preferences into `.pi/bmad-autopilot.json`.

Otto loads preferences in this precedence order:

1. `.bmad-autopilot.json`
2. `.pi/bmad-autopilot.json`
3. `BMAD_AUTOPILOT_CONFIG`

That keeps older config paths working while making `.pi/bmad-autopilot.json` the preferred project-local home for Otto settings.

Example:

```json
{
  "defaults": {
    "maxIterations": 40,
    "freshSessionBetweenSteps": true
  },
  "workflows": {
    "defaultMode": "accept-default",
    "commandModes": {
      "/bmad:bmm:create-architecture": "party",
      "/bmad:bmm:create-epics-and-stories": "party"
    }
  }
}
```

- `defaults` sets the fallback behavior for `/bmad-auto-start`.
- `workflows.commandModes` lets you opt specific workflows into `party` mode while keeping the rest accept-default.

## Otto Skill Resource

The packaged Otto extension ships an `otto` skill resource for Pi agents.

- Source of truth: `examples/pi-extension/skills/otto/SKILL.md`
- Packaged path: `packages/pi-bmad-autopilot/skills/otto/SKILL.md`

## Notes

- Checkpoints are labeled in the session tree as `auto:<runId>:iter-<N>`.
- `/bmad-auto-dive` can either navigate to a checkpoint or fork from it.
- Otto sweeps drained queues for epic maintenance, then runs `/bmad:td:validate-prd` before stopping when no follow-up td work remains.
- By default, Otto hops to a fresh session between `next-step` iterations. Use `--same-session` to disable.
- If the runtime treats `/bmad-auto-continue` as plain text, Otto falls back to same-session compacted continuation for that cycle.
- When only `in-review` issues remain, Otto continues with a session hop (default mode) to allow cross-session review separation.
