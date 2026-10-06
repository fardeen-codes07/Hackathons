# RIPPLE Behavior Contract

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Native labelled select in `ScenarioPanel` | This contract and `premium-ui.json` | Native platform popup | Keyboard selection and Golden Path E2E |
| Scrollbar | Global application stylesheet in `globals.css` | `DESIGN.md` tokens | Density inherited by scrollable surfaces | Static audit and rendered browser inspection |
| Simulation actions | Shared buttons in `ScenarioPanel` and sandbox header | This contract | Primary scenario action / compact toolbar action | Unit, integration, and Golden Path E2E |
| Building selection | Accessible SVG building interaction in `CampusMap` | This contract | Pointer and keyboard selection | Keyboard browser inspection and E2E |
| Analysis views | Shared tablist in `DecisionAnalysis` | This contract | Compare / Optimize / WHY / Brief | E2E and visible panel inspection |
| Scenario presets | `ScenarioLibrary` | `src/data/mockData.ts` | Load a deterministic preset into the builder | E2E and rendered inspection |
| Campus signals | `CampusSignalsPanel` | `src/data/campusTwin.ts` | Compact source metadata / connector-ready state | Rendered inspection and static audit |
| Digital Twin network | `SystemNetwork` | `src/lib/digitalTwinModel.ts` + `src/data/campusTwin.ts` | Structural dependency view with selected-entity detail | Unit, keyboard, responsive, and E2E checks |
| Predictive signals | `PredictiveSignalsPanel` | `src/engine/predictiveModel.ts` + `runSimulation()` | Expected signals before or during a run | Unit and E2E |
| Future Lab | `DecisionMode` intervention tree | `decisionSession` + `interventionRules.ts` | Explore one intervention at a time while preserving sibling futures | Decision E2E and branch-session unit tests |
| Causal node detail | `RippleRail` | Current `CampusMetrics` and scenario | Expand one modeled dependency to see what changed and why | Keyboard browser inspection and E2E |
| Selected future projection | `SelectedFutureBanner` in Operations | Active completed `decisionSession` branch | Show projected outcome beside the baseline anchor | Decision/Operations E2E |
| Operational impact | `ImpactPanel` | `src/lib/operationalIntelligence.ts` + intervention rules | Baseline-to-projection deltas | Unit and Brief E2E |
| Decision Brief | Brief tab in `DecisionAnalysis` | `src/lib/operationalIntelligence.ts` | Copy and browser print actions | Unit, copy, print, and E2E |
| What If | `WhatIfPanel` | Pure `runSimulation()` call | Preview a duration, then explicitly apply it | E2E and unit engine coverage |
| Trust and history | `TrustPanel` / `HistoryPanel` | Synthetic disclosure and provider state | Local-only confidence context and replayable session history | Static audit and rendered inspection |
| View mode | `ViewSwitcher` | Shared `CampusStateProvider` | Focus / Decision / Operations presentation | Focus, Decision, and Golden Path E2E |
| Decision session | `useCampusState()` decision actions | In-memory `decisionSession` above the simulation engine | Select branch / Back / Try another path / Reset session | Decision E2E and reset/re-run coverage |
| Focus scenario choice | `FocusMode` | `scenarioPresets` and `loadScenario()` | Building closure / transport disruption / weather event | Focus E2E and keyboard inspection |

## Canonical workflow

`/` introduces the RIPPLE thesis and links to Focus at `/sandbox`. Focus asks “What decision do you want to test?” and keeps the Golden Path available as a progressive flow: choose a real preset, configure the closure, inspect expected signals, simulate, inspect the live result, compare interventions, and open WHY. Decision at `/sandbox?view=decision` is the Future Lab: choose a response, explore its projected future, backtrack to the intervention point, preserve explored branches, revisit a sibling path, compare selected futures, and read WHY before the explicit human-review handoff. Operations at `/sandbox?view=operations` exposes the full map, ripple, structural Digital Twin network, timeline, library, What If, campus signals, history, and analysis; when a completed future is active, its projected metrics are labelled separately from the baseline anchor. The Brief header action opens the canonical Brief tab rather than depending on a hidden anchor. Scenario presets and What If are supporting paths that never replace the primary flow.

View switching changes presentation, not state. The provider remains shared while changing `view`; the deterministic simulation, snapshots, history, reset safety, completed metrics, and in-memory decision session are the same source of truth. Guided Demo continues to use `/sandbox?guide=1` and intentionally forces Operations so the tutorial can point at real controls.

## Simulation lifecycle

- `idle`: baseline metrics and operational buildings.
- `running`: snapshots reveal in order; scenario inputs and Simulate are disabled; Pause and Reset remain available.
- `paused`: the current snapshot remains visible; Resume continues the remaining snapshots, while changing a scenario input returns to the baseline before editing continues.
- `complete`: the final snapshot is stable; Run and Simulate are disabled until Reset, so a new run cannot accidentally reuse stale results.
- `reset`: clears timers and presentation state, then restores the exact baseline.
- `history`: a completed run is recorded locally in the current session and can be replayed by loading its original scenario inputs; it does not persist to a backend.

