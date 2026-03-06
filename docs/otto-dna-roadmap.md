# Otto DNA and Roadmap

## Current Thesis

Otto is becoming a Pi-native operating layer for BMAD + td execution.

It is not just a command wrapper and not a generic autonomous agent. Its center of gravity is a closed-loop workflow:

1. initialize the workspace
2. execute the highest-priority next step
3. preserve review separation and session continuity
4. validate against the PRD when the queue drains
5. reopen actionable gaps as td work

That loop makes Otto feel less like a helper and more like an operator.

## Target User

Primary user:

- developer AI code power users
- already spend much of the day inside AI coding tools
- already understand agentic loops and chained workflows
- want a meaningful velocity jump, not novelty
- are ready for the next step after lightweight manual agent orchestration

Initial wedge:

- solo builders and highly technical operators who can tolerate rough edges in exchange for leverage

## Otto DNA

Otto's core DNA:

- mixed-autonomy BMAD operating system for Pi
- closed-loop execution with traceability
- session-aware autonomy that respects review boundaries
- human-steerable, not human-absent

What should remain true even as the project evolves:

- Otto should make real decisions and take real action, not just suggest commands.
- Otto should expose checkpoints, state, and evidence so users can re-enter the loop without losing trust.
- Otto should preserve requirement -> story -> td -> implementation -> validation continuity.
- Otto should be strongest for people who already work fluently with AI agents.

## Current Strengths

- Clear loop model: initialize -> next-step -> validate-prd.
- Strong alignment with td review separation and BMAD planning structure.
- Good operational primitives already exist: state machine, failure budget, checkpoints, dive/fork, session hopping.
- Mixed-autonomy is already present through accept-default and per-workflow party mode.
- PRD validation is positioned as a queue-reopening mechanism, not a passive report.

## Current Frictions

- Loop control is still brittle because it relies on prompt text matching and assistant-output parsing.
- User control is present but still thin relative to the complexity of the loop.
- Observability exists, but it is not yet rich enough to explain why Otto chose a path or where confidence is low.
- Packaging is promising but still prototype-shaped, with a source-of-truth split between example and package copies.
- Workflow quality and consistency still materially affect trust in autonomy.

## Revealing Failure Mode

One of the most important failure patterns is not unique to Otto, but Otto will inherit it unless it is designed against it.

Pattern:

- BMAD execution can successfully work through planned stories while still failing to produce software that actually satisfies the PRD.
- The system looks productive at the workflow layer while missing the product's true core loop.
- Placeholder logic, simulated health, or scaffold-heavy output can create a false sense of completion.

Why this matters:

- this is the most dangerous version of "good process, bad judgment"
- it creates apparent momentum while drifting away from the actual user outcome
- it can pass through story completion without establishing a real product truth signal

Design implication for Otto:

- Otto cannot treat story completion as strong evidence of product completion.
- Otto needs stronger PRD-to-runtime traceability, not just PRD-to-story traceability.
- Otto should become more suspicious of simulated or placeholder success signals.
- Otto should help detect when the implemented surface is mostly scaffold while the product core remains unreal.

## Product Principles

- Prefer dependable progress over maximal autonomy.
- Make autonomy inspectable before making it broader.
- Treat governance and speed as complementary, not opposing, forces.
- Optimize for power-user flow, not beginner onboarding first.
- Keep the Pi-native session model as a product feature, not an implementation detail.
- Make autonomy boundary configurable; different projects should support different trust settings.
- Invest in smart defaults so higher-autonomy runs still produce high-quality output.
- Reward product truth over workflow completion.
- Keep execution context tight by default; irrelevant context should be treated as a quality and speed tax.

## Signature Product Moment

The deepest Otto magic is not a single clever action. It is sustained trustworthy execution over a meaningful stretch of work.

The visible payoff is:

- Otto drains a real queue with very little babysitting.

The underlying cause is:

- Otto makes the right next-step decisions often enough that power users stop second-guessing it.

This means the product bar is not just task completion. The bar is long-running autonomy with enough quality, continuity, and judgment that expert users feel a real workflow phase-change.

## Optimization Order

When goals conflict, Otto should optimize in this order:

1. decision quality and good judgment
2. traceability and confidence
3. user flow state and low-friction operation
4. raw speed and throughput

Why this order:

