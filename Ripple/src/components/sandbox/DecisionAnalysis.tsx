"use client"

import { useMemo, useState } from "react"
import { decisionObjective } from "@/engine/decisionScore"
import { decisionCandidatesForScenario } from "@/engine/interventionRules"
import { buildDecisionBrief, decisionStatusFor } from "@/lib/operationalIntelligence"
import { formatCurrency, formatNumber } from "@/lib/format"
import { ImpactPanel } from "@/components/sandbox/ImpactPanel"
import type { CampusState } from "@/types"

export type AnalysisTab = "compare" | "optimize" | "why" | "brief"
type DecisionAnalysisProps = { state: CampusState; activeTab: AnalysisTab; onTabChange: (tab: AnalysisTab) => void; guideStep?: number }

function scrollToAnalysis() { document.getElementById("decision")?.scrollIntoView({ behavior: "smooth", block: "start" }) }
const comparisonMetrics = ["affectedStudents", "conflicts", "recoveryHours", "stability", "roomUtilization", "transportLoad", "operationalCost"] as const

function CopyBriefAction({ text }: { text: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "unavailable">("idle")

  const copyBrief = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable")
      await navigator.clipboard.writeText(text)
      setCopyState("copied")
    } catch {
      setCopyState("unavailable")
    }
  }

  return <div className="brief-actions"><button className="primary-button" type="button" onClick={copyBrief}>Copy brief <span className="button-arrow">→</span></button><button className="secondary-button" type="button" onClick={() => window.print()}>Print brief</button><span className="brief-copy-status" role="status" aria-live="polite">{copyState === "copied" ? "Brief copied to clipboard." : copyState === "unavailable" ? "Copy is unavailable in this browser." : ""}</span></div>
}

function DecisionMethodology() {
  return <details className="methodology"><summary>Decision methodology <span>VIEW WEIGHTS</span></summary><p>Each candidate is normalized against the operational objective. Higher is better; no weights are hidden.</p><div className="methodology-grid">{decisionObjective.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.weight}%</strong></div>)}</div></details>
}

function BriefAwaitingSimulation() {
  return <div className="decision-brief brief-empty-state" id="decision-brief" data-testid="decision-brief"><div className="brief-heading"><div><span className="eyebrow">RIPPLE / decision brief</span><h3>Run a scenario to generate the brief.</h3><p>The brief will show the modeled outcome, operational impact, and human-review handoff after simulation.</p></div><div className="brief-heading-meta"><span className="analysis-tag">AWAITING SIMULATION</span><strong className="brief-status">EXPLORING</strong></div></div><div className="empty-state"><span className="eyebrow">NO PROJECTED OUTCOME</span><strong>Complete the scenario run before reviewing a decision brief.</strong><span>No completed future is available. Your next simulation will populate this panel with fresh deterministic results.</span></div></div>
}

