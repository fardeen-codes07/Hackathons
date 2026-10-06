"use client"

import type { ChangeEvent } from "react"
import { formatSimulationClock } from "@/lib/format"
import { PredictiveSignalsPanel } from "@/components/sandbox/PredictiveSignalsPanel"
import { focusScenarioConfiguration, scenarioSummary, validateScenario } from "@/lib/scenarioConfiguration"
import type { AffectedSystem, Building, Scenario, SimulationPhase } from "@/types"

type ScenarioPanelProps = {
  buildings: Building[]
  scenario: Scenario
  phase: SimulationPhase
  simulationTimeMinutes: number
  onSelectBuilding: (buildingId: string) => void
  onUpdateScenario: (patch: Partial<Scenario>) => void
  onSimulate: () => void
  guideStep?: number
}

const systems: { id: AffectedSystem; label: string }[] = [
  { id: "classes", label: "Classes" },
  { id: "rooms", label: "Rooms" },
  { id: "students", label: "Students" },
  { id: "faculty", label: "Faculty" },
  { id: "transport", label: "Transport" },
]

export function ScenarioPanel({ buildings, scenario, phase, simulationTimeMinutes, onSelectBuilding, onUpdateScenario, onSimulate, guideStep }: ScenarioPanelProps) {
  const configuration = focusScenarioConfiguration(scenario)
  const summary = scenarioSummary(scenario)
  const validation = validateScenario(scenario)
  const handleBuildingChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onSelectBuilding(event.target.value)
    onUpdateScenario({ buildingId: event.target.value })
  }
  const isRunning = phase === "running"
  const isComplete = phase === "complete"
  const actionLabel = isRunning ? "Simulation running" : isComplete ? "Reset to rerun" : phase === "paused" ? "Resume simulation" : "Simulate"
  const actionArrow = isRunning ? "· · ·" : isComplete ? "↺" : phase === "paused" ? "→" : "→"
  const affectedSystems = scenario.affectedSystems ?? systems.map((system) => system.id)
  const selectedTarget = scenario.targetLabel ?? buildings.find((building) => building.id === scenario.buildingId)?.name ?? scenario.buildingId
  const toggleSystem = (system: AffectedSystem) => {
    const next = affectedSystems.includes(system) ? affectedSystems.filter((item) => item !== system) : [...affectedSystems, system]
    onUpdateScenario({ affectedSystems: next.length > 0 ? next : affectedSystems })
  }

  return <div className="scenario-panel panel">
    <div className="panel-header"><div className="panel-title"><span className="panel-code">02</span><h2>Scenario controls</h2></div><span className="status-label">{isRunning ? "RUNNING" : isComplete ? "COMPLETE" : phase === "paused" ? "PAUSED" : formatSimulationClock(simulationTimeMinutes)}</span></div>
    <div className="panel-body">
      <p className="scenario-intro">Change one campus condition. The simulator will reveal the consequences in sequence.</p>
      <form className="scenario-form" noValidate onSubmit={(event) => { event.preventDefault(); onSimulate() }}>
        <div className="field-group"><span className="field-label">Scenario type</span><div className="scenario-readout">{configuration.typeLabel}</div></div>
        <div className={`field-group ${guideStep === 2 ? "guide-focus" : ""}`}>{configuration.targetMode === "building" ? <><label className="field-label" htmlFor="scenario-building">{configuration.targetFieldLabel}</label><select className="field-control" id="scenario-building" value={scenario.buildingId} onChange={handleBuildingChange} disabled={isRunning}><option value="tt-block">TT Block</option>{buildings.filter((building) => building.id !== "tt-block").map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select></> : <><span className="field-label">{configuration.targetFieldLabel}</span><div className="scenario-readout" data-testid="scenario-target-readout">{selectedTarget}</div></>}</div>
        <div className={`field-group ${guideStep === 3 ? "guide-focus" : ""}`}><label className="field-label" htmlFor="scenario-duration">{configuration.durationLabel}</label><select className="field-control" id="scenario-duration" aria-label="Duration" value={scenario.durationHours} onChange={(event) => onUpdateScenario({ durationHours: Number(event.target.value) })} disabled={isRunning}>{configuration.durationOptions.map((hours) => <option key={hours} value={hours}>{hours} hours</option>)}</select></div>
        <div className="field-group"><label className="field-label" htmlFor="scenario-start">Start time</label><select className="field-control" id="scenario-start" value={scenario.startTime} onChange={(event) => onUpdateScenario({ startTime: event.target.value })} disabled={isRunning}><option value="09:00">09:00</option><option value="10:00">10:00</option><option value="11:00">11:00</option><option value="12:00">12:00</option><option value="15:00">15:00</option></select></div>
        <div className="field-group"><span className="field-label">Condition</span><div className="condition-readout">{configuration.sourceEventLabel}</div></div>
        <details className="builder-details">
          <summary>Scenario builder <span>EDIT INPUTS</span></summary>
          <div className="builder-fields"><div className="builder-context"><span className="field-label">Configuration summary</span><strong>{summary.title}</strong><span>{summary.target} / {summary.window}</span></div>
            <div className="field-group"><label className="field-label" htmlFor="scenario-severity">{configuration.severityLabel} <output>{scenario.severity ?? 72}%</output></label><input id="scenario-severity" type="range" min="20" max="100" step="1" value={scenario.severity ?? 72} onChange={(event) => onUpdateScenario({ severity: Number(event.target.value) })} disabled={isRunning} /></div>
            <fieldset className="systems-field"><legend className="field-label">Affected systems</legend><div className="system-checkboxes">{systems.map((system) => <label key={system.id}><input type="checkbox" checked={affectedSystems.includes(system.id)} onChange={() => toggleSystem(system.id)} disabled={isRunning} /><span>{system.label}</span></label>)}</div></fieldset>
          </div>
        </details>
        {!validation.valid ? <div className="scenario-validation" role="alert">{validation.errors.map((error) => <span key={error}>{error}</span>)}</div> : null}
        <div className="scenario-summary"><div><span className="field-label">Scenario</span><strong>{summary.title}</strong><small>{summary.target} · {summary.window}</small></div><div><span className="field-label">Affected systems</span><strong>{summary.affectedSystems.join(" · ") || "None selected"}</strong></div></div>
        <PredictiveSignalsPanel scenario={scenario} phase={phase} compact />
        <button className={`primary-button scenario-submit ${guideStep === 4 ? "guide-focus" : ""}`} type="submit" disabled={isRunning || isComplete || !validation.valid} title={isComplete ? "Reset before running another simulation" : !validation.valid ? "Fix scenario inputs before simulating" : undefined}>{actionLabel}<span className="button-arrow">{actionArrow}</span></button>
      </form>
      <div className="scenario-footnote">CAUSAL ENGINE / DETERMINISTIC RULES · PREDICTIVE LAYER / LOCAL MLP<br />The output is representative synthetic data, not official university telemetry.</div>
    </div>
  </div>
}
