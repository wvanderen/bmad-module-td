# Otto

![Otto logo](./otto.svg)

Otto is the Pi-native operating layer for BMAD + td execution.

This package publishes Otto's Pi extension source and the automation loop that turns BMAD workflows, td state, and validation evidence into a tighter closed-loop delivery system.

## What Otto Is

Otto is built for developer AI power users who already spend much of the day inside coding agents and want a meaningful jump in velocity without giving up judgment, traceability, or review discipline.

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

That means passing tests can support a claim, but they should not outweigh weak product truth.

Approval-grade next-step and review work should also include:

- explicit mapping from changed behavior to PRD, story, or issue requirements
- clear labeling for simulated, mocked, placeholder, or artifact-only success signals
- machine-checkable evidence output covering validation context, changed files, gate results, artifact references, risks, and follow-up td work
- downgraded confidence and explicit weak-evidence handling when runtime proof is missing

## Current Capabilities

Otto currently provides:

- automation around `/bmad:td:initialize`, `/bmad:td:next-step`, and `/bmad:td:validate-prd`
- an onboarding flow via `/otto-onboard` for project-wide Otto preferences
- workflow wrappers for BMAD planning, execution, and review flows
- failure budgets, checkpoints, run state, and monitoring for longer loops
- fresh-session continuation tools such as dive, fork, and session hopping
- PRD gap reopening so weak or partial delivery becomes real follow-up work
- optional workflow-specific steering via `party` mode
- a packaged `otto` skill resource discoverable by Pi agents

## Configuration

Run `/otto-onboard` to save project-wide Otto preferences into `.pi/otto.json`.

Otto reads optional JSON preferences from, in increasing precedence:

- `.otto.json`
- `.pi/otto.json`
- `.bmad-autopilot.json`
- `.pi/bmad-autopilot.json`
- `OTTO_CONFIG`
- `BMAD_AUTOPILOT_CONFIG`

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

That keeps local Pi iteration centered on the example extension while still shipping the real source in the published Otto package.

## Strategy And Roadmap

Otto is on a path from strong orchestration into stronger judgment and product-truth enforcement.

Near-term priorities:

- harden the control plane so the loop fails less from orchestration brittleness
- improve the operator cockpit with clearer state, why, and confidence
- raise the review bar with stronger runtime evidence and PRD mapping
- catch drift and false-completion patterns earlier
- clarify autonomy modes and clean up productization seams

Working docs:

- `docs/otto-manifesto.md`
- `docs/otto-dna-roadmap.md`
- `docs/otto-roadmap-4-8-weeks.md`
- `docs/otto-evaluation-scorecard.md`

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
