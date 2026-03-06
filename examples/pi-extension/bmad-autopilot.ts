import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";

const INIT_COMMAND = "/bmad:td:initialize";
const NEXT_STEP_COMMAND = "/bmad:td:next-step";
const STATE_ENTRY_TYPE = "bmad-autopilot-state";

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
): { skipInit: boolean; maxIterations?: number; maxFailures?: number } => {
  const tokens = args
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  const parsed: {
    skipInit: boolean;
    maxIterations?: number;
    maxFailures?: number;
  } = { skipInit: false };

  for (const token of tokens) {
    if (token === "--skip-init") parsed.skipInit = true;
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

const workflowPrompt = (
  command:
    | "/bmad:td:initialize"
    | "/bmad:td:next-step"
    | "/bmad:bmm:create-architecture"
    | "/bmad:bmm:create-epics-and-stories"
    | "/bmad:bmm:create-story"
    | "/bmad:bmm:code-review",
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
              "Use strict priority: reviews first, then ready issues, then epic maintenance workflows.",
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

  return [
    `Execute BMAD workflow now: ${command}`,
    "",
    "Load and execute using these files:",
    "- _bmad/core/tasks/workflow.xml",
    `- ${workflow.yaml}`,
    `- ${workflow.instructions}`,
    "",
    "Execution requirements:",
    "- Follow workflow instructions directly and perform actions, not just explain them.",
    "- Prefer accept-default behavior and avoid unnecessary prompts.",
    `- ${workflow.extra}`,
    "- Report concrete actions taken, artifacts touched, and td outcomes.",
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
    const prompt = workflowPrompt(
      command as
        | "/bmad:td:initialize"
        | "/bmad:td:next-step"
        | "/bmad:bmm:create-architecture"
        | "/bmad:bmm:create-epics-and-stories"
        | "/bmad:bmm:create-story"
        | "/bmad:bmm:code-review",
    );
    const options = ctx.isIdle()
      ? undefined
      : { deliverAs: "followUp" as const };
    pi.sendUserMessage(prompt, options);
    state.awaitingCommand = command;
    state.lastCommand = command;
    state.lastProgressAt = Date.now();
    persistState(`queued:${command}`);
    updateUi(ctx);
  };

  const hasRemainingWork = async (): Promise<boolean> => {
    const [reviewable, ready] = await Promise.all([
      pi.exec("td", ["reviewable"], { timeout: 20000 }),
      pi.exec("td", ["ready"], { timeout: 20000 }),
    ]);

    const output = `${reviewable.stdout}\n${ready.stdout}`;
    return /\btd-[a-z0-9]+\b/i.test(output);
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
    command:
      | "/bmad:td:initialize"
      | "/bmad:td:next-step"
      | "/bmad:bmm:create-architecture"
      | "/bmad:bmm:create-epics-and-stories"
      | "/bmad:bmm:create-story"
      | "/bmad:bmm:code-review",
    description: string,
  ): void => {
    pi.registerCommand(name, {
      description,
      handler: async (_args, ctx) => {
        const prompt = workflowPrompt(command);
        const options = ctx.isIdle()
          ? undefined
          : { deliverAs: "followUp" as const };
        pi.sendUserMessage(prompt, options);
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
    if (state.awaitingCommand) {
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

    const completedCommand = state.awaitingCommand;

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
      state.awaitingCommand = NEXT_STEP_COMMAND;
      persistState("init-complete");
      if (ctx.hasUI) {
        ctx.ui.notify(
          "Initialization complete, starting next-step loop.",
          "success",
        );
      }
      queueWorkflowCommand(ctx, NEXT_STEP_COMMAND);
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
    try {
      workLeft = await hasRemainingWork();
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
      stopRun(ctx, "completed", "No reviewable or ready issues remain.");
      return;
    }

    state.awaitingCommand = NEXT_STEP_COMMAND;
    persistState("loop-continue");
    queueWorkflowCommand(ctx, NEXT_STEP_COMMAND);
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
      const now = Date.now();

      state = {
        ...newRunState(),
        runId: `run-${now}`,
        active: true,
        phase: parsed.skipInit ? "running" : "initializing",
        maxIterations: parsed.maxIterations ?? state.maxIterations,
        maxFailures: parsed.maxFailures ?? state.maxFailures,
        lastProgressAt: now,
        awaitingCommand: parsed.skipInit ? NEXT_STEP_COMMAND : INIT_COMMAND,
      };

      persistState("start");
      updateUi(ctx);
      queueWorkflowCommand(
        ctx,
        parsed.skipInit ? NEXT_STEP_COMMAND : INIT_COMMAND,
      );
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
