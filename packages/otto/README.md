# Otto

<!-- markdownlint-disable MD033 -->
<div align="center">
  <pre>██████╗ ████████╗████████╗ ██████╗
██╔═══██╗╚══██╔══╝╚══██╔══╝██╔═══██╗
██║   ██║   ██║      ██║   ██║   ██║
██║   ██║   ██║      ██║   ██║   ██║
╚██████╔╝   ██║      ██║   ╚██████╔╝
 ╚═════╝    ╚═╝      ╚═╝    ╚═════╝</pre>
</div>

<p align="center">
  <img src="./otto.svg" alt="Otto logo" width="240" />
</p>
<!-- markdownlint-enable MD033 -->

Otto is the Pi-native operating layer for BMAD + `td` execution.

This package publishes Otto's Pi extension source, packaged skill
resources, and the automation loop that turns BMAD workflows, `td`
state, and validation evidence into a tighter closed-loop delivery
system.

## Installation

Install from npm into Pi:

```bash
pi install npm:@wvanderen/otto
```

Install from a local checkout while developing:

```bash
pi install ./packages/otto
```

Otto is a Pi package, so the primary install path is `pi install`, not `npm install`.

## Quick Start

1. Install Otto into Pi
2. Open your BMAD + `td` project in Pi
3. Run `/otto-onboard` to write project preferences into `.pi/otto.json`
4. Start using Otto's workflow wrappers or run the loop directly

Common commands:

- `/otto-onboard`
- `/otto-start`
- `/otto-status`
- `/otto-pause`
- `/otto-resume`
- `/otto-stop`
- `/otto-dive`
- `/bmad:td:initialize`
- `/bmad:td:next-step`
- `/bmad:td:validate-prd`

## What Otto Is

Otto is built for developer AI power users who already spend much of
the day inside coding agents and want a meaningful jump in velocity
without giving up judgment, traceability, or review discipline.

Otto is not:

- a generic agent shell
- a thin slash-command wrapper
- an autonomy-maximalist system that treats workflow completion as success

Otto is optimized for:

- strong next-step decisions
- tight, fresh context across loops
- td review separation and session-aware execution
- runtime truth over artifact-only completion
- queue drain with minimal babysitting

## What Ships In This Package

- Pi extension entrypoint at `src/index.ts`
- Otto extension implementation in `src/otto.ts`
- packaged Pi skill resources in `skills/otto/`
- package metadata in `package.json` via the `pi.extensions` and
  `pi.skills` manifest fields

The published package is intentionally shaped to match Pi's package
model so public users can install it directly with `pi install`.

## Core Loop

Otto's operating loop is:

1. prepare the workspace
2. execute the highest-value next step
3. preserve review separation and context sharpness
4. validate against PRD and real runtime behavior
5. reopen gaps as actionable td work

This is what makes Otto feel like an operator instead of a prompt bundle.

## Product Principles

When goals conflict, Otto should optimize in this order:

1. decision quality
2. traceability and confidence
3. low-friction operator flow
4. raw speed

Otto trusts evidence in this order:

1. real runtime behavior
2. direct PRD core-loop validation
3. human review of the working product
4. automated tests and checks
5. workflow and artifact completion signals

That means passing tests can support a claim, but they should not
outweigh weak product truth.

Approval-grade next-step and review work should also include:

- explicit mapping from changed behavior to PRD, story, or issue requirements
- clear labeling for simulated, mocked, placeholder, or artifact-only success signals
- machine-checkable evidence output covering validation context,
  changed files, gate results, artifact references, risks, and
  follow-up `td` work
- downgraded confidence and explicit weak-evidence handling when
  runtime proof is missing

## Current Capabilities

Otto currently provides:

