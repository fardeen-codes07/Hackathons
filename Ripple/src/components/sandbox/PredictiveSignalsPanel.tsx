"use client"

import { useMemo } from "react"
import { predictScenario } from "@/engine/predictiveModel"
import { modelSourceLabel } from "@/engine/neuralInference"
import { formatNumber, formatPercent, titleCase } from "@/lib/format"
import type { PredictiveResult, PredictiveSignal, Scenario, SimulationPhase } from "@/types"

type PredictiveSignalsPanelProps = {
  scenario: Scenario
  phase?: SimulationPhase
  compact?: boolean
  result?: PredictiveResult
}

function formatSignalValue(signal: PredictiveSignal) {
  if (signal.unit === "students") return formatNumber(signal.projected)
  if (signal.unit === "conflicts") return formatNumber(signal.projected)
  return formatPercent(signal.projected)
}

function formatDelta(signal: PredictiveSignal) {
  if (signal.delta === 0) return "baseline"
  const sign = signal.delta > 0 ? "+" : ""
  return signal.unit === "students" || signal.unit === "conflicts" ? `${sign}${formatNumber(signal.delta)}` : `${sign}${signal.delta.toFixed(1)}%`
}

export function PredictiveSignalsPanel({ scenario, phase = "idle", compact = false, result: suppliedResult }: PredictiveSignalsPanelProps) {
  const result = useMemo(() => suppliedResult ?? predictScenario(scenario), [scenario, suppliedResult])
  const modelActive = phase === "running" || phase === "complete"
  const visibleSignals = modelActive ? result.neuralSignals : result.signals
  const heading = modelActive ? "Predicted ripple" : "Expected signals"
  const intro = modelActive ? "Local neural inference projects operational conditions; the causal engine then propagates the ripple." : "Preview the pressure this configuration is expected to create."
  const confidence = modelActive ? result.inference.confidence : result.confidence

  return <section className={`prediction-panel ${compact ? "prediction-panel-compact" : ""}`} data-testid="predicted-ripple" aria-labelledby="predicted-ripple-title">
    <div className="prediction-panel-header"><div><span className="eyebrow">PREDICTION / {modelActive ? "LOCAL MODEL" : "PREVIEW"}</span><h3 id="predicted-ripple-title">{heading}</h3><p>{intro}</p></div><span className={`analysis-tag ${result.inference.source === "local-neural-network" ? "prediction-model-live" : ""}`}>{modelActive ? modelSourceLabel(result.inference.source) : "RULE-BASED PREVIEW"}</span></div>
    <div className="prediction-signal-grid">
      {visibleSignals.map((signal) => <article className={`prediction-signal prediction-${signal.severity}`} key={signal.metric}>
        <div className="prediction-signal-top"><span className="metric-label">{signal.label}</span><span className="prediction-delta">{formatDelta(signal)}</span></div>
        <strong>{formatSignalValue(signal)}</strong>
        <span className="prediction-severity">{titleCase(signal.severity)} · {signal.horizon}</span>
      </article>)}
    </div>
    <div className="prediction-confidence"><div><span className="metric-label">{modelActive ? "Model confidence" : "Prototype confidence signal"}</span><strong>{confidence}%</strong></div><div className="prediction-meter" aria-label={`${modelActive ? "Model" : "Prototype"} confidence ${confidence}%`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={confidence}><span style={{ width: `${confidence}%` }} /></div><p><span>Primary uncertainty:</span> {result.primaryUncertainty}</p></div>
    {modelActive ? <details className="prediction-model-details"><summary>About this prediction <span>local forward pass</span></summary><div><p><strong>{result.inference.modelLabel}</strong> runs locally on this device over campus state and scenario features.</p><p>{result.inference.confidenceBasis}</p><p className="prediction-model-disclosure">Trained on deterministic synthetic campus data. This prototype is not a calibrated live forecast; production use requires validated historical data and human approval.</p>{result.inference.source === "deterministic-fallback" ? <p className="prediction-fallback" role="status">Predictive model unavailable — deterministic simulation active.</p> : null}</div></details> : null}
  </section>
}
