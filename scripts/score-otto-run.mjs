import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const SECTION_LIMITS = {
  decisionQuality: { label: "Decision quality", max: 30 },
  queueDrainQuality: { label: "Queue-drain quality", max: 25 },
  productTruthDetection: { label: "Product-truth detection", max: 25 },
  contextDiscipline: { label: "Context discipline", max: 10 },
  operatorExperience: { label: "Operator experience", max: 10 },
};

const REQUIRED_METRICS = [
  ["nextStep", "total"],
  ["nextStep", "agreed"],
  ["nextStep", "disagreed"],
  ["queue", "initialReady"],
  ["queue", "completed"],
  ["queue", "approved"],
  ["queue", "reopened"],
  ["truthGaps", "detectedBeforeApproval"],
  ["truthGaps", "escapedFalseCompletion"],
  ["continuity", "sessionHopSuccesses"],
  ["continuity", "compactionsUsed"],
  ["oversight", "humanInterventions"],
];

const HARD_FAIL_LABELS = {
  approvedFalseCompletion: "approved a false-completion case",
  majorPrdTruthGapEscaped: "a major PRD truth gap escaped detection",
  repeatedBadNextStepChoices: "next-step decision quality was repeatedly wrong",
};

const FLAG_CAUTION_LABELS = {
  runtimeEvidenceMismatch:
    "runtime evidence was weaker than the apparent completion level",
  excessiveBabysitting: "the run required too much human babysitting",
  continuityFeltBlurry: "continuity quality degraded due to blurry context",
};

