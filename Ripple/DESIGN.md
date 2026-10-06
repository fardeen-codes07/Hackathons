---
version: alpha
name: "RIPPLE"
description: "Decision intelligence for seeing how choices propagate through complex systems, starting with campus operations."
colors:
  primary: "#4FA3FF"
  background: "#0B0D0F"
  panel: "#12161A"
  panelElevated: "#171D22"
  border: "#252B31"
  primaryText: "#F1F3F5"
  secondaryText: "#8B949E"
  selected: "#4FA3FF"
  operational: "#5FD98A"
  warning: "#F2B66D"
  critical: "#F26B6B"
typography:
  sans:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, monospace"
rounded:
  DEFAULT: "0.45rem"
  sm: "0.25rem"
  md: "0.45rem"
  lg: "0.75rem"
spacing:
  section-gap: "1.25rem"
  page-max: "96rem"
components:
  button: {}
  panel: {}
  kpi: {}
  map: {}
  ripple-node: {}
---

# RIPPLE Design System

## Overview

### Creative North Star

RIPPLE is decision intelligence for complex systems, starting with a campus operations vertical. It is viewed through an architect's site plan: quiet, precise, and dense enough to feel operational without becoming noisy. The memorable signature is the live system map acting as the primary instrument, with a single blue selection line and amber/red propagation states doing the storytelling.

### Product context and register

- **Audience and primary job:** Operations-minded decision makers need to understand the consequences of a resource decision within 30 seconds.
- **Target market(s) and evidence:** Campus operations is the first vertical; the model is representative synthetic data and makes no official operational claim.
- **Locale(s) and language policy:** English UI, 24-hour-compatible time labels, no localization surface in the MVP.
- **Usage scene:** Laptop-first demo in a presentation setting, with a narrow stacked layout for quick mobile verification.
- **Register:** Product/control-room hybrid. `/` is a concise thesis page; `/sandbox` is the operational product surface.
- **Memorable signature:** System geometry is the hero, not a decorative illustration; the map, causal rail, and KPI values are all synchronized to one deterministic state.
- **Restraint:** No gradient atmosphere, chatbot, oversized marketing cards, or decorative data.
- **Anti-references:** Generic AI SaaS dashboards, neon cyberpunk interfaces, glassmorphism, and conventional school timetable software.
- **Token ownership/runtime mapping:** This file is the durable visual source; runtime CSS variables in `src/app/globals.css` mirror these tokens. Components consume semantic variables instead of raw colors.

## Colors

The near-black background and tonal panels create the feel of a dark control room. Borders do the majority of structural work. Blue is reserved for selection and action, green for healthy operation, amber for elevated pressure, and red for critical/offline states. Status is always paired with text, labels, or iconography so color is not the only signal.

## Typography

Inter carries navigation, explanations, and controls. IBM Plex Mono carries metrics, time, system status, deltas, and event timestamps. Uppercase is reserved for small system labels; headings remain sentence case or restrained title case so the interface reads like an instrument panel rather than a poster.

## Layout

The default `/sandbox` route is Focus mode: a calm, single-decision entry point with progressive disclosure. Focus presents scenario choice, three essential inputs, a real simulation, and a compact result before offering WHY, Compare, Explore Decisions, or Explore System. Decision is the branching-futures workspace over the same state: users select an intervention, see the compact `what I chose → how it works → what happens → outcome` rule path, simulate it, backtrack without erasing completed branches, compare selected futures, and read the causal explanation. Operations remains the dense 12-column system map with the campus map taking the dominant area and scenario controls alongside it. At narrow widths, each mode stacks intentionally and never creates page-level horizontal overflow.

View changes are presentation changes only. Focus, Decision, and Operations consume the same `CampusStateProvider`, deterministic engine, scenario, completed snapshots, and in-memory decision session. The mode query (`view=focus|decision|operations`) is safe to deep-link; Guided Demo (`guide=1`) explicitly opens Operations so its real controls remain visible.

## Elevation & Depth

Hierarchy is tonal: page background → panel → elevated panel. Static surfaces use borders instead of shadows. Focus rings and selected building strokes are the only high-contrast emphasis effects.

## Shapes

Panels use small radii and square-ish edges. Controls share the same restrained radius and 1px borders. Map buildings use architectural linework and clipped corners rather than rounded cards. Dividers are thin and low contrast.

## Components

### Foundational visual states

All interactive controls have hover, focus-visible, pressed, disabled, and busy states. Running simulation controls preserve their dimensions and communicate status inline. Selected and affected states use label text in addition to color.

### Buttons and actions

Primary actions use blue fill with dark text only where contrast remains strong; secondary actions use transparent surfaces and borders. Reset is neutral in the normal toolbar and never visually competes with Simulate. Disabled controls do not receive pointer interaction.

### Navigation and data display

Focus navigation is action-led: “What decision do you want to test?” → configure → Simulate → result → Explore Decisions / WHY / Compare / Explore system. Decision navigation is future-led: one scenario → choose an intervention → explore a projected future → backtrack → revisit a sibling path → compare → read WHY → human review. Operations navigation is anchor-based so the full decision can be followed quickly. The scenario library and What If panel make inputs legible before a run. KPI values use mono type and fixed-width labels. Comparison uses a semantic table on desktop and focused metric rows in Focus. The intervention studio owns Compare, Optimize, WHY, and the decision brief; Optimize leads with the lowest-risk insight, then mechanism, evidence, intervention name, score, and the operator handoff.

