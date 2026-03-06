import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");
const packageJsonPath = resolve(rootDir, "packages/otto/package.json");
const skillPath = resolve(rootDir, "packages/otto/skills/otto/SKILL.md");

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

if (!packageJson.pi || !Array.isArray(packageJson.pi.skills)) {
  throw new Error("Otto package.json is missing pi.skills metadata.");
}

if (!packageJson.files || !packageJson.files.includes("skills")) {
  throw new Error('Otto package.json must publish the "skills" directory.');
}

const packed = JSON.parse(
  execFileSync(
    "npm",
    ["pack", "--dry-run", "--json", "--workspace", "@wvanderen/otto"],
    {
      cwd: rootDir,
      encoding: "utf8",
    },
  ),
);

const files = packed[0]?.files?.map((entry) => entry.path) ?? [];

if (!files.includes("skills/otto/SKILL.md")) {
  throw new Error(
    `Otto package is missing skills/otto/SKILL.md in npm pack output. Checked ${skillPath}.`,
  );
}

console.log("Otto package asset checks passed.");
