import { campusTwin } from "@/data/campusTwin"
import { formatNumber } from "@/lib/format"

export function CampusSignalsPanel() {
  return <section className="campus-signals panel" data-testid="campus-signals" aria-labelledby="campus-signals-title">
    <div className="panel-header"><div className="panel-title"><span className="panel-code">06A</span><h2 id="campus-signals-title">Campus signals</h2></div><span className="status-label">PROTOTYPE SOURCES</span></div>
    <div className="signals-body"><div className="signals-intro"><div><span className="eyebrow">DIGITAL TWIN / INPUT LAYER</span><h3>What RIPPLE knows about this campus</h3><p>Normalized source shapes connect schedules, rooms, people, mobility and infrastructure before a scenario is tested.</p></div><span className="analysis-tag">SYNTHETIC PROTOTYPE SIGNALS</span></div><div className="signal-source-grid">{campusTwin.dataSources.map((source) => <article className="signal-source" key={source.id}><div className="signal-source-heading"><strong>{source.name}</strong><span className={source.status === "prototype-connected" ? "signal-status connected" : "signal-status"}>{source.status === "prototype-connected" ? "PROTOTYPE" : "CONNECTOR READY"}</span></div><div className="signal-source-count"><b>{formatNumber(source.recordCount)}</b><span>records</span></div><div className="signal-source-meta"><span>{source.coverage}</span><span>{source.freshness}</span></div></article>)}</div><p className="signals-disclosure">The local predictive layer is trained on deterministic synthetic campus signals. Production RIPPLE would replace them with validated campus data, calibration and historical backtesting.</p></div>
  </section>
}
