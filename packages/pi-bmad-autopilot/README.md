# pi-bmad-autopilot (workspace package)

This workspace package tracks the Pi extension implementation for BMAD td autopilot.

Current source of truth:

- `examples/pi-extension/bmad-autopilot.ts`

`npm pack`/`npm publish` sync that file into `packages/pi-bmad-autopilot/src/bmad-autopilot.ts` so published installs ship the actual extension source.

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
