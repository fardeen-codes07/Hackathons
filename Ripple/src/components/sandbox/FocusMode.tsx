"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { calculateDecisionScore } from "@/engine/decisionScore"
import { decisionCandidatesForScenario } from "@/engine/interventionRules"
import { scenarioPresets, syntheticDataDisclosure } from "@/data/mockData"
import { formatNumber, formatPercent } from "@/lib/format"
import { focusScenarioConfiguration, scenarioSummary, validateScenario } from "@/lib/scenarioConfiguration"
import { PredictiveSignalsPanel } from "@/components/sandbox/PredictiveSignalsPanel"
import { NeuralInferenceStage } from "@/components/sandbox/NeuralInferenceStage"
import { predictScenario } from "@/engine/predictiveModel"
import type { AffectedSystem, Building, CampusState, Scenario } from "@/types"
import { ViewSwitcher, type SandboxView } from "@/components/sandbox/ViewSwitcher"

type FocusModeProps = {
  state: CampusState
  buildings: Building[]
  onSelectBuilding: (buildingId: string) => void
  onUpdateScenario: (patch: Partial<Scenario>) => void
  onSimulate: () => void
  onReset: () => void
  onChooseScenario: (scenario: Scenario) => void
  onOpenOperations: (tab?: "compare" | "optimize" | "why" | "brief") => void
  onOpenDecision: () => void
}

type FocusPanel = "result" | "why" | "compare"

const focusPresets = [
  { title: "Building closure", description: "See what happens when a campus building becomes unavailable.", preset: scenarioPresets.find((preset) => preset.id === "tt-block-closure")! },
  { title: "Science Court closure", description: "Test how specialist-room capacity changes the compatible-room cascade.", preset: scenarioPresets.find((preset) => preset.id === "science-court-closure")! },
  { title: "Transport disruption", description: "See how reduced transport capacity propagates through campus operations.", preset: scenarioPresets.find((preset) => preset.id === "transport-reduction")! },
  { title: "Weather event", description: "Explore a campus-wide movement and recovery disruption.", preset: scenarioPresets.find((preset) => preset.id === "heavy-rain")! },
  { title: "Major campus event", description: "Model a demand surge around a shared campus gathering.", preset: scenarioPresets.find((preset) => preset.id === "major-campus-event")! },
  { title: "Infrastructure disruption", description: "Trace an interruption in shared campus infrastructure.", preset: scenarioPresets.find((preset) => preset.id === "network-disruption")! },
  { title: "Power / grid disruption", description: "Trace how constrained power availability changes facility capacity and movement.", preset: scenarioPresets.find((preset) => preset.id === "power-grid-disruption")! },
  { title: "Examination period surge", description: "See how concentrated assessment demand compounds room and schedule pressure.", preset: scenarioPresets.find((preset) => preset.id === "examination-period-surge")! },
]

const affectedSystems: { id: AffectedSystem; label: string }[] = [
  { id: "classes", label: "Classes" },
  { id: "rooms", label: "Rooms" },
  { id: "students", label: "Students" },
  { id: "faculty", label: "Faculty" },
  { id: "transport", label: "Transport" },
]

function bestIntervention(scenario: Scenario) {
  return decisionCandidatesForScenario(scenario).reduce((winner, candidate) => calculateDecisionScore(candidate).score > calculateDecisionScore(winner).score ? candidate : winner)
}

function baselineIntervention(scenario: Scenario) {
  const candidates = decisionCandidatesForScenario(scenario)
  return candidates.find((candidate) => candidate.id === "do-nothing") ?? candidates[0]
}

function FocusHeader({ activeView }: { activeView: SandboxView }) {
  return <header className="focus-header">
    <Link href="/" aria-label="RIPPLE home" className="brand-lockup"><span className="brand-mark" /><span className="brand-name">RIPPLE</span></Link>
    <ViewSwitcher activeView={activeView} />
    <div className="focus-header-actions"><Link className="focus-guided-link" href="/sandbox?guide=1">Guided demo <span>→</span></Link><span className="focus-data-label">LOCAL / SYNTHETIC</span></div>
  </header>
}

