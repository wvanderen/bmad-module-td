import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");
const sourcePath = resolve(rootDir, "examples/pi-extension/bmad-autopilot.ts");
const targetPath = resolve(
  rootDir,
  "packages/pi-bmad-autopilot/src/bmad-autopilot.ts",
);
const resultHelperSourcePath = resolve(
  rootDir,
  "examples/pi-extension/otto-result.mjs",
);
const resultHelperTargetPath = resolve(
  rootDir,
  "packages/pi-bmad-autopilot/src/otto-result.mjs",
);

copyFileSync(sourcePath, targetPath);
copyFileSync(resultHelperSourcePath, resultHelperTargetPath);
