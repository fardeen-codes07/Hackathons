"use client"

import type { ScenarioPreset } from "@/types"
import { focusScenarioConfiguration } from "@/lib/scenarioConfiguration"

type ScenarioLibraryProps = {
  presets: ScenarioPreset[]
  activePresetId?: string
  onSelect: (preset: ScenarioPreset) => void
}

export function ScenarioLibrary({ presets, activePresetId, onSelect }: ScenarioLibraryProps) {
  return <section className="scenario-library panel section-anchor" id="scenario-library">
    <div className="panel-header">
      <div className="panel-title"><span className="panel-code">02A</span><h2>Scenario library</h2></div>
      <span className="status-label">SYNTHETIC PRESETS</span>
    </div>
    <div className="library-body">
      <div className="library-intro"><div><h3>Start with a known disruption</h3><p>Every preset uses the same deterministic model. Select one to load its inputs into the builder.</p></div><span className="analysis-tag">CAMPUS VERTICAL</span></div>
      <div className="scenario-card-grid">
        {presets.map((preset) => <button className={`scenario-card ${preset.id === activePresetId ? "selected" : ""}`} type="button" key={preset.id} aria-pressed={preset.id === activePresetId} onClick={() => onSelect(preset)}>
          <span className="scenario-card-category">{preset.category}</span>
          <span className="scenario-card-name">{preset.name}</span>
          <span className="scenario-card-meta">{preset.target} / {preset.durationHours}H / {focusScenarioConfiguration(preset.scenario).severityLabel.toLowerCase()} {preset.severity}%</span>
          <span className="scenario-card-description">{preset.description}</span>
          <span className="scenario-card-action">{preset.id === activePresetId ? "LOADED" : "LOAD SCENARIO"} <span>→</span></span>
        </button>)}
      </div>
    </div>
  </section>
}