export function DecisionAnalysis({ state, activeTab, onTabChange, guideStep }: DecisionAnalysisProps) {
  const brief = useMemo(() => buildDecisionBrief(state, activeTab), [activeTab, state])
  const best = brief.recommendation
  const bestScore = brief.score
  const candidates = decisionCandidatesForScenario(state.scenario)
  const openTab = (tab: AnalysisTab) => { onTabChange(tab); scrollToAnalysis() }
  const impact = brief.impact
  const status = decisionStatusFor(state, activeTab)

  return <section className="decision-panel panel section-anchor" id="decision">
    <div className="panel-header"><div className="panel-title"><span className="panel-code">05</span><h2>Intervention studio</h2></div><div className="analysis-tabs" role="tablist" aria-label="Decision analysis views">
      {(["compare", "optimize", "why", "brief"] as AnalysisTab[]).map((tab) => <button className={`analysis-tab ${guideStep === (tab === "compare" ? 6 : tab === "optimize" ? 7 : tab === "why" ? 8 : 0) ? "guide-focus" : ""}`} role="tab" type="button" aria-selected={activeTab === tab} key={tab} onClick={() => onTabChange(tab)}>{tab === "brief" ? "Brief" : tab === "why" ? "Why?" : tab}</button>)}
    </div></div>
    <div className="analysis-content" role="tabpanel">
      {activeTab === "compare" ? <div>
        <div className="analysis-intro"><div><h3>Compare interventions</h3><p>Same disruption. Different intervention. The score is derived from the operational objective.</p></div><span className="analysis-tag">CONTROLLED SYNTHETIC ANALYSIS</span></div>
        <div className="intervention-table-wrap"><table className="comparison-table intervention-table"><thead><tr><th scope="col">Metric</th>{candidates.map((candidate) => <th className={candidate.id === best.id ? "recommended" : ""} scope="col" key={candidate.id}>{candidate.label}</th>)}</tr></thead><tbody>
          {comparisonMetrics.map((metric) => <tr key={metric}><td>{metric === "affectedStudents" ? "Students affected" : metric === "recoveryHours" ? "Recovery" : metric === "roomUtilization" ? "Room utilization" : metric === "transportLoad" ? "Transport load" : metric === "operationalCost" ? "Estimated cost" : metric === "stability" ? "Campus stability" : "Faculty conflicts"}</td>{candidates.map((candidate) => <td className={candidate.id === best.id ? "recommended" : ""} key={candidate.id}>{metric === "operationalCost" ? formatCurrency(candidate[metric]) : metric === "recoveryHours" ? `${candidate[metric]}h` : metric === "roomUtilization" || metric === "transportLoad" ? `${candidate[metric]}%` : formatNumber(candidate[metric])}</td>)}</tr>)}
        </tbody></table></div>
        <div className="compare-callout"><span className="eyebrow">Current recommendation</span><strong>{best.label}</strong><span>{best.primaryTradeoff}</span></div>
        <div className="analysis-actions"><button className="primary-button" type="button" onClick={() => openTab("optimize")}>Optimize decision <span className="button-arrow">→</span></button></div>
      </div> : null}

      {activeTab === "optimize" ? <div className="optimization-grid">
        <div><div className="analysis-intro"><div><h3>Recommended intervention</h3><p>RIPPLE ranks candidates against visible stability, capacity, mobility, recovery and conflict priorities.</p></div><span className="analysis-tag">WEIGHTED OBJECTIVE</span></div>
          <div className="recommendation-box">
            <div className="recommendation-signal-row"><span className="eyebrow">LOWEST-RISK PATH</span><strong className="recommendation-score">{bestScore.score}<small>SCORE</small></strong></div>
            <h3 className="recommendation-insight">Absorb the disruption upstream</h3>
            <p className="recommendation-copy">{best.mechanism ?? best.description}</p>
            <div className="recommendation-metrics"><div className="recommendation-metric"><div className="metric-label">Students protected</div><div className="recommendation-metric-value">{formatNumber(impact.studentsProtected)}</div></div><div className="recommendation-metric"><div className="metric-label">Conflicts avoided</div><div className="recommendation-metric-value">{impact.conflictsAvoided}</div></div><div className="recommendation-metric"><div className="metric-label">Recovery improved</div><div className="recommendation-metric-value">{impact.recoveryImprovementHours}h</div></div><div className="recommendation-metric"><div className="metric-label">Est. operational cost</div><div className="recommendation-metric-value">{formatCurrency(best.operationalCost)}</div></div></div>
            <div className="recommendation-intervention"><span className="eyebrow">RECOMMENDED INTERVENTION</span><h3 className="recommendation-title">{best.label}</h3><p>{best.description}</p></div>
          </div>
          <DecisionMethodology />
        </div>
        <div className="score-card"><div className="eyebrow">Decision score</div><div className="score-number">{bestScore.score}<span>/100</span></div><div className="score-bars">{Object.entries(bestScore.subscores).map(([label, value]) => <div className="score-row" key={label}><span className="score-row-label">{label}</span><span className="score-track"><span className="score-fill" style={{ width: `${value}%` }} /></span><span className="score-row-value">{value}</span></div>)}</div><div className="scenario-footnote" style={{ marginTop: 18 }}>Normalized from controlled candidate metrics. Higher is better.</div></div>
        <div className="tradeoff-columns"><div><span className="eyebrow">Benefits</span>{best.benefits.map((benefit) => <p className="tradeoff-positive" key={benefit}>+ {benefit}</p>)}</div><div><span className="eyebrow">Trade-offs</span>{best.tradeoffs.map((tradeoff) => <p className="tradeoff-warning" key={tradeoff}>+ {tradeoff}</p>)}</div></div>
        <div className="analysis-actions full"><button className="secondary-button" type="button" onClick={() => openTab("why")}>Open WHY <span className="button-arrow">→</span></button></div>
      </div> : null}

      {activeTab === "why" ? <div className="why-grid">
        <div><div className="analysis-intro"><div><h3>Why this decision?</h3><p>A transparent explanation of how {best.label.toLowerCase()} changes the system.</p></div><span className="analysis-tag">STRUCTURED EXPLANATION</span></div><div className="why-list">{[
          `${state.scenario.targetLabel ?? "The selected target"} closure displaces a concentrated schedule of classes.`,
          "Without intervention, compatible rooms approach or exceed capacity thresholds.",
          "That pressure creates secondary faculty conflicts and longer recovery.",
          "Student movement adds transport load across the campus network.",
          `${best.label} reduces the cascade before it reaches the final stability threshold.`,
        ].map((copy, index) => <div className="why-item" key={copy}><span className="why-number">0{index + 1}</span><p className="why-copy">{copy}</p></div>)}</div></div>
        <div className="tradeoff-box"><div className="eyebrow">Primary trade-off</div><p>{best.primaryTradeoff}.</p><div className="scenario-footnote" style={{ borderTopColor: "rgba(242, 182, 109, 0.2)" }}>CURRENT SCENARIO<br /><span style={{ color: "var(--text)" }}>{state.scenario.targetLabel ?? state.scenario.buildingId.toUpperCase()} — {state.scenario.durationHours}H / {state.scenario.severity ?? 72}% SEVERITY</span></div></div>
        <div className="analysis-actions full"><button className="secondary-button" type="button" onClick={() => openTab("brief")}>Open decision brief <span className="button-arrow">→</span></button></div>
      </div> : null}

      {activeTab === "brief" ? state.phase === "idle" ? <BriefAwaitingSimulation /> : <div className="decision-brief" id="decision-brief" data-testid="decision-brief"><div className="brief-heading"><div><span className="eyebrow">RIPPLE / decision brief</span><h3>Make the next move legible.</h3><p>A concise operational summary of the modeled scenario and its recommended response.</p></div><div className="brief-heading-meta"><span className="analysis-tag">HUMAN APPROVAL REQUIRED</span><strong className={`brief-status ${status === "READY FOR HUMAN REVIEW" ? "ready" : ""}`}>{status}</strong></div></div><div className="brief-grid"><div className="brief-primary"><span className="metric-label">Scenario</span><strong>{brief.scenarioLabel}</strong><span>{state.scenario.durationHours} hours / {brief.scenarioWindow}</span></div><div className="brief-primary brief-recommendation"><span className="metric-label">Recommended intervention</span><strong>{best.label}</strong><span>Decision score {bestScore.score} / 100</span></div></div><div className="brief-outcome"><div><span className="eyebrow">CURRENT BASELINE / DO NOTHING</span><strong>{formatNumber(brief.projection.baseline.affectedStudents)} affected · {brief.projection.baseline.stability} stability</strong><small>{brief.projection.baseline.conflicts} conflicts · {brief.projection.baseline.recoveryHours}h recovery</small></div><span className="brief-outcome-arrow">→</span><div className="projected"><span className="eyebrow">{brief.projection.selected ? "SELECTED FUTURE" : "PROJECTED OUTCOME"}</span><strong>{formatNumber(brief.projection.projected.affectedStudents)} affected · {brief.projection.projected.stability} stability</strong><small>{brief.projection.projected.conflicts} conflicts · {brief.projection.projected.recoveryHours}h recovery</small></div></div><div className="brief-why"><span className="eyebrow">WHY THIS DECISION</span><p>{brief.why}</p></div><ImpactPanel impact={brief.impact} /><div className="brief-review"><div><span className="eyebrow">PRIMARY TRADE-OFF</span><strong>{best.primaryTradeoff}</strong><small>Higher short-term scheduling complexity in exchange for lower system-wide disruption.</small></div><div><span className="eyebrow">PROTOTYPE ANALYSIS CONFIDENCE</span><strong>{brief.confidence}%</strong><small>Primary uncertainty: {brief.primaryUncertainty}</small></div><div><span className="eyebrow">DECISION STATUS</span><strong>{status}</strong><small>Final operational approval remains with the campus operator.</small></div></div><div className="brief-footer"><CopyBriefAction text={brief.text} /><button className="secondary-button" type="button" onClick={() => openTab("compare")}>View comparison <span className="button-arrow">→</span></button></div></div> : null}
    </div>
  </section>
}
