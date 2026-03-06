# Monorepo Ops

## Package Boundaries

- `@wvanderen/bmad-module-td` (`packages/bmad-module-td`): BMAD td-integration module content.
- `@wvanderen/otto` (`packages/otto`): Otto workspace package for Pi.

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
4. Reload the Pi extension and run a bounded Otto test.

## Release Flow

1. Validate publish flow: `npm run release:check`.
2. Bump the target package version:
   - module: `npm run release:module:patch` (or minor/major/prerelease)
   - Otto: `npm run release:otto:patch` (or minor/major/prerelease)
3. Publish the target package:
   - module: `npm run publish:module`
   - Otto: `npm run publish:otto`
4. Push commit and tags manually.
