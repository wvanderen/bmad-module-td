import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const SECTION_LIMITS = {
  productUnderstanding: {
    label: "Product understanding and scope control",
    max: 20,
  },
  architectureQuality: { label: "Architecture quality", max: 20 },
  storyBacklogQuality: { label: "Story/backlog quality", max: 20 },
  autonomousLoopBehavior: { label: "Autonomous loop behavior", max: 20 },
  extensionUxObservability: {
    label: "Extension UX / observability",
    max: 10,
  },
  finalOutputCoherence: { label: "Final output coherence", max: 10 },
};

const REQUIRED_METRICS = [
  "feedbackCount",
  "avoidableFeedbackCount",
  "cycleCount",
  "reworkCount",
  "majorDriftIncidents",
  "criticalContradictionIncidents",
];

const FAIL_FLAG_LABELS = {
  majorScopeDrift: "major scope drift beyond the approved PRD",
  architectureIgnoredLocalFirst:
    "architecture ignored local-first or offline requirements",
  storiesNotImplementationTestable: "stories were not implementation-testable",
  nonAutonomousFeedbackFailure:
    "repeated unnecessary feedback requests made the run non-autonomous",
};

const CAUTION_FLAG_LABELS = {
  dependencyOrderingIssues:
    "final backlog has major dependency ordering issues",
};

const formatNumber = (value) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

const readJson = (filePath) => {
  const raw = readFileSync(filePath, "utf8");
  return JSON.parse(raw);
};

const assertNumber = (value, label, errors, { min = 0, max } = {}) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    errors.push(`${label} must be a number.`);
    return;
  }

  if (value < min) errors.push(`${label} must be >= ${min}.`);
  if (typeof max === "number" && value > max) {
    errors.push(`${label} must be <= ${max}.`);
  }
};

const usage = () => {
  console.error(
    `Usage: node scripts/score-dry-run.mjs <scorecard.json> [--json]\n\nTemplate: templates/dry-run-scorecard.template.json`,
  );
  process.exit(1);
};

const args = process.argv.slice(2);
if (args.length === 0) usage();

const jsonOutput = args.includes("--json");
const fileArg = args.find((arg) => !arg.startsWith("--"));
if (!fileArg) usage();

const filePath = resolve(process.cwd(), fileArg);
const scorecard = readJson(filePath);
const errors = [];

if (!scorecard || typeof scorecard !== "object") {
  errors.push("Top-level scorecard must be a JSON object.");
}

const sections = scorecard.sections ?? {};
const metrics = scorecard.metrics ?? {};
const flags = scorecard.flags ?? {};
const cycles = Array.isArray(scorecard.cycles) ? scorecard.cycles : [];

let totalScore = 0;
for (const [key, config] of Object.entries(SECTION_LIMITS)) {
  const value = sections[key];
  assertNumber(value, `${config.label} score`, errors, {
    min: 0,
    max: config.max,
  });
  if (typeof value === "number") totalScore += value;
}

for (const metric of REQUIRED_METRICS) {
  assertNumber(metrics[metric], `Metric ${metric}`, errors, { min: 0 });
}

for (const [index, cycle] of cycles.entries()) {
  if (!cycle || typeof cycle !== "object") {
    errors.push(`Cycle ${index + 1} must be an object.`);
    continue;
  }

  assertNumber(cycle.score, `Cycle ${index + 1} score`, errors, {
    min: 0,
    max: 10,
  });
}

if (errors.length > 0) {
  console.error(`Invalid scorecard: ${basename(filePath)}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const hardFails = Object.entries(FAIL_FLAG_LABELS)
  .filter(([key]) => flags[key] === true)
  .map(([, label]) => label);

const cautionFlags = [];
const reworkRatio =
  metrics.cycleCount > 0 ? metrics.reworkCount / metrics.cycleCount : 0;

if (reworkRatio > 0.25) {
  cautionFlags.push("more than 25% of cycles were mostly rework");
}

if (metrics.avoidableFeedbackCount > 2) {
  cautionFlags.push("more than 2 avoidable feedback requests occurred");
}

for (const [key, label] of Object.entries(CAUTION_FLAG_LABELS)) {
  if (flags[key] === true) cautionFlags.push(label);
}

let interpretation =
  "below 60: autonomy or output quality is not good enough yet";
if (totalScore >= 90) interpretation = "90-100: excellent benchmark run";
else if (totalScore >= 80)
  interpretation = "80-89: strong, a few fixable issues";
else if (totalScore >= 70)
  interpretation = "70-79: usable but clear workflow or quality weaknesses";
else if (totalScore >= 60)
  interpretation = "60-69: weak; significant intervention likely needed";

const cycleAverage =
  cycles.length > 0
    ? cycles.reduce((sum, cycle) => sum + cycle.score, 0) / cycles.length
    : null;

const result = {
  file: filePath,
  runId: scorecard.run?.id ?? null,
  totalScore,
  maxScore: 100,
  interpretation,
  pass: hardFails.length === 0 && totalScore >= 70,
  hardFails,
  cautionFlags,
  sectionScores: Object.fromEntries(
    Object.entries(SECTION_LIMITS).map(([key, config]) => [
      key,
      {
        label: config.label,
        score: sections[key],
        max: config.max,
      },
    ]),
  ),
  metrics,
  cycleStats: {
    scoredCycles: cycles.length,
    averageScore: cycleAverage,
  },
};

if (jsonOutput) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}

console.log(`Dry-run scorecard: ${basename(filePath)}`);
if (result.runId) console.log(`Run ID: ${result.runId}`);
console.log(`Total: ${totalScore}/100`);
console.log(`Interpretation: ${interpretation}`);
console.log(`Pass: ${result.pass ? "yes" : "no"}`);
console.log("");
console.log("Section scores:");
for (const { label, score, max } of Object.values(result.sectionScores)) {
  console.log(`- ${label}: ${formatNumber(score)}/${max}`);
}

console.log("");
console.log("Metrics:");
for (const metric of REQUIRED_METRICS) {
  console.log(`- ${metric}: ${formatNumber(metrics[metric])}`);
}
if (cycleAverage !== null) {
  console.log(`- cycleAverage: ${formatNumber(cycleAverage)}/10`);
}

if (hardFails.length > 0) {
  console.log("");
  console.log("Automatic fail gates:");
  for (const item of hardFails) console.log(`- ${item}`);
}

if (cautionFlags.length > 0) {
  console.log("");
  console.log("Caution flags:");
  for (const item of cautionFlags) console.log(`- ${item}`);
}
