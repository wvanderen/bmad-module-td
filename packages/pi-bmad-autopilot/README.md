# pi-bmad-autopilot (workspace package)

This workspace package tracks the Pi extension implementation for BMAD td autopilot.

Current source of truth:

- `examples/pi-extension/bmad-autopilot.ts`

The package entrypoint re-exports that file for monorepo development.

Autopilot also supports optional JSON preferences from `.bmad-autopilot.json`, `.pi/bmad-autopilot.json`, or `BMAD_AUTOPILOT_CONFIG`. Use `workflows.commandModes` to opt workflows like `/bmad:bmm:create-architecture` into `party` mode.

## Publishing

```bash
# Validate the package tarball before publishing
npm run publish:check

# Patch release
npm run release

# Minor release
npm run release:minor

# Major release
npm run release:major

# Publish package
npm run publish:package
```
