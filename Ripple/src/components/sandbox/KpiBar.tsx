import { formatNumber, formatPercent } from "@/lib/format"
import type { CampusMetrics } from "@/types"

type KpiBarProps = { metrics: CampusMetrics }

export function KpiBar({ metrics }: KpiBarProps) {
  const items = [
    { label: "Active students", value: formatNumber(metrics.activeStudents), unit: "LIVE", signal: "info", width: 68 },
    { label: "Room utilization", value: formatPercent(metrics.roomUtilization), unit: metrics.roomPressure.toUpperCase(), signal: metrics.roomPressure, width: metrics.roomUtilization },
    { label: "Faculty load", value: formatPercent(metrics.facultyLoad), unit: "ASSIGNED", signal: metrics.facultyLoad > 80 ? "warning" : "normal", width: metrics.facultyLoad },
    { label: "Transport load", value: formatPercent(metrics.transportLoad), unit: metrics.transportPressure.toUpperCase(), signal: metrics.transportPressure, width: metrics.transportLoad },
    { label: "Campus stability", value: String(metrics.campusStability), unit: "INDEX / 100", signal: metrics.campusStability < 60 ? "critical" : "normal", width: metrics.campusStability },
  ]

  return (
    <section className="kpi-bar" aria-label="Campus key performance indicators">
      {items.map((item) => <div className="kpi-item" key={item.label}>
        <div className="metric-label">{item.label}</div>
        <div className="kpi-value-row"><span className="kpi-value">{item.value}</span><span className="kpi-unit">{item.unit}</span></div>
        <div className={`kpi-signal ${item.signal}`} style={{ width: `${Math.max(8, Math.min(item.width, 100))}%` }} aria-hidden="true" />
      </div>)}
    </section>
  )
}
