# pi-bmad-autopilot (workspace package)

This workspace package tracks the Pi extension implementation for BMAD td autopilot.

Current source of truth:

- `examples/pi-extension/bmad-autopilot.ts`

The package entrypoint re-exports that file for monorepo development.

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
