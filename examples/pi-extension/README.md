# BMAD Autopilot Extension (Local Prototype)

This extension adds a lightweight autopilot loop to Pi for BMAD + td workflows:

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
- `/bmad-td-initialize` (alias)
- `/bmad-td-next-step` (alias)
- `/bmad-auto-start [--skip-init] [--max-iterations=N] [--max-failures=N] [--same-session]`
- `/bmad-auto-status`
- `/bmad-auto-pause`
- `/bmad-auto-resume`
- `/bmad-auto-stop [reason]`
- `/bmad-auto-dive`

## Preferences

Autopilot can load optional JSON preferences from either `.bmad-autopilot.json`, `.pi/bmad-autopilot.json`, or the path in `BMAD_AUTOPILOT_CONFIG`.

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

## Notes

- Checkpoints are labeled in the session tree as `auto:<runId>:iter-<N>`.
- `/bmad-auto-dive` can either navigate to a checkpoint or fork from it.
- Autopilot stops when no reviewable/ready td issues remain, max iterations are hit, or failure budget is exhausted.
- By default, autopilot hops to a fresh session between `next-step` iterations. Use `--same-session` to disable.
- If the runtime treats `/bmad-auto-continue` as plain text, autopilot falls back to same-session compacted continuation for that cycle.
- When only `in-review` issues remain, autopilot continues with a session hop (default mode) to allow cross-session review separation.