- speed only compounds if users trust the decisions
- traceability is part of how Otto improves decision quality over time
- low-friction operation matters, but not if it hides weak reasoning or weak evidence

## Evidence Hierarchy

Otto should evaluate delivery quality using a weighted combination of signals, not a single proxy.

Recommended evidence order:

1. real runtime behavior
2. direct validation against PRD core-loop assertions
3. human review of the working product
4. automated tests and checks
5. workflow/artifact completion signals

Interpretation:

- tests are useful, but can be spoofed or overfit
- artifact completion is useful, but is the weakest signal of actual product truth
- the closer a signal is to real user experience, the more Otto should trust it

For product classes, this implies:

- web UI should be validated in-browser and examined with vision-capable review for UX quality
- CLI products should be validated by actually running commands and inspecting real outputs
- interactive systems should be checked against real session state and observable behavior, not mocked surfaces
- simulated success should never count as equivalent to live success

## Review Bar

For approved reviewable td issues, Otto should aim for a stronger quality bar than "tests passed".

Approval-grade review should include:

- evidence that the changed behavior was exercised in the real target surface
- explicit PRD or story requirement mapping
- identification of any simulated, mocked, placeholder, or synthetic behavior still present
- confidence judgment that distinguishes product truth from scaffold truth
- clear rationale when required validation is skipped or relaxed

This is especially important for higher-autonomy loops. As autonomy increases, Otto should raise the standard for evidence quality rather than lowering it.

## Weak Evidence Policy

When Otto sees strong completion signals but weak evidence, default behavior should depend on autonomy mode.

Recommended default policy:

- delivery mode: block approval and create or reuse follow-up td work
- explore mode: allow continuation with explicit low-confidence labeling
- custom mode: follow project-configured policy and thresholds

Escalation behavior:

- pause for operator judgment in specific ambiguous or high-consequence cases
- do not make operator intervention the default response for every weak-evidence case

This keeps Otto flexible for exploratory runs without weakening the review bar for serious delivery work.

## Default Opinionation

Otto should be opinionated by default in these areas:

1. validation and approval standards
2. next-step prioritization logic
3. session and continuity behavior

Why these deserve strong defaults:

- validation standards determine whether Otto's output is trustworthy
- prioritization logic determines whether the loop makes good decisions
- session behavior determines whether Otto preserves a sharp working context instead of degrading into slow, blurry long-context operation

Default continuity stance:

- prefer fresh-session iteration over long single-context runs
- use compaction as a fallback or tactical tool, not the primary operating model
- preserve only the minimum continuity state needed for the next high-quality decision
- treat context bloat as a core product problem because it reduces both model sharpness and operator trust

## Run Visibility

During a run, Otto should make the current operating context legible without overwhelming the user.

Recommended visibility order:

1. current td issue and action branch
2. why Otto chose this next action
3. current confidence and evidence strength
4. continuity details when they are relevant

Notes:

- if session hopping is working properly, some continuity should already be implicit in td state rather than re-explained every turn
- showing the current td issue is a strong proxy for what is in active context
- carried-forward versus dropped context is still valuable, but mostly when compaction or fallback continuity behavior is involved
- the UI should surface reasoning and confidence without turning every run into a verbose trace dump

## td Drift Policy

When Otto concludes that the current td issue is no longer the right frame for the real work, behavior should depend on autonomy mode.

Recommended default policy:

- delivery mode: create or update td work to reflect reality, then continue from the corrected frame
- explore mode: continue while flagging the drift clearly
- custom mode: follow project-configured policy

Operator escalation remains useful for ambiguous or high-consequence cases, but drift correction should usually be operational work Otto can do directly.

## Roadmap Shape

### 1. Control Plane Hardening

Goal: make the loop dependable enough that users trust Otto on meaningful work.

Focus areas:

- replace heuristic workflow completion detection with more structured signals where possible
- reduce dependence on assistant phrasing for action classification
- improve recovery paths for session hops, compaction, and partial failures
- make run state and stop reasons more explicit and machine-readable

Definition of success:

- dry runs fail less because of orchestration fragility than because of genuine workflow gaps

### 2. Operator Experience

Goal: make Otto feel like a serious cockpit for AI power users.

Focus areas:

- show why Otto selected a specific branch of action
- surface confidence, blockers, and evidence expectations clearly
- make pause, steer, override, and checkpoint re-entry smoother
- improve the quality of run summaries and progress narration

