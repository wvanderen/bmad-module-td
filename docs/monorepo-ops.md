# Monorepo Ops

## Package Boundaries

- `@wvanderen/bmad-module-td` (`packages/bmad-module-td`): BMAD td-integration module content.
- `@wvanderen/pi-bmad-autopilot` (`packages/pi-bmad-autopilot`): Pi extension workspace package.

## Source of Truth

- Author module files in `packages/bmad-module-td`.
- Treat `_bmad/td-integration/` as a generated installable mirror.

## Sync Rules

- Run `npm run sync:module` after module edits.
- Run `npm run sync:check` before publish/CI.
- `npm test` includes `sync:check` to prevent drift.

## Dry-Run Workflow

1. Update module source.
2. Run `npm run sync:module`.
3. Reinstall module into sandbox with `npx bmad-method install --custom-content <repo>/packages/bmad-module-td --action update --yes`.
4. Reload Pi extension and run bounded autopilot test.

## Release Flow

1. Ensure tests pass: `npm test`.
2. Bump module version: `npm run release:module:patch` (or minor/major).
3. Publish module: `npm run publish:module`.
4. Push commit and tags manually.
