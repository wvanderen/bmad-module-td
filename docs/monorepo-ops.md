# Monorepo Ops

## Package Boundaries

- `@wvanderen/bmad-module-td` (root package): BMAD td-integration module content.
- `@wvanderen/pi-bmad-autopilot` (`packages/pi-bmad-autopilot`): Pi extension workspace package.

## Source of Truth

- Author module files in root paths: `workflows/`, `tools/`, `templates/`, `data/`, `module.yaml`, `module-help.csv`, `README.md`, `AGENTS.md`.
- Treat `_bmad/td-integration/` as a generated installable mirror.

## Sync Rules

- Run `npm run sync:module` after module edits.
- Run `npm run sync:check` before publish/CI.
- `npm test` includes `sync:check` to prevent drift.

## Dry-Run Workflow

1. Update module source.
2. Run `npm run sync:module`.
3. Reinstall module into sandbox with `npx bmad-method install --custom-content <path> --action update --yes`.
4. Reload Pi extension and run bounded autopilot test.