function FocusPicker({ onChoose }: { onChoose: (scenario: Scenario) => void }) {
  return <section className="focus-picker" data-testid="focus-picker" aria-labelledby="focus-picker-title">
    <div className="focus-eyebrow">RIPPLE / FOCUS MODE</div>
    <h1 id="focus-picker-title">What decision do you want to test?</h1>
    <p className="focus-lede">Choose a real disruption. RIPPLE will show what moves, what breaks, and where to intervene.</p>
    <div className="focus-option-grid">
      {focusPresets.map((option) => <button className="focus-option" type="button" key={option.preset.id} onClick={() => onChoose(option.preset.scenario)}>
        <span className="focus-option-kicker">{option.preset.category}</span>
        <strong>{option.title}</strong>
        <span>{option.description}</span>
        <span className="focus-option-arrow">Test scenario <b>→</b></span>
      </button>)}
      <button className="focus-option focus-option-create" type="button" onClick={() => onChoose(scenarioPresets[0].scenario)}>
        <span className="focus-option-kicker">CONFIGURE</span>
        <strong>Create scenario</strong>
        <span>Start with a known disruption and shape the inputs before running it.</span>
        <span className="focus-option-arrow">Open inputs <b>→</b></span>
      </button>
    </div>
  </section>
}

function FocusConfiguration({ state, buildings, onSelectBuilding, onUpdateScenario, onSimulate, onOpenOperations, onReset }: Omit<FocusModeProps, "onChooseScenario" | "onOpenDecision">) {
  const configuration = focusScenarioConfiguration(state.scenario)
  const summary = scenarioSummary(state.scenario)
  const validation = validateScenario(state.scenario)
  const severity = state.scenario.severity ?? 72
  const severityBand = severity >= 85 ? "high" : severity >= 70 ? "normal" : "low"
  const systems = state.scenario.affectedSystems ?? affectedSystems.map((system) => system.id)
  const toggleSystem = (system: AffectedSystem) => {
    const next = systems.includes(system) ? systems.filter((item) => item !== system) : [...systems, system]
    onUpdateScenario({ affectedSystems: next.length > 0 ? next : systems })
  }

  return <section className="focus-config" data-testid="focus-config" aria-labelledby="focus-config-title">
    <div className="focus-config-top"><button className="focus-back" type="button" onClick={onReset}>← Choose another scenario</button><span className="focus-eyebrow">CONFIGURE / {configuration.heading}</span></div>
    <h1 id="focus-config-title">What do you want to change?</h1>
    <p className="focus-lede">Keep the inputs that matter visible. The detailed builder stays available when you need it.</p>
    <div className="focus-form">
      {configuration.targetMode === "building" ? <label><span>{configuration.targetFieldLabel}</span><select aria-label="Focus building" value={state.scenario.buildingId} onChange={(event) => onSelectBuilding(event.target.value)} disabled={state.phase === "running"}><option value="tt-block">TT Block</option>{buildings.filter((building) => building.id !== "tt-block").map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select></label> : <label><span>{configuration.targetFieldLabel}</span><output className="focus-readout" aria-label={`Focus ${configuration.targetFieldLabel.toLowerCase()}`}>{state.scenario.targetLabel ?? "Selected target"}</output></label>}
      <label><span>{configuration.durationLabel}</span><select aria-label="Focus duration" value={state.scenario.durationHours} onChange={(event) => onUpdateScenario({ durationHours: Number(event.target.value) })} disabled={state.phase === "running"}>{configuration.durationOptions.map((hours) => <option key={hours} value={hours}>{hours} hours</option>)}</select></label>
      {configuration.severityMode === "band" ? <label><span>{configuration.severityLabel}</span><select aria-label="Focus severity" value={severityBand} onChange={(event) => onUpdateScenario({ severity: event.target.value === "high" ? 92 : event.target.value === "normal" ? 72 : 55 })} disabled={state.phase === "running"}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></label> : <label className="focus-range"><span>{configuration.severityLabel}<output>{severity}%</output></span><input aria-label={`Focus ${configuration.severityLabel.toLowerCase()}`} type="range" min="20" max="100" step="1" value={severity} onChange={(event) => onUpdateScenario({ severity: Number(event.target.value) })} disabled={state.phase === "running"} /></label>}
    </div>
    <details className="focus-advanced"><summary>Advanced options <span>EDIT INPUTS</span></summary><div className="focus-advanced-grid">
      <label><span>Start time</span><select aria-label="Focus start time" value={state.scenario.startTime} onChange={(event) => onUpdateScenario({ startTime: event.target.value })} disabled={state.phase === "running"}><option value="09:00">09:00</option><option value="10:00">10:00</option><option value="11:00">11:00</option><option value="12:00">12:00</option><option value="15:00">15:00</option></select></label>
      {configuration.advancedExactSeverity ? <label className="focus-range"><span>Exact severity <output>{severity}%</output></span><input aria-label="Focus exact severity" type="range" min="20" max="100" step="1" value={severity} onChange={(event) => onUpdateScenario({ severity: Number(event.target.value) })} disabled={state.phase === "running"} /></label> : null}
      <fieldset><legend>Affected systems</legend>{affectedSystems.map((system) => <label key={system.id}><input type="checkbox" checked={systems.includes(system.id)} onChange={() => toggleSystem(system.id)} disabled={state.phase === "running"} /><span>{system.label}</span></label>)}</fieldset>
    </div></details>
    <div className="focus-scenario-summary"><div><span className="focus-eyebrow">SCENARIO SUMMARY</span><strong>{summary.title}</strong><span>{summary.target} · {summary.window}</span></div><div><span className="focus-eyebrow">AFFECTED SYSTEMS</span><span>{summary.affectedSystems.join(" · ")}</span></div></div>
    <PredictiveSignalsPanel scenario={state.scenario} phase={state.phase} compact />
    {!validation.valid ? <div className="scenario-validation" role="alert">{validation.errors.map((error) => <span key={error}>{error}</span>)}</div> : null}
    <div className="focus-submit-row"><div><span className="focus-eyebrow">READY TO TEST</span><p>{summary.target} / {state.scenario.durationHours}h / {severity}% severity</p></div><button className="focus-primary-button" type="button" onClick={onSimulate} disabled={state.phase === "running" || state.phase === "complete" || !validation.valid} title={!validation.valid ? "Fix scenario inputs before simulating" : undefined}>Simulate <span>→</span></button></div>
    <button className="focus-text-link" type="button" onClick={() => onOpenOperations()}>Open full Operations controls →</button>
  </section>
}

function FocusSimulation({ state }: { state: CampusState }) {
  const configuration = focusScenarioConfiguration(state.scenario)
  const active = state.snapshots[state.activeSnapshotIndex]?.activeNodeIndex ?? -1
  const sequence = configuration.causalSequence
  const prediction = useMemo(() => predictScenario(state.scenario), [state.scenario])
  return <section className="focus-simulation" data-testid="focus-simulation" aria-live="polite" aria-labelledby="focus-simulation-title">
    <div className="focus-eyebrow">RIPPLE / SIMULATING</div><h1 id="focus-simulation-title">{state.scenario.targetLabel ?? "TT Block"} · {state.scenario.durationHours} hours</h1><p>The predictive layer is projecting operational conditions before the deterministic ripple completes.</p><NeuralInferenceStage state={state} inference={prediction.inference} /><div className="focus-progress"><span style={{ width: `${Math.max(8, ((active + 1) / 7) * 100)}%` }} /></div><div className="focus-progress-label"><span>Simulation running</span><span>{active < 0 ? "Starting" : `${Math.min(active + 1, 7)} of 7 consequences`}</span></div><div className="focus-sequence">{sequence.map((item, index) => <span className={index <= active ? "active" : ""} key={item}>{item}</span>)}</div><PredictiveSignalsPanel scenario={state.scenario} phase="running" compact result={prediction} />
  </section>
}

function FocusResult({ state, panel, setPanel, onOpenOperations, onOpenDecision, onReset }: { state: CampusState; panel: FocusPanel; setPanel: (panel: FocusPanel) => void; onOpenOperations: FocusModeProps["onOpenOperations"]; onOpenDecision: FocusModeProps["onOpenDecision"]; onReset: FocusModeProps["onReset"] }) {
  const best = bestIntervention(state.scenario)
  const nothing = baselineIntervention(state.scenario)
  const score = calculateDecisionScore(best).score
  const bottleneck = state.metrics.roomPressure === "critical" || state.metrics.roomPressure === "high" || state.metrics.roomUtilization >= 90 ? { label: "Room pressure", value: formatPercent(state.metrics.roomUtilization) } : { label: "Transport load", value: formatPercent(state.metrics.transportLoad) }
  const configuration = focusScenarioConfiguration(state.scenario)
  const target = state.scenario.targetLabel ?? "Selected target"

  if (panel === "why") return <section className="focus-explanation" data-testid="focus-why" aria-labelledby="focus-why-title"><button className="focus-back" type="button" onClick={() => setPanel("result")}>← Back to result</button><div className="focus-eyebrow">INVESTIGATE / WHY THIS DECISION</div><h1 id="focus-why-title">The cascade starts upstream.</h1><p className="focus-lede">RIPPLE follows the disruption from its source to the system-wide consequence.</p><div className="focus-causal-chain">{[`${target} ${configuration.sourceAction}`, "Classes are displaced", "Room pressure rises", "Students redistribute", "Faculty conflicts increase", "Transport pressure rises", "Campus stability falls"].map((item, index) => <div key={item}><span>0{index + 1}</span><strong>{item}</strong>{index < 6 ? <b>↓</b> : null}</div>)}</div><div className="focus-interrupt"><span className="focus-eyebrow">INTERVENTION / CASCADE ABSORBED UPSTREAM</span><strong>{best.label}</strong><p>Absorbs room pressure before it propagates downstream.</p></div><div className="focus-action-row"><button className="focus-primary-button" type="button" onClick={() => onOpenOperations("why")}>View detailed WHY <span>→</span></button><button className="focus-secondary-button" type="button" onClick={() => setPanel("result")}>Back to result</button></div></section>

  if (panel === "compare") return <section className="focus-compare" data-testid="focus-compare" aria-labelledby="focus-compare-title"><button className="focus-back" type="button" onClick={() => setPanel("result")}>← Back to result</button><div className="focus-eyebrow">DECIDE / COMPARE FUTURES</div><h1 id="focus-compare-title">Same disruption. Different outcome.</h1><p className="focus-lede">Start with the four differences that change the decision.</p><div className="focus-compare-grid">{decisionCandidatesForScenario(state.scenario).filter((candidate) => candidate.id === "do-nothing" || candidate.id === "dynamic-reallocation").map((candidate) => <article className={candidate.id === "dynamic-reallocation" ? "focus-compare-card recommended" : "focus-compare-card"} key={candidate.id}><span className="focus-option-kicker">{candidate.id === "dynamic-reallocation" ? "RECOMMENDED" : "BASELINE"}</span><h2>{candidate.label}</h2><div><span>Students affected</span><strong>{formatNumber(candidate.affectedStudents)}</strong></div><div><span>Faculty conflicts</span><strong>{candidate.conflicts}</strong></div><div><span>Recovery</span><strong>{candidate.recoveryHours}h</strong></div><div><span>Stability</span><strong>{candidate.stability}</strong></div></article>)}</div><div className="focus-action-row"><button className="focus-primary-button" type="button" onClick={() => onOpenOperations("compare")}>View full comparison <span>→</span></button><button className="focus-secondary-button" type="button" onClick={() => setPanel("result")}>Back to result</button></div></section>

  return <section className="focus-result" data-testid="focus-result" aria-labelledby="focus-result-title"><div className="focus-result-heading"><div><div className="focus-eyebrow">RESULT / {configuration.heading}</div><h1 id="focus-result-title">{state.scenario.targetLabel ?? "TT Block"} · {state.scenario.durationHours} hours</h1><span className="focus-impact-label">{state.metrics.affectedStudents >= 4000 ? "HIGH IMPACT" : "ELEVATED IMPACT"}</span></div><span className="focus-complete-status">● SIMULATION COMPLETE</span></div><div className="focus-result-primary"><div><strong>{formatNumber(state.metrics.affectedStudents)}</strong><span>students affected</span></div><div><strong>{state.metrics.recoveryHours}h</strong><span>estimated recovery</span></div><div><strong>{state.metrics.campusStability}</strong><span>campus stability</span></div></div><div className="focus-bottleneck"><span className="focus-eyebrow">FIRST BOTTLENECK</span><strong>{bottleneck.label}</strong><span>{bottleneck.value}</span><p>That pressure propagates into student movement, faculty conflicts and transport demand.</p></div><div className="focus-recommendation"><div><span className="focus-eyebrow">RIPPLE RECOMMENDS</span><h2>{best.label}</h2><p>{best.primaryTradeoff}</p></div><strong className="focus-score">{score}<small>/ 100</small></strong><div className="focus-recommendation-stats"><span><b>{formatNumber(nothing.affectedStudents - best.affectedStudents)}</b> students saved</span><span><b>{nothing.conflicts - best.conflicts}</b> conflicts avoided</span><span><b>{nothing.recoveryHours - best.recoveryHours}h</b> recovery gain</span></div></div><div className="focus-action-row"><button className="focus-primary-button" type="button" onClick={onOpenDecision}>Explore decisions <span>→</span></button><button className="focus-secondary-button" type="button" onClick={() => setPanel("why")}>Why this decision <span>→</span></button><button className="focus-secondary-button" type="button" onClick={() => setPanel("compare")}>Compare</button><button className="focus-secondary-button" type="button" onClick={() => onOpenOperations()}>Explore system <span>→</span></button></div><button className="focus-text-link" type="button" onClick={onReset}>Try another scenario</button></section>
}

export function FocusMode({ state, buildings, onSelectBuilding, onUpdateScenario, onSimulate, onReset, onChooseScenario, onOpenOperations, onOpenDecision }: FocusModeProps) {
  const [focusStage, setFocusStage] = useState<"choose" | "configure">("choose")
  const [panel, setPanel] = useState<FocusPanel>("result")
  const handleChoose = (scenario: Scenario) => { onChooseScenario(scenario); setFocusStage("configure"); setPanel("result") }
  const resetFocus = () => { onReset(); setFocusStage("choose"); setPanel("result") }
  const content = state.phase === "running" ? <FocusSimulation state={state} /> : state.phase === "complete" ? <FocusResult state={state} panel={panel} setPanel={setPanel} onOpenOperations={onOpenOperations} onOpenDecision={onOpenDecision} onReset={resetFocus} /> : focusStage === "configure" ? <FocusConfiguration state={state} buildings={buildings} onSelectBuilding={onSelectBuilding} onUpdateScenario={onUpdateScenario} onSimulate={onSimulate} onOpenOperations={onOpenOperations} onReset={resetFocus} /> : <FocusPicker onChoose={handleChoose} />
  return <main className="focus-shell" data-testid="focus-mode"><FocusHeader activeView="focus" /><div className="focus-main">{state.phase === "running" ? <button className="focus-reset-action" type="button" onClick={resetFocus}>Reset simulation</button> : null}{content}</div><p className="focus-footer-disclosure">{syntheticDataDisclosure}</p></main>
}
