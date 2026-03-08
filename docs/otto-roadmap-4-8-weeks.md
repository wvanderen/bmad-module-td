# Otto Roadmap (4-8 Weeks)

## Goal

Increase trust in Otto's long-running autonomy for AI coding power users.

Primary target:

- improve next-step decision quality
- preserve tight context across loops
- raise evidence quality for approval and review
- make queue drain with minimal babysitting feel real

## Success Metrics

Track progress with this composite:

- expert agreement with Otto's next-step decisions
- queue-drain rate with acceptable review outcomes
- rate of catching PRD or runtime truth gaps before false completion

Roadmap targets for a passing dry run:

- next-step decision agreement at or above 80%
- queue-drain rate at or above 75%
- approval rate on completed work at or above 80%
- PRD or runtime truth-gap catch rate at 100%
- session-hop success rate at or above 75%
- no more than 2 human interventions per run

Interpret the composite as follows:

- decision agreement shows whether Otto is choosing the right work often enough
- queue-drain plus approval rate shows whether Otto is turning ready work into reviewable progress without creating rework debt
- truth-gap catch rate is the safety metric: if it drops below 100%, the run is not roadmap-successful even if velocity looks good

Supporting indicators:

- fewer loop failures caused by orchestration brittleness
- fewer low-confidence approvals
- better operator understanding of current td, branch, and confidence

## Phase 1: Control Plane Hardening

Timeframe:

- Weeks 1-2

Why first:

- better packaging or broader autonomy do not matter if the loop itself is fragile

Outcomes:

- Otto run state becomes more explicit and reliable
- workflow completion detection depends less on assistant phrasing
- session hop and continuation behavior are more deterministic

Priority work:

- replace heuristic action/result parsing with more structured loop signals where possible
- tighten detection around queued workflow completion and next action selection
- improve failure classification: workflow failure vs tool failure vs weak evidence vs drift
- make stop reasons and low-confidence states machine-readable
- reduce reliance on compaction as a normal continuation path

Definition of done:

- dry runs more often fail because the workflow made a bad decision than because Otto lost the loop

## Phase 2: Operator Cockpit

Timeframe:

- Weeks 2-4

Why now:

- expert users need a tighter control surface before trusting longer autonomous runs

Outcomes:

- Otto exposes the most important run state clearly
- re-entering a run becomes easier and faster
- users can tell why Otto is doing what it is doing

Priority work:

- make `current td`, action branch, why, confidence, and mode the default visible run summary
- improve checkpoint summaries so they are useful operationally, not just technically
- surface weak-evidence and drift conditions clearly in the run status
- refine pause/resume/stop/dive UX around real operator workflows
- make fallback continuity behavior legible when session hopping or compaction is involved

Definition of done:

- a power user can leave and re-enter an Otto run without manually reconstructing the operating frame

## Phase 3: Evidence and Review Bar

Timeframe:

- Weeks 3-5

Why now:

- better autonomy without stronger evidence just scales false confidence

Outcomes:

- Otto pushes reviews toward runtime truth instead of artifact truth
- approval quality becomes meaningfully stronger than test-only validation

Priority work:

- formalize the evidence hierarchy in review output and handoff output
- expand validation methodology usage in Otto-controlled loops
- add stronger detection and reporting for simulated, mocked, placeholder, or synthetic success signals
- make approval-grade reviews explicitly map changed behavior to PRD or story requirements
- differentiate delivery mode, explore mode, and custom mode evidence policy

Definition of done:

- approved reviewable td issues consistently include evidence from the real target surface when applicable

## Phase 4: Drift and Product Truth Detection

Timeframe:

- Weeks 4-6

Why now:

- the most dangerous failure mode is clean workflow execution that still misses the actual product core

Outcomes:

- Otto gets better at catching false-completion patterns
- Otto repairs td framing when work reality changes

Priority work:

- improve PRD gap validation and follow-up task creation around runtime truth, not just artifact coverage
- add detection patterns for scaffold-heavy or placeholder-heavy delivery states
- create stronger td drift handling defaults for delivery mode
- make low-confidence completion visible and actionable
- tune PRD validation to surface "core loop not real yet" failures cleanly

Definition of done:

- Otto catches more cases where the workflow looks complete but the product core is still missing

## Phase 5: Smart Defaults and Autonomy Modes

Timeframe:

- Weeks 5-8

Why now:

- once the control plane and evidence bar improve, smarter autonomy tuning becomes worth exposing

Outcomes:

- Otto supports clearer explore, delivery, and custom operating modes
- high-autonomy runs become more tunable without losing identity

Priority work:

- formalize mode defaults for approval policy, drift policy, and evidence thresholds
- expand per-workflow configuration beyond current `party` vs `accept-default`
- let users tune smart defaults without needing to rewrite the philosophy of the loop
- document recommended profiles for exploratory builds vs serious delivery work

Definition of done:

- users can choose an autonomy posture that fits the project without Otto losing coherence

## Phase 6: Productization Cleanup

Timeframe:

- parallel as needed, but not the main driver before trust improves

Why later:

- distributing fragility faster is not progress

Outcomes:

- the package becomes easier to install, configure, and reason about
- prototype seams become less confusing

Priority work:

- simplify source-of-truth and packaging flow between `examples/pi-extension/otto.ts` and `packages/otto/src/otto.ts`
- improve installation and compatibility docs
- reduce path and environment assumptions where possible
- clarify release quality expectations for external adopters

Definition of done:

- external power users can get to a first meaningful Otto run with less repo-specific knowledge

## Recommended Immediate Backlog

Top 8 items:

1. define structured Otto run outcomes to reduce parser fragility
2. improve status surface around current td, branch, why, confidence, and mode
3. make weak-evidence states explicit in run state and review output
4. strengthen PRD validation around runtime truth and false-completion detection
5. formalize explore/delivery/custom autonomy modes
6. tighten session-hop-first continuity behavior and fallback reporting
7. detect placeholder or simulated success in implementation and review phases
8. clean up package/example source-of-truth confusion

## What Not To Prioritize First

- beginner-friendly onboarding polish
- broad platform expansion before trust improves
- deeper workflow ownership before orchestration quality is stable
- speed optimizations that do not improve judgment or confidence

## Review Cadence

Use a short weekly review against these questions:

- Did Otto make better next-step decisions this week?
- Did it preserve context sharpness across loops?
- Did it produce stronger evidence for approval-quality work?
- Did it catch any false-completion patterns earlier than before?
- Did a power user need less babysitting to get meaningful progress?

For each real Otto dry run:

1. fill in `templates/otto-evaluation-scorecard.template.json`
2. run `npm run score:otto-run -- <filled-scorecard.json>`
3. record the score, caution flags, and missed targets in the roadmap notes
4. convert repeated misses into the next roadmap tasks
