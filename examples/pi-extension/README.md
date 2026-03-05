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
- `/bmad-auto-start [--skip-init] [--max-iterations=N] [--max-failures=N]`
- `/bmad-auto-status`
- `/bmad-auto-pause`
- `/bmad-auto-resume`
- `/bmad-auto-stop [reason]`
- `/bmad-auto-dive`

## Notes

- Checkpoints are labeled in the session tree as `auto:<runId>:iter-<N>`.
- `/bmad-auto-dive` can either navigate to a checkpoint or fork from it.
- Autopilot stops when no reviewable/ready td issues remain, max iterations are hit, or failure budget is exhausted.
