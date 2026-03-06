import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";

const INIT_COMMAND = "/bmad:td:initialize";
const NEXT_STEP_COMMAND = "/bmad:td:next-step";
const CONTINUE_COMMAND = "/bmad-auto-continue";
const STATE_ENTRY_TYPE = "bmad-autopilot-state";

type WorkflowCommand =
  | "/bmad:td:initialize"
  | "/bmad:td:next-step"
  | "/bmad:bmm:create-architecture"
  | "/bmad:bmm:create-epics-and-stories"
  | "/bmad:bmm:create-story"
  | "/bmad:bmm:code-review";

type WorkflowMode = "accept-default" | "party";

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

const CONFIG_PATHS = [".bmad-autopilot.json", ".pi/bmad-autopilot.json"];

type Phase =
  | "idle"
  | "initializing"
  | "running"
  | "paused"
  | "stopped"
  | "completed"
  | "error";

interface Checkpoint {
  iteration: number;
  entryId: string;
  command: string;
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
  lastAction: string | null;
  lastIssueId: string | null;
  lastError: string | null;
  lastProgressAt: number;
  stopReason: string | null;
  checkpoints: Checkpoint[];
  awaitingCommand: string | null;
  awaitingPrompt: string | null;
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
  lastIssueId: null,
  lastError: null,
  lastProgressAt: Date.now(),
  stopReason: null,
  checkpoints: [],
  awaitingCommand: null,
  awaitingPrompt: null,
  freshSessionBetweenSteps: true,
});

const shortText = (text: string, max = 120): string => {
  const squashed = text.replace(/\s+/g, " ").trim();
  if (squashed.length <= max) return squashed;
  return `${squashed.slice(0, max - 3)}...`;
};

const classifyAction = (assistantText: string): string => {
  const text = assistantText.toLowerCase();
  if (text.includes("review") || text.includes("approve")) return "review";
  if (text.includes("implement") || text.includes("in_progress"))
    return "implementation";
  if (
    text.includes("epic") ||
    text.includes("create-story") ||
    text.includes("code-review")
  )
    return "epic-workflow";
  return "unknown";
};

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

const parseIssueId = (text: string): string | null => {
  const match = text.match(/\btd-[a-z0-9]+\b/i);
  return match ? match[0] : null;
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

const loadAutopilotPreferences = (): LoadedPreferences => {
  const envPath = process.env.BMAD_AUTOPILOT_CONFIG?.trim();
  const candidates = [
    ...(envPath ? [resolve(envPath)] : []),
    ...CONFIG_PATHS.map((filePath) => resolve(process.cwd(), filePath)),
  ];

  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue;
    try {
      const raw = readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw) as AutopilotPreferences;
      return {
        preferences: parsed && typeof parsed === "object" ? parsed : {},
        source: filePath,
        error: null,
      };
    } catch (error) {
      return {
        preferences: {},
        source: filePath,
        error:
          error instanceof Error
            ? error.message
            : "Unknown preference parse error",
      };
    }
  }

  return { preferences: {}, source: null, error: null };
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
    "- Report concrete actions taken, artifacts touched, and td outcomes.",
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

