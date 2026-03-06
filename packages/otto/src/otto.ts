import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";

import {
  classifyAction,
  classifyOutcome,
  parseIssueId,
  resolveWorkflowResult,
  RESULT_PREFIX,
  shortText,
} from "./otto-result.mjs";

const INIT_COMMAND = "/bmad:td:initialize";
const NEXT_STEP_COMMAND = "/bmad:td:next-step";
const VALIDATE_PRD_COMMAND = "/bmad:td:validate-prd";
const CONTINUE_COMMAND = "/otto-continue";
const STATE_ENTRY_TYPE = "otto-state";
type WorkflowCommand =
  | "/bmad:td:initialize"
  | "/bmad:td:next-step"
  | "/bmad:td:validate-prd"
  | "/bmad:bmm:create-architecture"
  | "/bmad:bmm:create-epics-and-stories"
  | "/bmad:bmm:create-story"
  | "/bmad:bmm:code-review";

type WorkflowMode = "accept-default" | "party";
type ActionKind =
  | "review"
  | "implementation"
  | "requirements-validation"
  | "epic-workflow"
  | "unknown";
type OutcomeKind =
  | "completed"
  | "blocked"
  | "needs-input"
  | "no-work"
  | "failed"
  | "unknown";
type ConfidenceKind = "high" | "medium" | "low" | "unknown";
type ContinuityKind =
  | "none"
  | "fresh-session"
  | "same-session-compacted"
  | "compaction-fallback";
type ResultSourceKind =
  | "structured"
  | "heuristic"
  | "malformed"
  | "mismatched"
  | null;

interface AutopilotPreferences {
  defaults?: {
    skipInit?: boolean;
    maxIterations?: number;
    maxFailures?: number;
    freshSessionBetweenSteps?: boolean;
  };
  workflows?: {
    defaultMode?: WorkflowMode;
    commandModes?: Partial<Record<WorkflowCommand, WorkflowMode>>;
  };
}

interface LoadedPreferences {
  preferences: AutopilotPreferences;
  source: string | null;
  error: string | null;
}

const CONFIG_PATHS = [
  ".otto.json",
  ".pi/otto.json",
  ".bmad-autopilot.json",
  ".pi/bmad-autopilot.json",
];
const PROJECT_PREFERENCES_PATH = ".pi/otto.json";
const PREFERENCE_ONBOARDING_HINT =
  "Otto is using built-in defaults. Run /otto-onboard to save project preferences.";
const ONBOARDING_MARKER_ENTRY_TYPE = "otto-onboarding-hint";
const ONBOARDING_MARKER_VERSION = 1;

type PreferenceChoice<T> = {
  label: string;
  value: T;
};

type WorkflowPreferenceOverride = WorkflowMode | "inherit";

interface PreferenceCandidate {
  label: string;
  path: string;
}

type Phase =
  | "idle"
  | "initializing"
  | "running"
  | "paused"
  | "stopped"
  | "completed"
  | "error";
type StopCode =
  | "none"
  | "manual-stop"
  | "paused-for-input"
  | "blocked-workflow"
  | "session-rotation-cancelled"
  | "failure-budget-reached"
  | "max-iterations-reached"
  | "queue-drained"
  | "queue-drained-in-review-only"
  | "validate-prd-finished"
  | "validate-prd-in-review-only";
type QueueState =
  | "unknown"
  | "ready"
  | "in-review-only"
  | "drained-first-pass"
  | "drained-ready-for-validation"
  | "drained-final";

interface Checkpoint {
  iteration: number;
  entryId: string;
  command: string;
  issueId: string | null;
  action: ActionKind | null;
  outcome: OutcomeKind | null;
  confidence: ConfidenceKind;
  queueState: QueueState;
  continuity: ContinuityKind;
  continuityReason: string | null;
  alert: string | null;
  reason: string | null;
  summary: string;
  timestamp: number;
}

interface RunState {
  version: number;
  runId: string | null;
  active: boolean;
  phase: Phase;
  iteration: number;
  maxIterations: number;
  failures: number;
  maxFailures: number;
  lastCommand: string | null;
  lastAction: ActionKind | null;
  lastDecisionReason: string | null;
  lastOutcome: OutcomeKind | null;
  lastConfidence: ConfidenceKind;
  lastResultSource: ResultSourceKind;
  lastCommandMode: WorkflowMode;
  lastContinuation: ContinuityKind;
  lastContinuationReason: string | null;
  lastIssueId: string | null;
  lastError: string | null;
  lastProgressAt: number;
  stopReason: string | null;
  stopCode: StopCode;
  queueState: QueueState;
  emptyQueuePasses: number;
  checkpoints: Checkpoint[];
  awaitingCommand: string | null;
  awaitingPrompt: string | null;
  awaitingToken: string | null;
  awaitingStarted: boolean;
  freshSessionBetweenSteps: boolean;
}

const newRunState = (): RunState => ({
  version: 1,
  runId: null,
  active: false,
  phase: "idle",
  iteration: 0,
  maxIterations: 25,
  failures: 0,
  maxFailures: 3,
  lastCommand: null,
  lastAction: null,
  lastDecisionReason: null,
  lastOutcome: null,
  lastConfidence: "unknown",
  lastResultSource: null,
  lastCommandMode: "accept-default",
  lastContinuation: "none",
  lastContinuationReason: null,
  lastIssueId: null,
  lastError: null,
  lastProgressAt: Date.now(),
  stopReason: null,
  stopCode: "none",
  queueState: "unknown",
  emptyQueuePasses: 0,
  checkpoints: [],
  awaitingCommand: null,
  awaitingPrompt: null,
  awaitingToken: null,
  awaitingStarted: false,
  freshSessionBetweenSteps: true,
});

const newWorkflowToken = (): string =>
  `otto-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const checkpointLabel = (checkpoint: Checkpoint): string => {
  const parts = [
    `#${checkpoint.iteration}`,
    new Date(checkpoint.timestamp).toLocaleTimeString(),
    checkpoint.issueId ?? checkpoint.command,
    checkpoint.action ?? checkpoint.command,
    checkpoint.confidence,
  ];

  if (checkpoint.outcome) parts.push(checkpoint.outcome);
  if (checkpoint.continuity !== "none") {
    parts.push(checkpoint.continuity.replaceAll("-", " "));
  }
  if (checkpoint.alert) parts.push(checkpoint.alert);
  return `${parts.join(" | ")} | ${checkpoint.summary}`;
};

const continuityLabel = (
  continuity: ContinuityKind,
  reason: string | null,
): string => {
  const base =
    continuity === "fresh-session"
      ? "fresh session"
      : continuity === "same-session-compacted"
        ? "same session (compacted)"
        : continuity === "compaction-fallback"
          ? "fallback after compaction failure"
          : "none";

  return reason ? `${base} - ${reason}` : base;
};