## Controls and ownership

- Scenario selects are labelled native `<select>` controls.
- Actions use semantic buttons with visible focus, disabled, busy, and pressed states. Future cards expose their current state in text and accessible labels; comparison toggles may use pressed state, while the main future cards remain ordinary buttons with `aria-current` for the active path.
- Building selection is keyboard accessible and exposes `aria-pressed`.
- Comparison, optimization, and WHY are structured panels, not conversational UI. Optimize presents the lowest-risk path insight, its mechanism, deterministic evidence metrics, the named intervention, and its score in that order; the score and candidate values remain unchanged.
- Operational Impact and Decision Brief use the same derived projection model. `CURRENT BASELINE` is the Do Nothing closure outcome; `PROJECTED OUTCOME` is the selected completed future or the deterministic recommendation when no future is selected. The Brief includes a plain-text copy action with inline status feedback and an optional browser print action. The status remains a human-review handoff and never implies automatic execution.
- Inline status text is the source of truth for simulation state; animation is enhancement only.
- The guided demo is an overlay over real controls. It may advance the presentation, but it cannot mutate simulation state through fake controls.
- Focus uses real preset selection, native labelled controls, and the shared `loadScenario`, `updateScenario`, and `simulate` actions. Its configuration maps every existing `ScenarioKind` to scenario-appropriate fields: building closures expose a building selector; non-building scenarios expose their existing target readout, duration, and exact load/severity without a generic building control. The ready summary, simulation heading, and result heading all read from that same scenario object. Its “Try another scenario” action resets the shared state before returning to the picker.
- Scenario configuration validates target, duration, start time, severity, and affected systems before simulation. The same `Scenario` object drives the scenario summary and `PredictiveSignalsPanel`, which exposes component forecasts as deterministic prototype signals. Prediction does not rank interventions; Decision Mode and the intervention rules remain the source of decision outcomes.
- Focus WHY and Compare are local presentation panels. “View detailed WHY”, “View full comparison”, and “Explore system” route to Operations and preserve the active provider state.
- Decision uses the shared simulation lifecycle for each selected branch. The causal timing comes from the deterministic engine; candidate outcome metrics are resolved by explicit intervention rules in `src/engine/interventionRules.ts` from the controlled synthetic closure baseline, not predictive forecasts. The Future Lab presents one scenario and three available interventions, each with its mechanism, complexity, and projected stability/affected/recovery preview. The active branch presents the chosen intervention, its mechanism, the derived consequence, and the committed outcome in that order. Branch history keeps completed paths visible and allows a completed future to be revisited. `Back to intervention` cancels an active presentation and returns to the decision point without removing completed branches. `Choose another future` is the completed-branch version of the same backtrack action. `Reset scenario and session` clears both the shared simulation and the in-memory decision tree. Compare highlights the preferred direction per metric; recommendation and Decision Score remain deterministic prototype analysis, followed by a `READY FOR HUMAN REVIEW` handoff.
- Compare and Optimize remain available after completion; changing a scenario after completion returns the operational state to baseline before another run.

## Responsive behavior

Desktop prioritizes the map and scenario controls side by side. The Operations header keeps brand, primary navigation, view mode, and runtime controls in separate layout zones; medium widths stack those zones by row and narrow widths wrap them into a single-column header. Narrow layouts stack the map, controls, ripple, comparison, and decision panels without horizontal page overflow or a horizontally scrolling header.

## Data policy

Operational KPIs derive from the deterministic engine. The normalized campus twin and source metadata in `src/data/campusTwin.ts` are a small representative synthetic data layer. Predictive signals in `src/engine/predictiveModel.ts` use the exported local neural model during simulation, with a deterministic rule-based preview and an explicit fallback if the artifact is unavailable. Model details disclose synthetic training, measured held-out metrics, local inference, uncertainty and limitations. Comparison and optimization candidates are controlled synthetic analysis in `src/data/mockData.ts` and are labelled as representative, not official data. No backend, authentication, persistence, external API, or hosted AI service is part of the MVP.

## Accessibility and motion

- Use semantic buttons, native labelled selects, keyboard-accessible building controls, visible focus, and text labels alongside color states.
- The Digital Twin network uses a bounded semantic node surface on desktop and a two-column node list on narrow screens; its structural relationships remain understandable without page-level overflow. Nodes are keyboard buttons with textual selected state and a detail region. The ripple rail remains keyboard navigable as a set of expandable buttons, and expanded evidence stays within the owning node.
- `prefers-reduced-motion` shortens or removes decorative transitions while retaining the same state changes and event order.
