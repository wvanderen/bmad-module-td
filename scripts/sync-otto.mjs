import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");
const sourcePath = resolve(rootDir, "examples/pi-extension/otto.ts");
const targetPath = resolve(rootDir, "packages/otto/src/otto.ts");
const resultHelperSourcePath = resolve(
  rootDir,
  "examples/pi-extension/otto-result.mjs",
);
const resultHelperTargetPath = resolve(
  rootDir,
  "packages/otto/src/otto-result.mjs",
);
const skillSourcePath = resolve(
  rootDir,
  "examples/pi-extension/skills/otto/SKILL.md",
);
const skillTargetPath = resolve(rootDir, "packages/otto/skills/otto/SKILL.md");

copyFileSync(sourcePath, targetPath);
copyFileSync(resultHelperSourcePath, resultHelperTargetPath);
mkdirSync(resolve(skillTargetPath, ".."), { recursive: true });
copyFileSync(skillSourcePath, skillTargetPath);