const stateAlert = (runState: RunState): string | null => {
  if (runState.lastContinuation === "compaction-fallback") {
    return "continuity fallback";
  }

  if (
    runState.lastResultSource === "malformed" ||
    runState.lastResultSource === "mismatched"
  ) {
    return "result drift";
  }

  if (runState.lastConfidence === "low") {
    return "weak evidence";
  }

  if (runState.failures > 0) {
    return `recovered failures ${runState.failures}/${runState.maxFailures}`;
  }

  return null;
};

const checkpointActionOptions = (checkpoint: Checkpoint): string[] => [
  `Navigate here | ${checkpoint.issueId ?? checkpoint.command} | ${checkpoint.summary}`,
  `Fork from here | ${checkpoint.issueId ?? checkpoint.command} | ${checkpoint.summary}`,
  `Show details | ${checkpoint.action ?? checkpoint.command} | ${checkpoint.confidence}`,
];

const extractAssistantText = (messages: unknown[]): string => {
  if (!Array.isArray(messages)) return "";
  const assistantMessages = messages.filter(
    (message) =>
      typeof message === "object" &&
      message !== null &&
      "role" in message &&
      (message as { role?: string }).role === "assistant",
  ) as Array<{ content?: Array<{ type?: string; text?: string }> }>;

  const last = assistantMessages[assistantMessages.length - 1];
  if (!last || !Array.isArray(last.content)) return "";

  const lines = last.content
    .filter(
      (part) => part && part.type === "text" && typeof part.text === "string",
    )
    .map((part) => part.text as string);

  return lines.join("\n").trim();
};

const parseStartArgs = (
  args: string,
): {
  skipInit?: boolean;
  maxIterations?: number;
  maxFailures?: number;
  sameSession?: boolean;
} => {
  const tokens = args
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  const parsed: {
    skipInit?: boolean;
    maxIterations?: number;
    maxFailures?: number;
    sameSession?: boolean;
  } = {};

  for (const token of tokens) {
    if (token === "--skip-init") parsed.skipInit = true;
    if (token === "--same-session") parsed.sameSession = true;
    if (token.startsWith("--max-iterations=")) {
      const value = Number.parseInt(
        token.slice("--max-iterations=".length),
        10,
      );
      if (Number.isFinite(value) && value > 0) parsed.maxIterations = value;
    }
    if (token.startsWith("--max-failures=")) {
      const value = Number.parseInt(token.slice("--max-failures=".length), 10);
      if (Number.isFinite(value) && value > 0) parsed.maxFailures = value;
    }
  }

  return parsed;
};

const mergePreferences = (
  base: AutopilotPreferences,
  incoming: AutopilotPreferences,
): AutopilotPreferences => ({
  defaults: {
    ...(base.defaults ?? {}),
    ...(incoming.defaults ?? {}),
  },
  workflows: {
    ...(base.workflows ?? {}),
    ...(incoming.workflows ?? {}),
    commandModes: {
      ...(base.workflows?.commandModes ?? {}),
      ...(incoming.workflows?.commandModes ?? {}),
    },
  },
});

const normalizePreferences = (
  preferences: AutopilotPreferences,
): AutopilotPreferences => {
  const defaults = preferences.defaults ?? {};
  const workflows = preferences.workflows ?? {};
  const commandModes = Object.fromEntries(
    Object.entries(workflows.commandModes ?? {}).filter(
      ([, mode]) => mode === "accept-default" || mode === "party",
    ),
  ) as Partial<Record<WorkflowCommand, WorkflowMode>>;

  const normalized: AutopilotPreferences = {};

  if (Object.keys(defaults).length > 0) {
    normalized.defaults = {
      ...(defaults.skipInit !== undefined
        ? { skipInit: defaults.skipInit }
        : {}),
      ...(defaults.maxIterations !== undefined
        ? { maxIterations: defaults.maxIterations }
        : {}),
      ...(defaults.maxFailures !== undefined
        ? { maxFailures: defaults.maxFailures }
        : {}),
      ...(defaults.freshSessionBetweenSteps !== undefined
        ? { freshSessionBetweenSteps: defaults.freshSessionBetweenSteps }
        : {}),
    };
  }

  if (
    workflows.defaultMode !== undefined ||
    Object.keys(commandModes).length > 0
  ) {
    normalized.workflows = {
      ...(workflows.defaultMode !== undefined
        ? { defaultMode: workflows.defaultMode }
        : {}),
      ...(Object.keys(commandModes).length > 0 ? { commandModes } : {}),
    };
  }

  return normalized;
};

const preferenceCandidates = (): PreferenceCandidate[] => {
  const cwd = process.cwd();
  const envPath =
    process.env.OTTO_CONFIG?.trim() ??
    process.env.BMAD_AUTOPILOT_CONFIG?.trim();

  return [
    ...CONFIG_PATHS.map((filePath) => ({
      label: filePath,
      path: resolve(cwd, filePath),
    })),
    ...(envPath
      ? [
          {
            label: process.env.OTTO_CONFIG?.trim()
              ? `OTTO_CONFIG (${envPath})`
              : `BMAD_AUTOPILOT_CONFIG (${envPath})`,
            path: resolve(envPath),
          },
        ]
      : []),
  ];
};

const displayPath = (filePath: string): string => {
  const rel = relative(process.cwd(), filePath);
  return rel && !rel.startsWith("..") ? rel : filePath;
};

const loadAutopilotPreferences = (): LoadedPreferences => {
  let preferences: AutopilotPreferences = {};
  let source: string | null = null;
  const warnings: string[] = [];

  for (const candidate of preferenceCandidates()) {
    if (!existsSync(candidate.path)) continue;
    try {
      const raw = readFileSync(candidate.path, "utf8");
      const parsed = JSON.parse(raw) as AutopilotPreferences;
      preferences = mergePreferences(
        preferences,
        parsed && typeof parsed === "object" ? parsed : {},
      );
      source = candidate.label;
    } catch (error) {
      warnings.push(
        `${candidate.label} could not be loaded (${error instanceof Error ? error.message : "Unknown preference parse error"})`,
      );
    }
  }

  return {
    preferences: normalizePreferences(preferences),
    source,
    error: warnings.length > 0 ? warnings.join("; ") : null,
  };
};