Definition of success:

- a power user can leave and re-enter a run without reconstructing state manually

### 3. Delivery Governance

Goal: make Otto uniquely strong at trustworthy agentic delivery.

Focus areas:

- deepen requirement coverage and PRD traceability
- deepen runtime reality checks so core requirements are validated against real behavior, not only planned artifacts
- strengthen validation methodology adoption and evidence capture
- improve mapping between BMAD artifacts and td execution state
- make gap creation and follow-up work more deterministic

Definition of success:

- Otto can explain what is done, what is validated, what remains risky, and what work it created next

### 4. Workflow Quality

Goal: improve the quality ceiling of Otto by improving the workflows it drives.

Focus areas:

- tighten next-step decision quality
- improve create-story and code-review usefulness
- improve quality and consistency of validate-prd outcomes
- tune where accept-default is strong vs where party mode is necessary

Definition of success:

- users feel that Otto's decisions are usually the right default for experienced operators

### 5. Productization

Goal: turn Otto from exciting prototype into a reusable product.

Focus areas:

- simplify installation and configuration
- reduce coupling and path assumptions
- clean up packaging and source-of-truth workflow
- clarify versioning, release quality, and compatibility expectations

Definition of success:

- an external Pi power user can install Otto and reach first useful run with minimal repo-specific knowledge

## Product Boundary Evolution

Recommended ownership sequence:

1. orchestration and operator UX
2. judgment layer on top of BMAD and td
3. deeper workflow semantics over time

Interpretation:

- near term, BMAD and td remain the execution engine and state model
- Otto should first become the best control plane and operator surface for those systems
- next, Otto should add stronger judgment: evidence quality, drift detection, runtime reality checks, confidence assessment, and autonomy-mode policy
- only after that should Otto absorb more workflow semantics directly to reduce dependence on prompt-driven execution boundaries

This staged path preserves leverage from BMAD and td while giving Otto room to become more than a wrapper.

## Success Metrics

For the next phase, Otto should use a composite success model rather than a single vanity metric.

Primary composite:

- next-step decision agreement rate
- queue-drain rate with acceptable review outcomes
- rate of catching PRD or runtime truth gaps before false completion

Recommended interpretation:

- leading indicator: percentage of next-step decisions an expert human would agree with
- visible outcome: ability to drain real queues with minimal babysitting
- safety check: how often Otto catches false-completion patterns before they are approved

This keeps Otto focused on the real chain:

- better judgment produces better flow
- better flow produces real velocity
- stronger reality checks prevent fake wins

## Sequencing

Recommended order:

1. control plane hardening
2. operator experience
3. delivery governance
4. workflow quality tuning in parallel
5. productization push once the core loop is trustworthy

Reasoning:

- If the loop is brittle, better packaging only distributes fragility.
- If observability is weak, greater autonomy reduces trust.
- If governance is weak, velocity gains will not feel safe enough to compound.

## Non-Goals For Now

- optimizing first for beginners or non-technical users
- becoming a general-purpose agent framework
- hiding the underlying workflow model from advanced users
- maximizing autonomy at the expense of inspectability

## Human Judgment Boundaries

Default recommendation for serious work:

- keep humans in the loop for planning pivots and strategy changes
- keep humans in the loop for consequential review and approval decisions

But Otto should not hard-code a single autonomy philosophy.

Desired product behavior:

- users can choose their autonomy boundary by project or workflow
- users can relax or disable gates for exploratory runs
- users can keep tighter controls for decision-critical projects
- users can tune smart defaults so more autonomous runs still reflect project intent and quality expectations

This flexibility is part of the product, not an edge case.

## Open Questions

- How opinionated should Otto be about workflow strategy versus letting users shape the loop heavily?
- Where should Otto stop and require operator confirmation, even for power users?
- What form of observability creates the most trust: better summaries, richer state, explicit evidence logs, or all three?
- What should count as an unmistakable Otto win in a real daily workflow?

## Anti-Pattern To Avoid

Otto should never become a system that:

- completes stories cleanly
- emits plausible-looking artifacts
- reports healthy status
- and still fails the core PRD experience when a human actually inspects the product

If this anti-pattern appears, Otto should surface it explicitly rather than smoothing it over.
