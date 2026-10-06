"use client"

import { useEffect } from "react"
import type { CampusState } from "@/types"
import type { AnalysisTab } from "@/components/sandbox/DecisionAnalysis"

type GuidedDemoProps = {
  open: boolean
  step: number
  state: CampusState
  analysisTab: AnalysisTab
  onStepChange: (step: number) => void
  onNavigate: (tab: AnalysisTab) => void
  onExit: () => void
}

const steps = [
  { title: "Let’s simulate a campus disruption", body: "We’ll close TT Block for six hours and observe how the disruption propagates through the campus.", action: "Begin demo" },
  { title: "Select the source", body: "Choose TT Block on the live campus map. This is the source decision the model will evaluate." },
  { title: "Set the duration", body: "Define how long the building remains unavailable. Keep the highlighted duration at six hours." },
  { title: "Run the future", body: "Use the live SIMULATE control. The guided demo never fakes this transition." },
  { title: "Watch the ripple", body: "The disruption does not stay inside TT Block. It propagates through rooms, students, faculty and transport." },
  { title: "Compare futures", body: "Open Compare to see the difference between allowing the cascade and intervening upstream." },
  { title: "Optimize the decision", body: "Open Optimize to evaluate the intervention against the weighted operational objective." },
  { title: "Open WHY", body: "Open WHY to read the causal explanation and the trade-off behind the recommendation." },
]

export function GuidedDemo({ open, step, state, analysisTab, onStepChange, onNavigate, onExit }: GuidedDemoProps) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onExit() }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onExit, open])

  if (!open) return null
  const isComplete = step > steps.length
  const current = steps[Math.min(step - 1, steps.length - 1)]
  const selected = state.selectedBuildingId === "tt-block"
  const durationReady = state.scenario.durationHours === 6
  const simulationReady = state.phase === "running" || state.phase === "complete"
  const stepReady = step === 2 ? selected : step === 3 ? durationReady : step === 4 ? simulationReady : step === 5 ? state.phase === "complete" : step === 6 ? analysisTab === "compare" : step === 7 ? analysisTab === "optimize" : step === 8 ? analysisTab === "why" : true
  const progress = `${String(Math.min(step, steps.length)).padStart(2, "0")} / ${String(steps.length).padStart(2, "0")}`

  return <aside className="guided-demo" data-testid="guided-demo" data-step={isComplete ? "complete" : step} role="dialog" aria-modal="false" aria-labelledby="guided-demo-title">
    <div className="guided-demo-top"><span className="eyebrow">Guided demo / {isComplete ? "complete" : progress}</span><button className="guided-exit" type="button" onClick={onExit}>Exit Guided Demo</button></div>
    {isComplete ? <div className="guided-complete"><span className="guided-complete-mark">✓</span><h2 id="guided-demo-title">You just ran your first ripple.</h2><p>The decision changed one condition. The model exposed the consequences and the intervention path.</p><div className="guided-completion-scenario"><strong>{state.scenario.targetLabel ?? "TT Block"}</strong><span>{state.scenario.durationHours}-hour closure</span></div><div className="guided-results"><div><span className="metric-label">Students affected</span><strong>{state.metrics.affectedStudents.toLocaleString("en-IN")}</strong></div><div><span className="metric-label">Faculty conflicts</span><strong>{state.metrics.conflicts}</strong></div><div><span className="metric-label">Recovery</span><strong>{state.metrics.recoveryHours}h</strong></div><div><span className="metric-label">Campus stability</span><strong>{state.metrics.campusStability}</strong></div></div><button className="primary-button" type="button" onClick={onExit}>Explore freely <span className="button-arrow">→</span></button></div> : <div className="guided-step"><div className="guided-step-index">{progress}</div><h2 id="guided-demo-title">{current.title}</h2><p>{current.body}</p><div className="guided-step-footer">{step === 1 ? <button className="primary-button" type="button" onClick={() => onStepChange(2)}>{current.action} <span className="button-arrow">→</span></button> : step === 5 ? <button className="primary-button" type="button" onClick={() => { onNavigate("compare"); onStepChange(6) }} disabled={!stepReady}>Open Compare <span className="button-arrow">→</span></button> : step === 6 ? <button className="primary-button" type="button" onClick={() => { onNavigate("optimize"); onStepChange(7) }} disabled={!stepReady}>Open Optimize <span className="button-arrow">→</span></button> : step === 7 ? <button className="primary-button" type="button" onClick={() => { onNavigate("why"); onStepChange(8) }} disabled={!stepReady}>Open WHY <span className="button-arrow">→</span></button> : step === 8 ? <button className="primary-button" type="button" onClick={() => onStepChange(9)} disabled={!stepReady}>Finish demo <span className="button-arrow">→</span></button> : <span className="guided-instruction">{step === 4 && state.phase === "running" ? "Simulation running. Watch the ripple activate." : stepReady ? "Use the highlighted control to continue." : "Complete the highlighted action to continue."}</span>}<span className="guided-state">{state.phase === "running" ? "RIPPLE RUNNING" : selected ? "TT BLOCK SELECTED" : state.phase.toUpperCase()}</span></div></div>}
  </aside>
}