const ROADMAP_THRESHOLDS = {
  decisionAgreement: 0.8,
  queueDrainRate: 0.75,
  approvalRate: 0.8,
  truthGapCatchRate: 1,
  sessionHopSuccessRate: 0.75,
  humanInterventionsMax: 2,
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

const getNested = (object, path) =>
  path.reduce(
    (value, key) =>
      value && typeof value === "object" && key in value
        ? value[key]
        : undefined,
    object,
  );

const ratio = (numerator, denominator) =>
  denominator > 0 ? numerator / denominator : null;

const usage = () => {
  console.error(
    `Usage: node scripts/score-otto-run.mjs <scorecard.json> [--json]\n\nTemplate: templates/otto-evaluation-scorecard.template.json`,
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

let totalScore = 0;
for (const [key, config] of Object.entries(SECTION_LIMITS)) {
  const value = sections[key];
  assertNumber(value, `${config.label} score`, errors, {
    min: 0,
    max: config.max,
  });
  if (typeof value === "number") totalScore += value;
}

for (const path of REQUIRED_METRICS) {
  const label = `Metric ${path.join(".")}`;
  assertNumber(getNested(metrics, path), label, errors, { min: 0 });
}

const nextStepTotal = getNested(metrics, ["nextStep", "total"]);
const nextStepAgreed = getNested(metrics, ["nextStep", "agreed"]);
const nextStepDisagreed = getNested(metrics, ["nextStep", "disagreed"]);
const nextStepUncertain = getNested(metrics, ["nextStep", "uncertain"]);
if (
  typeof nextStepTotal === "number" &&
  typeof nextStepAgreed === "number" &&
  typeof nextStepDisagreed === "number" &&
  typeof nextStepUncertain === "number" &&
  nextStepAgreed + nextStepDisagreed + nextStepUncertain > nextStepTotal
) {
  errors.push(
    "nextStep.agreed + nextStep.disagreed + nextStep.uncertain must be <= nextStep.total.",
  );
}

const queueInitialReady = getNested(metrics, ["queue", "initialReady"]);
const queueCompleted = getNested(metrics, ["queue", "completed"]);
const queueApproved = getNested(metrics, ["queue", "approved"]);
if (
  typeof queueInitialReady === "number" &&
  typeof queueCompleted === "number" &&
  queueCompleted > queueInitialReady
) {
  errors.push("queue.completed must be <= queue.initialReady.");
}
if (
  typeof queueCompleted === "number" &&
  typeof queueApproved === "number" &&
  queueApproved > queueCompleted
) {
  errors.push("queue.approved must be <= queue.completed.");
}

if (errors.length > 0) {
  console.error(`Invalid Otto scorecard: ${basename(filePath)}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const decisionAgreement = ratio(nextStepAgreed, nextStepTotal);
const queueDrainRate = ratio(queueCompleted, queueInitialReady);
const approvalRate = ratio(queueApproved, queueCompleted);
const truthGapCatchRate = ratio(
  getNested(metrics, ["truthGaps", "detectedBeforeApproval"]),
  getNested(metrics, ["truthGaps", "detectedBeforeApproval"]) +
    getNested(metrics, ["truthGaps", "escapedFalseCompletion"]),
);
const sessionHopSuccessRate = ratio(
  getNested(metrics, ["continuity", "sessionHopSuccesses"]),
  getNested(metrics, ["continuity", "sessionHopAttempts"]),
);
const humanInterventions = getNested(metrics, [
  "oversight",
  "humanInterventions",
]);

const roadmapTargets = {
  decisionAgreement: {
    actual: decisionAgreement,
    threshold: ROADMAP_THRESHOLDS.decisionAgreement,
    pass:
      decisionAgreement !== null &&
      decisionAgreement >= ROADMAP_THRESHOLDS.decisionAgreement,
  },
  queueDrainRate: {
    actual: queueDrainRate,
    threshold: ROADMAP_THRESHOLDS.queueDrainRate,
    pass:
      queueDrainRate !== null &&
      queueDrainRate >= ROADMAP_THRESHOLDS.queueDrainRate,
  },
  approvalRate: {
    actual: approvalRate,
    threshold: ROADMAP_THRESHOLDS.approvalRate,
    pass:
      approvalRate !== null && approvalRate >= ROADMAP_THRESHOLDS.approvalRate,
  },
  truthGapCatchRate: {
    actual: truthGapCatchRate,
    threshold: ROADMAP_THRESHOLDS.truthGapCatchRate,
    pass:
      truthGapCatchRate !== null &&
      truthGapCatchRate >= ROADMAP_THRESHOLDS.truthGapCatchRate,
  },
  sessionHopSuccessRate: {
    actual: sessionHopSuccessRate,
    threshold: ROADMAP_THRESHOLDS.sessionHopSuccessRate,
    pass:
      sessionHopSuccessRate !== null &&
      sessionHopSuccessRate >= ROADMAP_THRESHOLDS.sessionHopSuccessRate,
  },
  humanInterventions: {
    actual: humanInterventions,
    threshold: ROADMAP_THRESHOLDS.humanInterventionsMax,
    pass:
      typeof humanInterventions === "number" &&
      humanInterventions <= ROADMAP_THRESHOLDS.humanInterventionsMax,
  },
};

const hardFails = Object.entries(HARD_FAIL_LABELS)
  .filter(([key]) => flags[key] === true)
  .map(([, label]) => label);

const cautionFlags = [];

if (decisionAgreement !== null && decisionAgreement < 0.7) {
  cautionFlags.push("next-step decision agreement fell below 70%");
}
if (queueDrainRate !== null && queueDrainRate < 0.75) {
  cautionFlags.push("queue-drain rate fell below 75%");
}
if (approvalRate !== null && approvalRate < 0.75) {
  cautionFlags.push("approval rate on completed work fell below 75%");
}
if (truthGapCatchRate !== null && truthGapCatchRate < 1) {
  cautionFlags.push("at least one product-truth gap escaped before approval");
}
if (sessionHopSuccessRate !== null && sessionHopSuccessRate < 0.75) {
  cautionFlags.push("session-hop success rate fell below 75%");
}
if (getNested(metrics, ["continuity", "compactionsUsed"]) > 2) {
  cautionFlags.push("compaction was used more than twice");
}
if (getNested(metrics, ["oversight", "humanInterventions"]) > 2) {
  cautionFlags.push("more than 2 human interventions were needed");
}

for (const [key, label] of Object.entries(FLAG_CAUTION_LABELS)) {
  if (flags[key] === true) cautionFlags.push(label);
}

let interpretation =
  "below 60: Otto is not dependable enough for meaningful autonomous runs";
if (totalScore >= 90) {
  interpretation = "90-100: excellent; trustworthy long-run Otto behavior";
} else if (totalScore >= 80) {
  interpretation = "80-89: strong; a few targeted fixes remain";
} else if (totalScore >= 70) {
  interpretation = "70-79: usable; important judgment or evidence gaps remain";
} else if (totalScore >= 60) {
  interpretation = "60-69: weak; Otto still needs frequent operator correction";
}

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
  computedMetrics: {
    decisionAgreement,
    queueDrainRate,
    approvalRate,
    truthGapCatchRate,
    sessionHopSuccessRate,
  },
  roadmapTargets,
  metrics,
};

if (jsonOutput) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}

console.log(`Otto evaluation scorecard: ${basename(filePath)}`);
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
console.log("Computed metrics:");
console.log(
  `- decisionAgreement: ${decisionAgreement === null ? "n/a" : formatNumber(decisionAgreement * 100)}%`,
);
console.log(
  `- queueDrainRate: ${queueDrainRate === null ? "n/a" : formatNumber(queueDrainRate * 100)}%`,
);
console.log(
  `- approvalRate: ${approvalRate === null ? "n/a" : formatNumber(approvalRate * 100)}%`,
);
console.log(
  `- truthGapCatchRate: ${truthGapCatchRate === null ? "n/a" : formatNumber(truthGapCatchRate * 100)}%`,
);
console.log(
  `- sessionHopSuccessRate: ${sessionHopSuccessRate === null ? "n/a" : formatNumber(sessionHopSuccessRate * 100)}%`,
);

console.log("");
console.log("Roadmap targets:");
for (const [label, target] of Object.entries(result.roadmapTargets)) {
  const actual =
    target.actual === null || typeof target.actual === "undefined"
      ? "n/a"
      : label === "humanInterventions"
        ? formatNumber(target.actual)
        : `${formatNumber(target.actual * 100)}%`;
  const threshold =
    label === "humanInterventions"
      ? `<= ${formatNumber(target.threshold)}`
      : `>= ${formatNumber(target.threshold * 100)}%`;
  console.log(
    `- ${label}: ${target.pass ? "pass" : "miss"} (${actual}; target ${threshold})`,
  );
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
