import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");
const sourcePath = resolve(rootDir, "examples/pi-extension/bmad-autopilot.ts");
const targetPath = resolve(
  rootDir,
  "packages/pi-bmad-autopilot/src/bmad-autopilot.ts",
);

copyFileSync(sourcePath, targetPath);
