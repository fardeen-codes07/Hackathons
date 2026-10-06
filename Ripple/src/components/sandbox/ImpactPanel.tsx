import { formatCurrency, formatNumber } from "@/lib/format"
import type { OperationalImpact } from "@/lib/operationalIntelligence"

export function ImpactPanel({ impact }: { impact: OperationalImpact }) {
  const { baseline, projected } = impact
  const items = [
    ["PEOPLE / STUDENTS PROTECTED", formatNumber(impact.studentsProtected), "Protected before displacement spreads"],
    ["FACULTY / CONFLICTS AVOIDED", String(impact.conflictsAvoided), `${baseline.conflicts} → ${projected.conflicts} modeled conflicts`],
    ["TIME / RECOVERY IMPROVED", `${impact.recoveryImprovementHours}h`, `${baseline.recoveryHours}h → ${projected.recoveryHours}h`],
    ["STABILITY / MODELED DELTA", `${baseline.stability} → ${projected.stability}`, `${impact.stabilityDelta >= 0 ? "+" : ""}${impact.stabilityDelta} index points`],
    ["MOBILITY / TRANSPORT LOAD", `${baseline.transportLoad}% → ${projected.transportLoad}%`, "Connected route pressure"],
    ["COST / ESTIMATED", formatCurrency(projected.operationalCost), "Synthetic operational estimate"],
    ["COMPLEXITY / SCHEDULING", projected.operationalComplexity, "Short-term coordination load"],
  ]
  return <section className="impact-panel" data-testid="operational-impact" aria-labelledby="operational-impact-title"><div className="impact-panel-header"><div><span className="eyebrow">OPERATIONAL IMPACT</span><h3 id="operational-impact-title">Optimize the system, not one metric.</h3><p>Projected deltas are derived from the same deterministic intervention outcome used in Compare.</p></div><span className="analysis-tag">SYNTHETIC MODEL</span></div><div className="impact-context"><span><b>CURRENT BASELINE</b>{baseline.label}</span><span className="impact-context-arrow">→</span><span><b>PROJECTED FUTURE</b>{projected.label}</span></div><div className="impact-grid">{items.map(([label, value, note]) => <div className="impact-item" key={label}><span className="metric-label">{label}</span><strong>{value}</strong><small>{note}</small></div>)}</div></section>
}