export default function bmadAutopilot(pi: ExtensionAPI) {
  let state = newRunState();
  let currentPrompt = "";
  let turnHadToolError = false;

  const persistState = (reason: string): void => {
    pi.appendEntry(STATE_ENTRY_TYPE, {
      ...state,
      persistedAt: Date.now(),
      reason,
    });
  };

  const updateUi = (ctx: ExtensionContext): void => {
    if (!ctx.hasUI) return;

    const status = state.active
      ? `BMAD auto: ${state.phase} #${state.iteration}/${state.maxIterations}`
      : `BMAD auto: ${state.phase}`;

    ctx.ui.setStatus("bmad-autopilot", status);

    const widgetLines = [
      `Run: ${state.runId ?? "none"}`,
      `Phase: ${state.phase}`,
      `Iteration: ${state.iteration}/${state.maxIterations}`,
      `Failures: ${state.failures}/${state.maxFailures}`,
      `Last command: ${state.lastCommand ?? "-"}`,
      `Last action: ${state.lastAction ?? "-"}`,
      `Last issue: ${state.lastIssueId ?? "-"}`,
      `Session hop: ${state.freshSessionBetweenSteps ? "on" : "off"}`,
    ];

    if (state.stopReason) widgetLines.push(`Reason: ${state.stopReason}`);
    ctx.ui.setWidget("bmad-autopilot", widgetLines);
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
  };

  const queueWorkflowCommand = (
    ctx: ExtensionContext,
    command: string,
  ): void => {
    const { preferences, source, error } = loadAutopilotPreferences();
    if (error) {
      state.lastError = `Preference load failed (${source}): ${error}`;
    }
    const prompt = workflowPrompt(command as WorkflowCommand, preferences);
    const options = ctx.isIdle()
      ? undefined
      : { deliverAs: "followUp" as const };
    pi.sendUserMessage(prompt, options);
    state.awaitingCommand = command;
    state.awaitingPrompt = prompt;
    state.lastCommand = command;
    state.lastProgressAt = Date.now();
    persistState(`queued:${command}`);
    updateUi(ctx);
  };

  const continueWithFreshSession = (ctx: ExtensionContext): void => {
    const maybeNewSession = (
      ctx as unknown as {
        newSession?: () => Promise<{ cancelled?: boolean }>;
      }
    ).newSession;

    if (typeof maybeNewSession === "function") {
      state.awaitingCommand = null;
      state.awaitingPrompt = null;
      persistState("direct-session-hop-attempt");
      updateUi(ctx);

      void maybeNewSession
        .call(ctx)
        .then((result) => {
          if (!state.active || state.phase !== "running") return;
          if (result?.cancelled) {
            stopRun(ctx, "error", "Session rotation cancelled.");
            return;
          }
          persistState("session-rotated-direct");
          updateUi(ctx);
          queueWorkflowCommand(ctx, NEXT_STEP_COMMAND);
        })
        .catch(() => {
          if (!state.active || state.phase !== "running") return;
          state.awaitingCommand = CONTINUE_COMMAND;
          state.awaitingPrompt = CONTINUE_COMMAND;
          persistState("queue-session-hop-fallback-command");
          updateUi(ctx);

          const options = ctx.isIdle()
            ? undefined
            : { deliverAs: "followUp" as const };
          pi.sendUserMessage(CONTINUE_COMMAND, options);
        });

      return;
    }

    state.awaitingCommand = CONTINUE_COMMAND;
    state.awaitingPrompt = CONTINUE_COMMAND;
    persistState("queue-session-hop");
    updateUi(ctx);

    const options = ctx.isIdle()
      ? undefined
      : { deliverAs: "followUp" as const };
    pi.sendUserMessage(CONTINUE_COMMAND, options);
  };

  const compactAndQueueNextStep = (ctx: ExtensionContext): void => {
    state.awaitingCommand = null;
    state.awaitingPrompt = null;
    persistState("compact-before-next-step");
    updateUi(ctx);

    ctx.compact({
      customInstructions:
        "Preserve only concise BMAD autopilot continuity: current run phase, latest td issue/action, validation status, unresolved blockers, and immediate next-step context.",
      onComplete: () => {
        if (!state.active || state.phase !== "running") return;
        queueWorkflowCommand(ctx, NEXT_STEP_COMMAND);
      },
      onError: () => {
        if (!state.active || state.phase !== "running") return;
        queueWorkflowCommand(ctx, NEXT_STEP_COMMAND);
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
  ): void => {
    state.active = false;
    state.phase = phase;
    state.stopReason = reason;
    state.awaitingCommand = null;
    state.awaitingPrompt = null;
    state.lastProgressAt = Date.now();
    persistState(`stop:${phase}`);
    updateUi(ctx);
    if (ctx.hasUI) {
      ctx.ui.notify(
        `BMAD autopilot ${phase}: ${reason}`,
        phase === "error" ? "error" : "info",
      );
    }
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
        const prompt = workflowPrompt(command, preferences);
        const options = ctx.isIdle()
          ? undefined
          : { deliverAs: "followUp" as const };
        pi.sendUserMessage(prompt, options);
        if (error && ctx.hasUI) {
          ctx.ui.notify(
            `BMAD autopilot preferences fallback: ${source} could not be loaded (${error})`,
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

  pi.on("agent_start", async (event, ctx) => {
    currentPrompt = typeof event.prompt === "string" ? event.prompt.trim() : "";
    if (!state.active) return;
    if (state.awaitingPrompt && currentPrompt === state.awaitingPrompt) {
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
    if (!state.awaitingPrompt || currentPrompt !== state.awaitingPrompt) return;

    const completedCommand = state.awaitingCommand;

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
    const summary = shortText(assistantText || "No assistant summary.");
    const entryId = ctx.sessionManager.getLeafId();

    if (entryId) {
      state.checkpoints.push({
        iteration: state.iteration,
        entryId,
        command: completedCommand,
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

    state.lastIssueId = parseIssueId(assistantText) ?? state.lastIssueId;
    state.lastAction = classifyAction(assistantText);
    state.lastProgressAt = Date.now();

    if (turnHadToolError) {
      state.failures += 1;
      if (state.failures >= state.maxFailures) {
        stopRun(
          ctx,
          "error",
          `Failure budget reached (${state.failures}/${state.maxFailures}).`,
        );
        return;
      }
    }

    if (completedCommand === INIT_COMMAND) {
      state.phase = "running";
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
      );
      return;
    }

    let workLeft = false;
    let hasInReview = false;
    try {
      const workState = await hasRemainingWork();
      workLeft = workState.hasImmediateWork;
      hasInReview = workState.hasInReview;
    } catch (error) {
      state.failures += 1;
      state.lastError =
        error instanceof Error ? error.message : "Unknown td check failure";
      if (state.failures >= state.maxFailures) {
        stopRun(ctx, "error", "Unable to query td queue state.");
        return;
      }
      workLeft = true;
    }

    if (!workLeft) {
      if (hasInReview && state.freshSessionBetweenSteps) {
        persistState("loop-continue-in-review-session-hop");
        queueNextStepIteration(ctx);
        return;
      }

      stopRun(
        ctx,
        "completed",
        hasInReview
          ? "Only in-review issues remain and session hopping is disabled."
          : "No reviewable or ready issues remain.",
      );
      return;
    }

    persistState("loop-continue");
    queueNextStepIteration(ctx);
  });

  pi.registerCommand("bmad-auto-continue", {
    description: "Internal: continue autopilot in fresh session",
    handler: async (_args, ctx: ExtensionCommandContext) => {
      if (!state.active || state.phase !== "running") return;

      state.awaitingCommand = null;
      state.awaitingPrompt = null;
      persistState("session-hop-command-received");
      updateUi(ctx);

      const result = await ctx.newSession();
      if (result.cancelled) {
        stopRun(ctx, "error", "Session rotation cancelled.");
        return;
      }

      persistState("session-rotated");
      updateUi(ctx);
      queueWorkflowCommand(ctx, NEXT_STEP_COMMAND);
    },
  });

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

  pi.registerCommand("bmad-auto-start", {
    description: "Start BMAD initialize -> next-step autopilot",
    handler: async (args, ctx) => {
      if (state.active && state.phase !== "paused") {
        ctx.ui.notify("Autopilot is already running.", "warning");
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
          parsed.maxIterations ??
          defaults?.maxIterations ??
          state.maxIterations,
        maxFailures:
          parsed.maxFailures ?? defaults?.maxFailures ?? state.maxFailures,
        freshSessionBetweenSteps,
        lastProgressAt: now,
        awaitingCommand: initialCommand,
        awaitingPrompt: null,
      };

      persistState("start");
      updateUi(ctx);
      queueWorkflowCommand(ctx, initialCommand);
      if (source && ctx.hasUI) {
        ctx.ui.notify(
          error
            ? `BMAD autopilot preferences fallback: ${source} could not be loaded (${error})`
            : `Loaded BMAD autopilot preferences from ${source}`,
          error ? "warning" : "info",
        );
      }
      ctx.ui.notify("BMAD autopilot started.", "success");
    },
  });

  pi.registerCommand("bmad-auto-status", {
    description: "Show autopilot state summary",
    handler: async (_args, ctx) => {
      const status = [
        `Run: ${state.runId ?? "none"}`,
        `Phase: ${state.phase}`,
        `Active: ${state.active ? "yes" : "no"}`,
        `Iteration: ${state.iteration}/${state.maxIterations}`,
        `Failures: ${state.failures}/${state.maxFailures}`,
        `Last command: ${state.lastCommand ?? "-"}`,
        `Last issue: ${state.lastIssueId ?? "-"}`,
      ].join("\n");

      ctx.ui.notify(status, "info");
      updateUi(ctx);
    },
  });

  pi.registerCommand("bmad-auto-pause", {
    description: "Pause autopilot after current turn",
    handler: async (_args, ctx) => {
      if (!state.active) {
        ctx.ui.notify("Autopilot is not running.", "warning");
        return;
      }
      state.phase = "paused";
      persistState("pause");
      updateUi(ctx);
      ctx.ui.notify("BMAD autopilot paused.", "info");
    },
  });

  pi.registerCommand("bmad-auto-resume", {
    description: "Resume autopilot loop",
    handler: async (_args, ctx: ExtensionCommandContext) => {
      if (!state.active || state.phase !== "paused") {
        ctx.ui.notify("Autopilot is not paused.", "warning");
        return;
      }

      state.phase = "running";
      state.stopReason = null;
      state.awaitingCommand = NEXT_STEP_COMMAND;
      state.awaitingPrompt = null;
      persistState("resume");
      updateUi(ctx);

      queueWorkflowCommand(ctx, NEXT_STEP_COMMAND);
      ctx.ui.notify("BMAD autopilot resumed.", "success");
    },
  });

  pi.registerCommand("bmad-auto-stop", {
    description: "Stop autopilot loop",
    handler: async (args, ctx) => {
      if (!state.active) {
        ctx.ui.notify("Autopilot is not running.", "warning");
        return;
      }
      const reason = args.trim() || "Stopped manually.";
      stopRun(ctx, "stopped", reason);
    },
  });

  pi.registerCommand("bmad-auto-dive", {
    description: "Navigate or fork at an autopilot checkpoint",
    handler: async (_args, ctx: ExtensionCommandContext) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("/bmad-auto-dive requires interactive mode.", "error");
        return;
      }
      if (state.checkpoints.length === 0) {
        ctx.ui.notify("No autopilot checkpoints available.", "warning");
        return;
      }

      const recent = [...state.checkpoints].reverse().slice(0, 30);
      const options = recent.map(
        (checkpoint) =>
          `#${checkpoint.iteration} | ${new Date(checkpoint.timestamp).toLocaleTimeString()} | ${checkpoint.command} | ${checkpoint.summary}`,
      );

      const selected = await ctx.ui.select("Autopilot checkpoints", options);
      if (!selected) return;

      const index = options.indexOf(selected);
      if (index < 0) return;
      const checkpoint = recent[index];

      const action = await ctx.ui.select("Checkpoint action", [
        "Navigate here",
        "Fork from here",
      ]);
      if (!action) return;

      if (action === "Navigate here") {
        await ctx.navigateTree(checkpoint.entryId, {
          summarize: true,
          label: `dive:${state.runId ?? "run"}:iter-${checkpoint.iteration}`,
        });
        return;
      }

      await ctx.fork(checkpoint.entryId);
    },
  });
}
