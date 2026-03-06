import { copyFileSync, mkdirSync } from "node:fs";
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
const skillSourcePath = resolve(
  rootDir,
  "examples/pi-extension/skills/otto/SKILL.md",
);
const skillTargetPath = resolve(
  rootDir,
  "packages/pi-bmad-autopilot/skills/otto/SKILL.md",
);

copyFileSync(sourcePath, targetPath);
copyFileSync(resultHelperSourcePath, resultHelperTargetPath);
mkdirSync(resolve(skillTargetPath, ".."), { recursive: true });
copyFileSync(skillSourcePath, skillTargetPath);
