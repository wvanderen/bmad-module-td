# Otto Extension (Local Prototype)

Otto adds a lightweight automation loop to Pi for BMAD + td workflows:

1. Runs `/bmad:td:initialize` once (optional)
2. Repeats `/bmad:td:next-step`
3. Tracks progress, failures, and checkpoints
4. Lets you dive into previous loop checkpoints

## Files

- `examples/pi-extension/otto.ts`
- `examples/pi-extension/otto-result.mjs`

## Install Locally in Pi

Copy or symlink both files into your Pi extension directory.

Global:

```bash
mkdir -p ~/.pi/agent/extensions
cp examples/pi-extension/otto.ts ~/.pi/agent/extensions/otto.ts
cp examples/pi-extension/otto-result.mjs ~/.pi/agent/extensions/otto-result.mjs
```

Project-local:

```bash
mkdir -p .pi/extensions
cp examples/pi-extension/otto.ts .pi/extensions/otto.ts
cp examples/pi-extension/otto-result.mjs .pi/extensions/otto-result.mjs
```

Then run `/reload` in Pi.

## Commands

- `/bmad:td:initialize` (extension wrapper)
- `/bmad:td:next-step` (extension wrapper)
- `/bmad:td:validate-prd` (extension wrapper)
- `/bmad-td-initialize` (alias)
- `/bmad-td-next-step` (alias)
- `/bmad-td-validate-prd` (alias)
- `/otto-onboard`
- `/otto-start [--skip-init] [--max-iterations=N] [--max-failures=N] [--same-session]`
- `/otto-status`
- `/otto-pause`
- `/otto-resume`
- `/otto-stop [reason]`
- `/otto-dive`
- legacy aliases: `/bmad-auto-onboard`, `/bmad-auto-start`, `/bmad-auto-status`, `/bmad-auto-pause`, `/bmad-auto-resume`, `/bmad-auto-stop`, `/bmad-auto-dive`

## Preferences And Onboarding

Run `/otto-onboard` to save project-wide Otto preferences into `.pi/otto.json`.

Otto loads preferences in this precedence order:

1. `.otto.json`
2. `.pi/otto.json`
3. `.bmad-autopilot.json`
4. `.pi/bmad-autopilot.json`
5. `OTTO_CONFIG`
6. `BMAD_AUTOPILOT_CONFIG`

That keeps older config paths working while making `.pi/otto.json` the preferred project-local home for Otto settings.

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

- `defaults` sets the fallback behavior for `/otto-start`.
- `workflows.commandModes` lets you opt specific workflows into `party` mode while keeping the rest accept-default.

## Otto Skill Resource

The packaged Otto extension ships an `otto` skill resource for Pi agents.

- Source of truth: `examples/pi-extension/skills/otto/SKILL.md`
- Packaged path: `packages/otto/skills/otto/SKILL.md`

## Notes

- Checkpoints are labeled in the session tree as `auto:<runId>:iter-<N>`.
- `/otto-dive` can either navigate to a checkpoint or fork from it.
- Otto sweeps drained queues for epic maintenance, then runs `/bmad:td:validate-prd` before stopping when no follow-up td work remains.
- By default, Otto hops to a fresh session between `next-step` iterations. Use `--same-session` to disable.
- If the runtime treats `/otto-continue` as plain text, Otto falls back to same-session compacted continuation for that cycle.
- When only `in-review` issues remain, Otto continues with a session hop (default mode) to allow cross-session review separation.