- automation around `/bmad:td:initialize`, `/bmad:td:next-step`, and `/bmad:td:validate-prd`
- an onboarding flow via `/otto-onboard` for project-wide Otto preferences
- workflow wrappers for BMAD planning, execution, and review flows
- failure budgets, checkpoints, run state, and monitoring for longer loops
- fresh-session continuation tools such as dive, fork, and session hopping
- PRD gap reopening so weak or partial delivery becomes real follow-up work
- evidence heuristics that flag placeholder, runtime-gap, PRD-gap,
  and drift language before Otto stops
- `td` drift detection when a workflow claims no remaining work but
  `td` state still disagrees
- formalized `delivery`, `explore`, and `custom` autonomy modes with
  explicit approval, drift, evidence, and steering policies
- optional workflow-specific steering via `party` mode
- a packaged `otto` skill resource discoverable by Pi agents

## Configuration

Run `/otto-onboard` to save project-wide Otto preferences into `.pi/otto.json`.

Otto reads optional JSON preferences in increasing precedence:

- `.otto.json`
- `.pi/otto.json`
- `.bmad-autopilot.json`
- `.pi/bmad-autopilot.json`
- `OTTO_CONFIG`
- `BMAD_AUTOPILOT_CONFIG`

Key config surfaces:

- `autonomy.mode`: `delivery`, `explore`, or `custom`
- `autonomy.policies.approval`: `strict`, `balanced`, or `draft`
- `autonomy.policies.drift`: `validate`, `continue`, or `pause`
- `autonomy.policies.evidence`: `strict`, `balanced`, or `relaxed`
- `autonomy.policies.steering`: `steady` or `interactive`
- `workflows.commandModes`: opt selected workflows into
  higher-steering modes such as `party`

Recommended defaults:

- `delivery`: strict approval, validate on drift, strict evidence, steady steering
- `explore`: draft approval, continue on drift, relaxed evidence, interactive steering
- `custom`: delivery-shaped baseline with explicit overrides

Use `workflows.commandModes` to opt specific workflows into `party` mode, for example:

- `/bmad:bmm:create-architecture`
- `/bmad:td:validate-prd`

This supports mixed autonomy rather than one fixed control philosophy.

## Packaging Model

Current source of truth:

- `examples/pi-extension/otto.ts`
- `examples/pi-extension/skills/otto/SKILL.md`

Before `npm pack` or `npm publish`, the package sync step copies that source into:

- `packages/otto/src/otto.ts`
- `packages/otto/skills/otto/SKILL.md`

That keeps local Pi iteration centered on the example extension while
still shipping the real source in the published Otto package.

## Roadmap

Otto is on a path from strong orchestration into stronger judgment,
runtime validation, and product-truth enforcement.

Near-term roadmap:

- **Control plane hardening:** replace brittle loop parsing with more
  structured run signals and clearer stop reasons
- **Operator cockpit:** surface current `td`, branch, why,
  confidence, and mode so re-entry is easy
- **Evidence and review bar:** make runtime proof, PRD mapping, and
  weak-evidence handling more explicit
- **Drift and product truth detection:** catch false completion
  earlier and reopen gaps as real `td` work
- **Autonomy modes and productization:** sharpen mode defaults,
  simplify packaging, and reduce prototype seams

Working docs:

- `docs/otto-manifesto.md`
- `docs/otto-dna-roadmap.md`
- `docs/otto-roadmap-4-8-weeks.md`
- `docs/otto-evaluation-scorecard.md`

If you want the fuller product direction behind this roadmap, start
with `docs/otto-manifesto.md`.

## Security And Trust Model

Otto is designed for serious delivery work, so users should expect it to:

- inspect and act on local repository state
- run project commands needed for validation
- create or update local config files such as `.pi/otto.json`
- make workflow decisions based on BMAD artifacts, `td` state, and runtime evidence

That is the point of the package, but it also means you should review
the source, understand your autonomy settings, and choose the right
evidence policy for the project.

## Publishing

```bash
# Validate the package tarball before publishing
npm run publish:check

# Patch release
npm run release

# Minor release
npm run release:minor

# Major release
npm run release:major

# Publish package
npm run publish:package
```