The Operations header is a four-zone grid: brand, primary section navigation, view mode, and runtime controls. At medium widths the zones move onto explicit rows; at narrow widths the header becomes a stacked, wrapped layout with no horizontal navigation scroller.

The Decision surface is a Future Lab, not a dashboard of candidate cards. Each intervention card exposes its mechanism and a small projected outcome preview before exploration. A completed branch is retained as history, a selected branch is the current projected state, and “Choose another future” makes sibling exploration explicit. The compare table highlights the preferred direction per metric rather than treating every number as “higher is better”.

### Forms and overlays

Scenario controls use labelled native selects because the MVP accepts platform-owned popup geometry. The form uses `noValidate`; controls are constrained to supported synthetic values. Building detail is contextual rather than modal.

### Iconography

The MVP uses compact text markers, geometric SVG marks, and simple CSS indicators so iconography stays subordinate to the map. Icon-only actions are avoided unless they have a visible tooltip and accessible label.

### Motion

Motion communicates propagation: 150–300ms ripple activation, 300–500ms panel/map transitions, and no continuous loops. Reduced motion disables transitions while retaining the same state and event order. Reset invalidates every outstanding timer.

### Decision intelligence flow

The decision story follows `Scenario → Prediction → Ripple → Intervention → Future → Compare → Recommendation → Human Review`. The ripple rail is an explorable causal instrument: each node can reveal a short “what changed / why” explanation derived from current metrics. Recommendation copy leads with the mechanism and evidence, then shows the prototype score and trade-off. “Ready for human review” is an explicit handoff; RIPPLE never implies autonomous approval.

The Operations layer is the handoff from decision to understanding. Its Digital Twin uses the same campus records to show structure—what a building hosts, which rooms absorb demand, how student movement loads transport, and how transport pressures stability—while the Ripple rail shows when those consequences activate. The Decision Brief is the durable summary of that path: current baseline → projected future → operational impact → trade-off → human review. The selected future is always labelled separately from the campus baseline.

### Content and data visualization

Copy is direct and operational: “Close building”, “Run simulation”, “Compare futures”, “Back to decision”, and “Why this decision?”. Scenario presets, impact, trust, and local history are supporting surfaces rather than competing dashboards. Synthetic analysis is visibly labelled. Numbers use comma grouping, percent suffixes, and mono type.

Operational impact is a compact seven-dimension readout, not a second KPI dashboard. People, faculty, time, stability, mobility, cost, and complexity are derived from the selected deterministic candidate and its Do Nothing baseline. The Decision Brief can be copied as plain text or printed from the browser; no export chrome or document workflow is introduced.

## Do's and Don'ts

- **Do:** Let the campus map and causal chain carry the product story.
- **Do:** Keep every displayed operational value connected to deterministic state or clearly labelled controlled analysis; Decision candidate outcomes are resolved through explicit deterministic intervention rules and are intentionally representative, not forecasts.
- **Don't:** Add a chatbot, purple gradient, fake AI claim, or random live-looking number.
- **Don't:** Hide core behavior inside a modal or rely on color alone to communicate status.

## Data and prediction layers

RIPPLE presents three distinct layers in sequence: normalized campus-twin inputs, a local neural predictive layer, and deterministic intervention outcomes. Campus signals are compact source metadata and linked entity records, not an administrative CRUD surface. Before a run, predictive cards expose the deterministic rule preview. During and after a run, the same cards consume the exported local MLP's forward-pass outputs, while the deterministic scenario engine remains the authority for causal snapshots and benchmark values. Model details disclose synthetic training, held-out evaluation, local inference, uncertainty and the fallback path. Prediction never chooses the recommendation; decision analysis remains the owner of intervention ranking and explainability.

The visual signature for this layer is a quiet source grid and a five-signal forecast strip. Keep both subordinate to the scenario and ripple system. Use the labels “Prototype campus signals”, “Deterministic forecast”, and “Synthetic prototype signals” wherever a reader could otherwise infer live telemetry.

## Scenario builder

The builder is action-oriented: the selected scenario type determines which target field appears. Building closure owns a building select; transport, weather, event, and infrastructure scenarios use their target readout and expose only relevant duration/severity controls. Every summary, target, time window, affected-system list, and expected signal is derived from the current `Scenario` object.

## Focus disclosure rules

- Keep the primary question, “What decision do you want to test?”, and primary action above the fold.
- Show scenario-appropriate target, duration, and severity/load in the essential configuration row; building closures expose a building selector, while transport, weather, event, and network scenarios expose their existing target as a readout. Keep start time, exact severity when it is not already primary, and affected systems in native `details` disclosure.
- Results lead with live affected students, recovery, the first bottleneck, and the deterministic recommendation. Detailed system topology remains one deliberate action away.
- Focus WHY is a causal explanation, not a chatbot. Focus Compare shows only the decision-changing metrics; “View full comparison” opens the existing Operations analysis.
- Synthetic data disclosure stays visible on every Focus and Decision surface.