const saveAutopilotPreferences = (
  preferences: AutopilotPreferences,
): { path: string; preferences: AutopilotPreferences } => {
  const filePath = resolve(process.cwd(), PROJECT_PREFERENCES_PATH);
  mkdirSync(resolve(process.cwd(), ".pi"), { recursive: true });
  const normalized = normalizePreferences(preferences);
  writeFileSync(filePath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return { path: filePath, preferences: normalized };
};

const onboardingChoice = async <T>(
  ctx: ExtensionCommandContext,
  title: string,
  choices: PreferenceChoice<T>[],
): Promise<T | null> => {
  const selected = await ctx.ui.select(
    title,
    choices.map((choice) => choice.label),
  );
  if (!selected) return null;
  return choices.find((choice) => choice.label === selected)?.value ?? null;
};

const onboardingWorkflowOverride = async (
  ctx: ExtensionCommandContext,
  command: WorkflowCommand,
  title: string,
): Promise<WorkflowPreferenceOverride | null> =>
  onboardingChoice(ctx, title, [
    {
      label: `Inherit default | ${command}`,
      value: "inherit",
    },
    {
      label: `Accept default | ${command}`,
      value: "accept-default",
    },
    {
      label: `Party mode | ${command}`,
      value: "party",
    },
  ]);

const onboardingSummary = (preferences: AutopilotPreferences): string[] => {
  const overrides = Object.entries(preferences.workflows?.commandModes ?? {});
  return [
    `Skip init: ${preferences.defaults?.skipInit ? "yes" : "no"}`,
    `Max iterations: ${preferences.defaults?.maxIterations ?? 25}`,
    `Max failures: ${preferences.defaults?.maxFailures ?? 3}`,
    `Fresh session between steps: ${preferences.defaults?.freshSessionBetweenSteps === false ? "no" : "yes"}`,
    `Default mode: ${preferences.workflows?.defaultMode ?? "accept-default"}`,
    `Overrides: ${overrides.length > 0 ? overrides.map(([command, mode]) => `${command}=${mode}`).join(", ") : "none"}`,
  ];
};

const runOnboarding = async (
  ctx: ExtensionCommandContext,
): Promise<{ path: string; preferences: AutopilotPreferences } | null> => {
  if (!ctx.hasUI) {
    ctx.ui.notify("/otto-onboard requires interactive mode.", "error");
    return null;
  }

  const current = loadAutopilotPreferences().preferences;
  const profile = await onboardingChoice(ctx, "Otto profile", [
    {
      label: "Delivery | fresh-session, steady defaults",
      value: {
        defaults: {
          skipInit: false,
          maxIterations: 25,
          maxFailures: 3,
          freshSessionBetweenSteps: true,
        },
        workflows: {
          defaultMode: "accept-default" as WorkflowMode,
        },
      },
    },
    {
      label: "Balanced | longer runs, same review bar",
      value: {
        defaults: {
          skipInit: false,
          maxIterations: 40,
          maxFailures: 4,
          freshSessionBetweenSteps: true,
        },
        workflows: {
          defaultMode: "accept-default" as WorkflowMode,
        },
      },
    },
    {
      label: "Explore | fewer resets, more operator steering",
      value: {
        defaults: {
          skipInit: true,
          maxIterations: 15,
          maxFailures: 5,
          freshSessionBetweenSteps: false,
        },
        workflows: {
          defaultMode: "party" as WorkflowMode,
        },
      },
    },
    {
      label: "Current config | start from what Otto loads now",
      value: current,
    },
  ]);
  if (!profile) return null;

  const skipInit = await onboardingChoice(ctx, "Initialize before looping", [
    { label: "Run initialize first", value: false },
    { label: "Skip initialize", value: true },
  ]);
  if (skipInit === null) return null;

  const freshSessionBetweenSteps = await onboardingChoice(
    ctx,
    "Session continuity between next-step turns",
    [
      { label: "Fresh session between steps", value: true },
      { label: "Stay in same session", value: false },
    ],
  );
  if (freshSessionBetweenSteps === null) return null;

  const maxIterations = await onboardingChoice(ctx, "Max iterations per run", [
    { label: "10 iterations", value: 10 },
    { label: "25 iterations", value: 25 },
    { label: "40 iterations", value: 40 },
    { label: "60 iterations", value: 60 },
  ]);
  if (maxIterations === null) return null;

  const maxFailures = await onboardingChoice(
    ctx,
    "Max recovered failures before stopping",
    [
      { label: "2 failures", value: 2 },
      { label: "3 failures", value: 3 },
      { label: "5 failures", value: 5 },
    ],
  );
  if (maxFailures === null) return null;

  const defaultMode = await onboardingChoice(ctx, "Default workflow mode", [
    {
      label: "Accept default | Otto runs through",
      value: "accept-default" as WorkflowMode,
    },
    {
      label: "Party mode | Otto pauses at major transitions",
      value: "party" as WorkflowMode,
    },
  ]);
  if (!defaultMode) return null;

  const architectureMode = await onboardingWorkflowOverride(
    ctx,
    "/bmad:bmm:create-architecture",
    "Create-architecture workflow mode",
  );
  if (!architectureMode) return null;

  const epicsMode = await onboardingWorkflowOverride(
    ctx,
    "/bmad:bmm:create-epics-and-stories",
    "Create-epics-and-stories workflow mode",
  );
  if (!epicsMode) return null;

  const validatePrdMode = await onboardingWorkflowOverride(
    ctx,
    "/bmad:td:validate-prd",
    "Validate-PRD workflow mode",
  );
  if (!validatePrdMode) return null;

  const preferences = normalizePreferences({
    ...profile,
    defaults: {
      ...(profile.defaults ?? {}),
      skipInit,
      maxIterations,
      maxFailures,
      freshSessionBetweenSteps,
    },
    workflows: {
      ...(profile.workflows ?? {}),
      defaultMode,
      commandModes: {
        ...(architectureMode !== "inherit"
          ? { "/bmad:bmm:create-architecture": architectureMode }
          : {}),
        ...(epicsMode !== "inherit"
          ? { "/bmad:bmm:create-epics-and-stories": epicsMode }
          : {}),
        ...(validatePrdMode !== "inherit"
          ? { "/bmad:td:validate-prd": validatePrdMode }
          : {}),
      },
    },
  });

  const saved = saveAutopilotPreferences(preferences);
  ctx.ui.notify(
    [
      `Saved Otto preferences to ${displayPath(saved.path)}.`,
      ...onboardingSummary(saved.preferences),
    ].join("\n"),
    "success",
  );
  return saved;
};

const workflowModeFor = (
  command: WorkflowCommand,
  preferences: AutopilotPreferences,
): WorkflowMode =>
  preferences.workflows?.commandModes?.[command] ??
  preferences.workflows?.defaultMode ??
  "accept-default";

const workflowPrompt = (
  command: WorkflowCommand,
  preferences: AutopilotPreferences,
  token: string,
): string => {
  const workflow =
    command === "/bmad:td:initialize"
      ? {
          yaml: "_bmad/td-integration/workflows/initialize/workflow.yaml",
          instructions:
            "_bmad/td-integration/workflows/initialize/instructions.xml",
          extra:
            "If td has no open issues, treat that as setup-required and bootstrap planning + td mapping before finishing.",
        }
      : command === "/bmad:td:next-step"
        ? {
            yaml: "_bmad/td-integration/workflows/next-step/workflow.yaml",
            instructions:
              "_bmad/td-integration/workflows/next-step/instructions.xml",
            extra:
              "Use strict priority: reviews first, then ready issues, then epic maintenance workflows. Execute exactly one action, then stop and return.",
          }
        : command === "/bmad:td:validate-prd"
          ? {
              yaml: "_bmad/td-integration/workflows/validate-prd/workflow.yaml",
              instructions:
                "_bmad/td-integration/workflows/validate-prd/instructions.xml",
              extra:
                "Trace completed delivery against PRD requirements, create td tasks for actionable gaps, and stop after reporting coverage.",
            }
          : command === "/bmad:bmm:create-architecture"
            ? {
                yaml: "_bmad/bmm/workflows/3-solutioning/create-architecture/workflow.md",
                instructions:
                  "_bmad/bmm/workflows/3-solutioning/create-architecture/workflow.md",
                extra:
                  "Execute create-architecture from workflow files directly even if slash aliases are unavailable.",
              }
            : command === "/bmad:bmm:create-epics-and-stories"
              ? {
                  yaml: "_bmad/bmm/workflows/3-solutioning/create-epics-and-stories/workflow.md",
                  instructions:
                    "_bmad/bmm/workflows/3-solutioning/create-epics-and-stories/workflow.md",
                  extra:
                    "Execute create-epics-and-stories from workflow files directly even if slash aliases are unavailable.",
                }
              : command === "/bmad:bmm:create-story"
                ? {
                    yaml: "_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml",
                    instructions:
                      "_bmad/bmm/workflows/4-implementation/create-story/instructions.xml",
                    extra:
                      "Execute create-story from workflow files directly and report the selected story.",
                  }
                : {
                    yaml: "_bmad/bmm/workflows/4-implementation/code-review/workflow.yaml",
                    instructions:
                      "_bmad/bmm/workflows/4-implementation/code-review/instructions.xml",
                    extra:
                      "Execute code-review from workflow files directly and report findings and decision.",
                  };

  const executionRequirements = [
    "- Follow workflow instructions directly and perform actions, not just explain them.",
    "- Prefer accept-default behavior and avoid unnecessary prompts.",
    `- ${workflow.extra}`,
    `- Workflow token: ${token}. Carry it through this run and include it unchanged in the final OTTO_RESULT JSON as key token.`,
    "- Report concrete actions taken, artifacts touched, and td outcomes.",
    `- End your final response with exactly one line starting with ${RESULT_PREFIX} followed by valid single-line JSON with keys: command, token, action, issueId, outcome, confidence, summary.`,
    "- Use action from: review, implementation, requirements-validation, epic-workflow, unknown.",
    "- Use outcome from: completed, blocked, needs-input, no-work, failed, unknown.",
    "- Use confidence from: high, medium, low, unknown.",
  ];

  if (workflowModeFor(command, preferences) === "party") {
    executionRequirements.push(
      "- Run this workflow in party mode: pause at major phase transitions, surface key options or tradeoffs, and wait for user direction before continuing.",
    );
  }

  return [
    `Execute BMAD workflow now: ${command}`,
    "",
    "Load and execute using these files:",
    "- _bmad/core/tasks/workflow.xml",
    `- ${workflow.yaml}`,
    `- ${workflow.instructions}`,
    "",
    "Execution requirements:",
    ...executionRequirements,
  ].join("\n");
};

const matchesQueuedWorkflowPrompt = (
  prompt: string,
  awaitingPrompt: string | null,
  awaitingCommand: string | null,
  awaitingToken: string | null,
): boolean => {
  const actual = prompt.trim();
  const expected = awaitingPrompt?.trim() ?? "";
  const command = awaitingCommand?.trim() ?? "";

  if (!actual) return false;
  if (expected && actual === expected) return true;
  if (command && actual === command) return true;
  if (awaitingToken && actual.includes(awaitingToken)) return true;

  const workflowBanner = command ? `Execute BMAD workflow now: ${command}` : "";
  if (workflowBanner && actual.includes(workflowBanner)) return true;

  if (expected) {
    const expectedFirstLine = expected.split("\n", 1)[0]?.trim() ?? "";
    if (expectedFirstLine && actual.includes(expectedFirstLine)) return true;
  }

  return false;
};

export default function otto(pi: ExtensionAPI) {
  let state = newRunState();
  let turnHadToolError = false;
  let onboardingHintShown = false;

  const persistState = (reason: string): void => {
    pi.appendEntry(STATE_ENTRY_TYPE, {
      ...state,
      persistedAt: Date.now(),
      reason,
    });
  };

  const updateUi = (ctx: ExtensionContext): void => {
    if (!ctx.hasUI) return;

    const alert = stateAlert(state);

    const status = state.active
      ? `Otto: ${state.lastIssueId ?? state.lastAction ?? state.phase} | ${state.phase} | ${state.lastConfidence}${alert ? ` | ${alert}` : ""}`
      : `Otto: ${state.phase}`;

    ctx.ui.setStatus("otto", status);

    const widgetLines = [
      `Run: ${state.runId ?? "none"}`,
      `Current td: ${state.lastIssueId ?? "-"}`,
      `Branch: ${state.lastAction ?? "-"}`,
      `Why: ${state.lastDecisionReason ?? "-"}`,
      `Mode: ${state.lastCommandMode}`,
      `Confidence: ${state.lastConfidence}`,
      `Continuity: ${continuityLabel(state.lastContinuation, state.lastContinuationReason)}`,
      `Phase: ${state.phase}`,
      `Iteration: ${state.iteration}/${state.maxIterations}`,
      `Failures: ${state.failures}/${state.maxFailures}`,
      `Last command: ${state.lastCommand ?? "-"}`,
      `Last outcome: ${state.lastOutcome ?? "-"}`,
      `Result source: ${state.lastResultSource ?? "-"}`,
      `Queue state: ${state.queueState}`,
      `Stop code: ${state.stopCode}`,
      `Queue drain passes: ${state.emptyQueuePasses}`,
      `Session hop: ${state.freshSessionBetweenSteps ? "on" : "off"}`,
    ];

    if (alert) widgetLines.push(`Alert: ${alert}`);
    if (state.stopReason) widgetLines.push(`Reason: ${state.stopReason}`);
    ctx.ui.setWidget("otto", widgetLines);
  };

  const setContinuation = (
    continuity: ContinuityKind,
    reason: string,
  ): void => {
    state.lastContinuation = continuity;
    state.lastContinuationReason = shortText(reason, 160);
    state.lastProgressAt = Date.now();
  };

  const restoreState = (ctx: ExtensionContext): void => {
    const branch = ctx.sessionManager.getBranch();
    for (const entry of branch) {
      if (
        entry.type !== "custom" ||
        entry.customType !== STATE_ENTRY_TYPE ||
        typeof entry.data !== "object"
      )
        continue;
      const data = entry.data as Partial<RunState>;
      state = {
        ...newRunState(),
        ...state,
        ...data,
      };
    }
    updateUi(ctx);

    if (onboardingHintShown || !ctx.hasUI) return;
    const hasPreferences =
      loadAutopilotPreferences().source !== null ||
      branch.some(
        (entry) =>
          entry.type === "custom" &&
          entry.customType === ONBOARDING_MARKER_ENTRY_TYPE &&
          typeof entry.data === "object" &&
          entry.data !== null &&
          (entry.data as { version?: number }).version ===
            ONBOARDING_MARKER_VERSION,
      );
    if (hasPreferences) return;

    onboardingHintShown = true;
    ctx.ui.notify(PREFERENCE_ONBOARDING_HINT, "info");
  };

  const markOnboardingHintSeen = (): void => {
    onboardingHintShown = true;
    pi.appendEntry(ONBOARDING_MARKER_ENTRY_TYPE, {
      version: ONBOARDING_MARKER_VERSION,
      seenAt: Date.now(),
    });
  };

  const queueWorkflowCommand = (
    ctx: ExtensionContext,
    command: string,
    reason = "Operator requested workflow execution.",
  ): void => {
    const { preferences, source, error } = loadAutopilotPreferences();
    if (error) {
      state.lastError = `Preference load failed (${source}): ${error}`;
    }
    const token = newWorkflowToken();
    const prompt = workflowPrompt(
      command as WorkflowCommand,
      preferences,
      token,
    );
    const mode = workflowModeFor(command as WorkflowCommand, preferences);
    const options = ctx.isIdle()
      ? undefined
      : { deliverAs: "followUp" as const };
    pi.sendUserMessage(prompt, options);
    state.awaitingCommand = command;
    state.awaitingPrompt = prompt;
    state.awaitingToken = token;
    state.awaitingStarted = false;
    state.lastCommand = command;
    state.lastCommandMode = mode;
    state.lastDecisionReason = shortText(reason, 160);
    state.lastProgressAt = Date.now();
    persistState(`queued:${command}`);
    updateUi(ctx);
  };

  const continueWithFreshSession = (ctx: ExtensionContext): void => {
    setContinuation(
      "fresh-session",
      "Fresh-session mode is enabled; rotate the session before the next workflow step.",
    );
    state.awaitingCommand = CONTINUE_COMMAND;
    state.awaitingPrompt = CONTINUE_COMMAND;
    state.awaitingToken = null;
    state.awaitingStarted = false;
    state.lastCommandMode = "accept-default";
    state.lastDecisionReason = state.lastContinuationReason;
    persistState("queue-session-hop-command");
    updateUi(ctx);

    const options = ctx.isIdle()
      ? undefined
      : { deliverAs: "followUp" as const };
    pi.sendUserMessage(CONTINUE_COMMAND, options);
  };

  const compactAndQueueNextStep = (ctx: ExtensionContext): void => {
    state.awaitingCommand = null;
    state.awaitingPrompt = null;
    state.awaitingToken = null;
    state.awaitingStarted = false;
    persistState("compact-before-next-step");
    updateUi(ctx);

    ctx.compact({
      customInstructions:
        "Preserve only concise Otto continuity: current run phase, latest td issue/action, validation status, unresolved blockers, and immediate next-step context.",
      onComplete: () => {
        if (!state.active || state.phase !== "running") return;
        setContinuation(
          "same-session-compacted",
          "Compaction completed; continue the loop in the current session.",
        );
        queueWorkflowCommand(
          ctx,
          NEXT_STEP_COMMAND,
          "Compaction completed; continue the loop in the current session.",
        );
      },
      onError: () => {
        if (!state.active || state.phase !== "running") return;
        setContinuation(
          "compaction-fallback",
          "Compaction fallback triggered; continue the loop without a fresh session.",
        );
        queueWorkflowCommand(
          ctx,
          NEXT_STEP_COMMAND,
          "Compaction fallback triggered; continue the loop without a fresh session.",
        );
      },
    });
  };

  const queueNextStepIteration = (ctx: ExtensionContext): void => {
    if (state.freshSessionBetweenSteps) {
      continueWithFreshSession(ctx);
      return;
    }
    compactAndQueueNextStep(ctx);
  };

  const hasRemainingWork = async (): Promise<{
    hasImmediateWork: boolean;
    hasInReview: boolean;
  }> => {
    const [reviewable, ready, inReview] = await Promise.all([
      pi.exec("td", ["reviewable"], { timeout: 20000 }),
      pi.exec("td", ["ready"], { timeout: 20000 }),
      pi.exec("td", ["in-review"], { timeout: 20000 }),
    ]);

    const immediateOutput = `${reviewable.stdout}\n${ready.stdout}`;
    const hasImmediateWork = /\btd-[a-z0-9]+\b/i.test(immediateOutput);
    const hasInReview = /\btd-[a-z0-9]+\b/i.test(inReview.stdout);

    return { hasImmediateWork, hasInReview };
  };

  const stopRun = (
    ctx: ExtensionContext,
    phase: Phase,
    reason: string,
    stopCode: StopCode,
  ): void => {
    state.active = false;
    state.phase = phase;
    state.stopReason = reason;
    state.stopCode = stopCode;
    state.awaitingCommand = null;
    state.awaitingPrompt = null;
    state.awaitingToken = null;
    state.awaitingStarted = false;
    state.lastProgressAt = Date.now();
    persistState(`stop:${phase}`);
    updateUi(ctx);
    if (ctx.hasUI) {
      ctx.ui.notify(
        `Otto ${phase}: ${reason}`,
        phase === "error" ? "error" : "info",
      );
    }
  };

  const registerLoopFailure = (
    ctx: ExtensionContext,
    message: string,
    phase: Phase = "error",
  ): boolean => {
    state.failures += 1;
    state.lastError = message;
    state.lastProgressAt = Date.now();

    if (state.failures >= state.maxFailures) {
      stopRun(
        ctx,
        phase,
        `${message} Failure budget reached (${state.failures}/${state.maxFailures}).`,
        "failure-budget-reached",
      );
      return true;
    }

    persistState(`failure:${phase}`);
    updateUi(ctx);
    return false;
  };

  const registerWorkflowCommand = (
    name: string,
    command: WorkflowCommand,
    description: string,
  ): void => {
    pi.registerCommand(name, {
      description,
      handler: async (_args, ctx) => {
        const { preferences, source, error } = loadAutopilotPreferences();
        const prompt = workflowPrompt(command, preferences, newWorkflowToken());
        const options = ctx.isIdle()
          ? undefined
          : { deliverAs: "followUp" as const };
        pi.sendUserMessage(prompt, options);
        if (error && ctx.hasUI) {
          ctx.ui.notify(
            `Otto preferences fallback: ${source} could not be loaded (${error})`,
            "warning",
          );
        }
        ctx.ui.notify(`Queued ${command}`, "info");
      },
    });
  };

  pi.on("session_start", async (_event, ctx) => restoreState(ctx));
  pi.on("session_switch", async (_event, ctx) => restoreState(ctx));
  pi.on("session_fork", async (_event, ctx) => restoreState(ctx));
  pi.on("session_tree", async (_event, ctx) => restoreState(ctx));

  pi.on("turn_start", async () => {
    turnHadToolError = false;
  });

  pi.on("tool_result", async (event) => {
    if (state.active && event.isError) {
      turnHadToolError = true;
      state.lastError = `Tool ${event.toolName} failed`;
    }
  });

  pi.on("before_agent_start", async (event, ctx) => {
    if (!state.active) return;
    if (
      matchesQueuedWorkflowPrompt(
        event.prompt,
        state.awaitingPrompt,
        state.awaitingCommand,
        state.awaitingToken,
      )
    ) {
      state.awaitingStarted = true;
      state.lastProgressAt = Date.now();
      updateUi(ctx);
    }
  });

  pi.on("agent_end", async (event, ctx) => {
    if (!state.active) return;
    if (
      state.phase === "paused" ||
      state.phase === "stopped" ||
      state.phase === "completed" ||
      state.phase === "error"
    )
      return;
    if (!state.awaitingCommand) return;
    if (!state.awaitingStarted) return;

    const completedCommand = state.awaitingCommand;
    const completedToken = state.awaitingToken;
    state.awaitingStarted = false;

    if (completedCommand === CONTINUE_COMMAND) {
      if (ctx.hasUI) {
        ctx.ui.notify(
          "Session-hop command was interpreted as a prompt; falling back to same-session compacted iteration.",
          "warning",
        );
      }
      compactAndQueueNextStep(ctx);
      return;
    }

    const assistantText = extractAssistantText(event.messages as unknown[]);
    const resolvedWorkflowResult = resolveWorkflowResult(
      assistantText,
      completedCommand,
      completedToken,
    );
    const workflowResult = resolvedWorkflowResult.result;
    const summary = resolvedWorkflowResult.summary;
    const entryId = ctx.sessionManager.getLeafId();
    const alert = stateAlert(state);

    if (entryId) {
      state.checkpoints.push({
        iteration: state.iteration,
        entryId,
        command: completedCommand,
        issueId: workflowResult?.issueId ?? parseIssueId(assistantText),
        action: workflowResult?.action ?? classifyAction(assistantText),
        outcome: workflowResult?.outcome ?? classifyOutcome(assistantText),
        confidence: workflowResult?.confidence ?? "unknown",
        queueState: state.queueState,
        continuity: state.lastContinuation,
        continuityReason: state.lastContinuationReason,
        alert,
        reason: state.lastDecisionReason,
        summary,
        timestamp: Date.now(),
      });
      if (state.checkpoints.length > 100) {
        state.checkpoints = state.checkpoints.slice(
          state.checkpoints.length - 100,
        );
      }
      pi.setLabel(
        entryId,
        `auto:${state.runId ?? "run"}:iter-${state.iteration}`,
      );
    }

    state.lastIssueId =
      workflowResult?.issueId ??
      parseIssueId(assistantText) ??
      state.lastIssueId;
    state.lastAction = workflowResult?.action ?? classifyAction(assistantText);
    state.lastOutcome =
      workflowResult?.outcome ?? classifyOutcome(assistantText);
    state.lastConfidence = workflowResult?.confidence ?? "unknown";
    state.lastResultSource = resolvedWorkflowResult.resultSource;
    state.lastProgressAt = Date.now();
    state.lastError = resolvedWorkflowResult.error;

    if (resolvedWorkflowResult.error) {
      if (registerLoopFailure(ctx, resolvedWorkflowResult.error)) return;
    }

    if (turnHadToolError) {
      if (registerLoopFailure(ctx, state.lastError ?? "A tool failed.")) return;
    }

    if (workflowResult?.outcome === "failed") {
      if (
        registerLoopFailure(
          ctx,
          `Workflow reported failure for ${completedCommand}.`,
        )
      )
        return;
    }

    if (workflowResult?.outcome === "needs-input") {
      stopRun(
        ctx,
        "paused",
        `Workflow requested user input for ${completedCommand}.`,
        "paused-for-input",
      );
      return;
    }

    if (workflowResult?.outcome === "blocked") {
      stopRun(
        ctx,
        "paused",
        `Workflow reported blocked state for ${completedCommand}.`,
        "blocked-workflow",
      );
      return;
    }

    if (completedCommand === INIT_COMMAND) {
      state.emptyQueuePasses = 0;
      state.queueState = "ready";
      state.phase = "running";
      state.lastError = null;
      state.stopCode = "none";
      persistState("init-complete");
      if (ctx.hasUI) {
        ctx.ui.notify(
          "Initialization complete, starting next-step loop.",
          "success",
        );
      }
      queueNextStepIteration(ctx);
      return;
    }

    state.iteration += 1;
    if (state.iteration >= state.maxIterations) {
      stopRun(
        ctx,
        "completed",
        `Reached max iterations (${state.maxIterations}).`,
        "max-iterations-reached",
      );
      return;
    }

    let workLeft = false;
    let hasInReview = false;
    try {
      const workState = await hasRemainingWork();
      workLeft = workState.hasImmediateWork;
      hasInReview = workState.hasInReview;
      state.queueState = workLeft
        ? "ready"
        : hasInReview
          ? "in-review-only"
          : state.emptyQueuePasses >= 1
            ? "drained-ready-for-validation"
            : "drained-first-pass";
      state.lastError = null;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown td check failure";
      if (registerLoopFailure(ctx, message)) return;
      workLeft = true;
    }

    if (!workLeft) {
      if (hasInReview && state.freshSessionBetweenSteps) {
        state.emptyQueuePasses = 0;
        state.queueState = "in-review-only";
        persistState("loop-continue-in-review-session-hop");
        queueNextStepIteration(ctx);
        return;
      }

      state.emptyQueuePasses += 1;

      if (completedCommand === VALIDATE_PRD_COMMAND) {
        state.queueState = hasInReview ? "in-review-only" : "drained-final";
        stopRun(
          ctx,
          "completed",
          hasInReview
            ? "Only in-review issues remain after PRD validation and session hopping is disabled."
            : "No reviewable, ready, epic-maintenance, or PRD gap work remains.",
          hasInReview ? "validate-prd-in-review-only" : "validate-prd-finished",
        );
        return;
      }

      if (
        state.emptyQueuePasses === 1 ||
        (completedCommand === NEXT_STEP_COMMAND &&
          state.lastAction === "epic-workflow")
      ) {
        state.queueState = "drained-first-pass";
        persistState("loop-continue-drained-queue-sweep");
        queueNextStepIteration(ctx);
        return;
      }

      state.queueState = "drained-ready-for-validation";
      persistState("loop-run-validate-prd");
      queueWorkflowCommand(
        ctx,
        VALIDATE_PRD_COMMAND,
        "Ready/reviewable work is drained; validate against the PRD and reopen any real gaps.",
      );
      return;
    }

    state.emptyQueuePasses = 0;
    state.queueState = "ready";

    persistState("loop-continue");
    queueNextStepIteration(ctx);
  });

  const registerOttoCommand = (
    primaryName: string,
    legacyName: string,
    description: string,
    handler: (args: string, ctx: ExtensionCommandContext) => Promise<void>,
  ): void => {
    pi.registerCommand(primaryName, {
      description,
      handler,
    });
    pi.registerCommand(legacyName, {
      description: `Alias for /${primaryName}`,
      handler,
    });
  };

  const continueHandler = async (
    _args: string,
    ctx: ExtensionCommandContext,
  ): Promise<void> => {
    if (!state.active || state.phase !== "running") return;

    state.awaitingCommand = null;
    state.awaitingPrompt = null;
    state.awaitingToken = null;
    state.awaitingStarted = false;
    persistState("session-hop-command-received");
    updateUi(ctx);

    const result = await ctx.newSession();
    if (result.cancelled) {
      stopRun(
        ctx,
        "error",
        "Session rotation cancelled.",
        "session-rotation-cancelled",
      );
      return;
    }

    persistState("session-rotated");
    updateUi(ctx);
    queueWorkflowCommand(
      ctx,
      NEXT_STEP_COMMAND,
      "Fresh session created successfully; continue with the next-step workflow.",
    );
  };

  registerOttoCommand(
    "otto-continue",
    "bmad-auto-continue",
    "Internal: continue Otto in a fresh session",
    continueHandler,
  );

  registerWorkflowCommand(
    "bmad:td:initialize",
    "/bmad:td:initialize",
    "Run BMAD td initialize workflow",
  );
  registerWorkflowCommand(
    "bmad:td:next-step",
    "/bmad:td:next-step",
    "Run BMAD td next-step workflow",
  );
  registerWorkflowCommand(
    "bmad:td:validate-prd",
    "/bmad:td:validate-prd",
    "Run BMAD td PRD validation workflow",
  );
  registerWorkflowCommand(
    "bmad-td-initialize",
    "/bmad:td:initialize",
    "Alias for /bmad:td:initialize",
  );
  registerWorkflowCommand(
    "bmad-td-next-step",
    "/bmad:td:next-step",
    "Alias for /bmad:td:next-step",
  );
  registerWorkflowCommand(
    "bmad-td-validate-prd",
    "/bmad:td:validate-prd",
    "Alias for /bmad:td:validate-prd",
  );
  registerWorkflowCommand(
    "bmad:bmm:create-architecture",
    "/bmad:bmm:create-architecture",
    "Run BMAD create-architecture workflow",
  );
  registerWorkflowCommand(
    "bmad-bmm-create-architecture",
    "/bmad:bmm:create-architecture",
    "Alias for /bmad:bmm:create-architecture",
  );
  registerWorkflowCommand(
    "bmad:bmm:create-epics-and-stories",
    "/bmad:bmm:create-epics-and-stories",
    "Run BMAD create-epics-and-stories workflow",
  );
  registerWorkflowCommand(
    "bmad-bmm-create-epics-and-stories",
    "/bmad:bmm:create-epics-and-stories",
    "Alias for /bmad:bmm:create-epics-and-stories",
  );
  registerWorkflowCommand(
    "bmad:bmm:create-story",
    "/bmad:bmm:create-story",
    "Run BMAD create-story workflow",
  );
  registerWorkflowCommand(
    "bmad-bmm-create-story",
    "/bmad:bmm:create-story",
    "Alias for /bmad:bmm:create-story",
  );
  registerWorkflowCommand(
    "bmad:bmm:code-review",
    "/bmad:bmm:code-review",
    "Run BMAD code-review workflow",
  );
  registerWorkflowCommand(
    "bmad-bmm-code-review",
    "/bmad:bmm:code-review",
    "Alias for /bmad:bmm:code-review",
  );

  const startHandler = async (
    args: string,
    ctx: ExtensionCommandContext,
  ): Promise<void> => {
    if (state.active && state.phase !== "paused") {
      ctx.ui.notify("Otto is already running.", "warning");
      return;
    }

    const parsed = parseStartArgs(args);
    const { preferences, source, error } = loadAutopilotPreferences();
    const defaults = preferences.defaults;
    const now = Date.now();
    const freshSessionBetweenSteps =
      parsed.sameSession !== undefined
        ? false
        : (defaults?.freshSessionBetweenSteps ?? true);
    const skipInit = parsed.skipInit ?? defaults?.skipInit ?? false;
    const initialCommand = skipInit ? NEXT_STEP_COMMAND : INIT_COMMAND;

    state = {
      ...newRunState(),
      runId: `run-${now}`,
      active: true,
      phase: skipInit ? "running" : "initializing",
      maxIterations:
        parsed.maxIterations ?? defaults?.maxIterations ?? state.maxIterations,
      maxFailures:
        parsed.maxFailures ?? defaults?.maxFailures ?? state.maxFailures,
      freshSessionBetweenSteps,
      lastProgressAt: now,
      awaitingCommand: initialCommand,
      awaitingPrompt: null,
      awaitingToken: null,
      awaitingStarted: false,
      stopCode: "none",
      queueState: skipInit ? "ready" : "unknown",
    };

    persistState("start");
    updateUi(ctx);
    queueWorkflowCommand(
      ctx,
      initialCommand,
      skipInit
        ? "Skip initialize and begin directly with next-step based on existing workspace state."
        : "Start by initializing BMAD and td context before entering the next-step loop.",
    );
    if (source && ctx.hasUI) {
      ctx.ui.notify(
        error
          ? `Otto preferences fallback: ${source} could not be loaded (${error})`
          : `Loaded Otto preferences from ${source}`,
        error ? "warning" : "info",
      );
    }
    ctx.ui.notify("Otto started.", "success");
  };

  registerOttoCommand(
    "otto-start",
    "bmad-auto-start",
    "Start Otto initialize -> next-step loop",
    startHandler,
  );

  const onboardHandler = async (
    _args: string,
    ctx: ExtensionCommandContext,
  ): Promise<void> => {
    const saved = await runOnboarding(ctx);
    if (!saved) return;
    markOnboardingHintSeen();
  };

  registerOttoCommand(
    "otto-onboard",
    "bmad-auto-onboard",
    "Set Otto project preferences with an onboarding flow",
    onboardHandler,
  );

  const statusHandler = async (
    _args: string,
    ctx: ExtensionCommandContext,
  ): Promise<void> => {
    const loadedPreferences = loadAutopilotPreferences();
    const status = [
      `Run: ${state.runId ?? "none"}`,
      `Preferences: ${loadedPreferences.source ?? "built-in defaults"}`,
      `Current td: ${state.lastIssueId ?? "-"}`,
      `Branch: ${state.lastAction ?? "-"}`,
      `Why: ${state.lastDecisionReason ?? "-"}`,
      `Mode: ${state.lastCommandMode}`,
      `Phase: ${state.phase}`,
      `Active: ${state.active ? "yes" : "no"}`,
      `Iteration: ${state.iteration}/${state.maxIterations}`,
      `Failures: ${state.failures}/${state.maxFailures}`,
      `Last command: ${state.lastCommand ?? "-"}`,
      `Last outcome: ${state.lastOutcome ?? "-"}`,
      `Confidence: ${state.lastConfidence}`,
      `Continuity: ${continuityLabel(state.lastContinuation, state.lastContinuationReason)}`,
      `Result source: ${state.lastResultSource ?? "-"}`,
      `Queue state: ${state.queueState}`,
      `Stop code: ${state.stopCode}`,
      `Stop reason: ${state.stopReason ?? "-"}`,
    ].join("\n");

    const detailLines = [status];
    const alert = stateAlert(state);
    if (alert) detailLines.push(`Alert: ${alert}`);
    if (loadedPreferences.error) {
      detailLines.push(`Preference warning: ${loadedPreferences.error}`);
    }

    ctx.ui.notify(detailLines.join("\n"), "info");
    updateUi(ctx);
  };

  registerOttoCommand(
    "otto-status",
    "bmad-auto-status",
    "Show Otto state summary",
    statusHandler,
  );

  const pauseHandler = async (
    _args: string,
    ctx: ExtensionCommandContext,
  ): Promise<void> => {
    if (!state.active) {
      ctx.ui.notify("Otto is not running.", "warning");
      return;
    }
    state.phase = "paused";
    persistState("pause");
    updateUi(ctx);
    ctx.ui.notify("Otto paused.", "info");
  };

  registerOttoCommand(
    "otto-pause",
    "bmad-auto-pause",
    "Pause Otto after current turn",
    pauseHandler,
  );

  const resumeHandler = async (
    _args: string,
    ctx: ExtensionCommandContext,
  ): Promise<void> => {
    if (!state.active || state.phase !== "paused") {
      ctx.ui.notify("Otto is not paused.", "warning");
      return;
    }

    state.phase = "running";
    state.stopReason = null;
    state.stopCode = "none";
    state.awaitingCommand = NEXT_STEP_COMMAND;
    state.awaitingPrompt = null;
    state.awaitingToken = null;
    state.awaitingStarted = false;
    persistState("resume");
    updateUi(ctx);

    queueWorkflowCommand(
      ctx,
      NEXT_STEP_COMMAND,
      "Resume the loop from a paused state and continue with the next-step workflow.",
    );
    ctx.ui.notify("Otto resumed.", "success");
  };

  registerOttoCommand(
    "otto-resume",
    "bmad-auto-resume",
    "Resume Otto loop",
    resumeHandler,
  );

  const stopHandler = async (
    args: string,
    ctx: ExtensionCommandContext,
  ): Promise<void> => {
    if (!state.active) {
      ctx.ui.notify("Otto is not running.", "warning");
      return;
    }
    const reason = args.trim() || "Stopped manually.";
    stopRun(ctx, "stopped", reason, "manual-stop");
  };

  registerOttoCommand(
    "otto-stop",
    "bmad-auto-stop",
    "Stop Otto loop",
    stopHandler,
  );

  const diveHandler = async (
    _args: string,
    ctx: ExtensionCommandContext,
  ): Promise<void> => {
    if (!ctx.hasUI) {
      ctx.ui.notify("/otto-dive requires interactive mode.", "error");
      return;
    }
    if (state.checkpoints.length === 0) {
      ctx.ui.notify("No Otto checkpoints available.", "warning");
      return;
    }

    const recent = [...state.checkpoints].reverse().slice(0, 30);
    const options = recent.map((checkpoint) => checkpointLabel(checkpoint));

    const selected = await ctx.ui.select("Otto checkpoints", options);
    if (!selected) return;

    const index = options.indexOf(selected);
    if (index < 0) return;
    const checkpoint = recent[index];

    const action = await ctx.ui.select(
      "Checkpoint action",
      checkpointActionOptions(checkpoint),
    );
    if (!action) return;

    if (action.startsWith("Show details")) {
      ctx.ui.notify(
        [
          `Checkpoint: #${checkpoint.iteration}`,
          `Time: ${new Date(checkpoint.timestamp).toLocaleString()}`,
          `td: ${checkpoint.issueId ?? "-"}`,
          `Command: ${checkpoint.command}`,
          `Branch: ${checkpoint.action ?? "-"}`,
          `Outcome: ${checkpoint.outcome ?? "-"}`,
          `Confidence: ${checkpoint.confidence}`,
          `Continuity: ${continuityLabel(checkpoint.continuity, checkpoint.continuityReason)}`,
          `Queue state: ${checkpoint.queueState}`,
          `Alert: ${checkpoint.alert ?? "-"}`,
          `Why: ${checkpoint.reason ?? "-"}`,
          `Summary: ${checkpoint.summary}`,
        ].join("\n"),
        "info",
      );
      return;
    }

    if (action.startsWith("Navigate here")) {
      await ctx.navigateTree(checkpoint.entryId, {
        summarize: true,
        label: `dive:${state.runId ?? "run"}:iter-${checkpoint.iteration}`,
      });
      return;
    }

    await ctx.fork(checkpoint.entryId);
  };

  registerOttoCommand(
    "otto-dive",
    "bmad-auto-dive",
    "Navigate or fork at an Otto checkpoint",
    diveHandler,
  );
}
