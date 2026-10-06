"use client"

import { useState } from "react"
import { baselineMetrics } from "@/data/campusData"
import { formatNumber, formatPercent, titleCase } from "@/lib/format"
import { focusScenarioConfiguration } from "@/lib/scenarioConfiguration"
import type { CampusMetrics, Building, Scenario, SimulationEvent } from "@/types"

type RippleRailProps = { metrics: CampusMetrics; buildings: Building[]; activeNodeIndex: number; events: SimulationEvent[]; scenario?: Scenario }

type RippleNode = {
  id: string
  title: string
  value: (metrics: CampusMetrics, buildings: Building[]) => string
  severity: (metrics: CampusMetrics, buildings: Building[]) => string
  detail: (metrics: CampusMetrics, buildings: Building[], scenario?: Scenario) => string
}

const nodes: RippleNode[] = [
  { id: "building-failure", title: "Building Failure", value: (metrics, buildings) => { void metrics; return buildings.find((building) => building.status === "offline" || building.status === "affected" || building.status === "selected")?.status.toUpperCase() ?? "ONLINE" }, severity: () => "critical", detail: (metrics, buildings, scenario) => { void metrics; return `${scenario?.targetLabel ?? buildings.find((building) => building.status === "offline" || building.status === "selected")?.name ?? "Selected target"} is the source condition for this scenario window.` } },
  { id: "class-displacement", title: "Class Displacement", value: (metrics) => formatNumber(metrics.affectedStudents), severity: (metrics) => metrics.affectedStudents > 0 ? "warning" : "normal", detail: (metrics) => `${formatNumber(metrics.affectedStudents)} students are exposed to released or constrained classes in the current projection.` },
  { id: "room-pressure", title: "Room Pressure", value: (metrics) => formatPercent(metrics.roomUtilization), severity: (metrics) => metrics.roomPressure, detail: (metrics) => `Room utilization moves from ${formatPercent(baselineMetrics.roomUtilization)} baseline to ${formatPercent(metrics.roomUtilization)} as compatible capacity absorbs displaced demand.` },
  { id: "student-movement", title: "Student Movement", value: (metrics) => metrics.affectedStudents > 0 ? `${formatNumber(Math.round(metrics.affectedStudents * 0.82))}` : "0", severity: (metrics) => metrics.affectedStudents > 0 ? "elevated" : "normal", detail: (metrics) => `${formatNumber(Math.round(metrics.affectedStudents * 0.82))} students are represented as moving between connected campus areas.` },
  { id: "faculty-conflict", title: "Faculty Conflict", value: (metrics) => String(metrics.conflicts), severity: (metrics) => metrics.conflicts > 0 ? "high" : "normal", detail: (metrics) => `${metrics.conflicts} faculty conflicts are the modeled result of timetable and resource overlap after displacement.` },
  { id: "transport-load", title: "Transport Load", value: (metrics) => formatPercent(metrics.transportLoad), severity: (metrics) => metrics.transportPressure, detail: (metrics) => `Transport load changes from ${formatPercent(baselineMetrics.transportLoad)} baseline to ${formatPercent(metrics.transportLoad)} as student movement crosses campus routes.` },
  { id: "campus-stability", title: "Campus Stability", value: (metrics) => String(metrics.campusStability), severity: (metrics) => metrics.campusStability < 60 ? "critical" : "normal", detail: (metrics) => { void metrics; return "Stability is the downstream index after room pressure, conflicts, and transport load are evaluated." } },
]

const scenarioNodeTitles: Record<string, Partial<Record<string, string>>> = {
  "power-disruption": { "building-failure": "Power Constraint", "class-displacement": "Facility Capacity", "room-pressure": "Room Pressure", "student-movement": "Student Movement", "faculty-conflict": "Operational Conflict", "transport-load": "Transport Load", "campus-stability": "Campus Stability" },
  "examination-surge": { "building-failure": "Exam Demand", "class-displacement": "Exam Scheduling", "room-pressure": "Room Pressure", "student-movement": "Student Movement", "faculty-conflict": "Scheduling Pressure", "transport-load": "Transport Load", "campus-stability": "Campus Stability" },
}

function scenarioNodeDetail(id: string, metrics: CampusMetrics, scenario?: Scenario) {
  if (scenario?.kind === "power-disruption") {
    const details: Record<string, string> = {
      "building-failure": `${scenario.targetLabel ?? "The central power loop"} is operating under constrained availability for the ${scenario.durationHours}h window.`,
      "class-displacement": `${formatNumber(metrics.affectedStudents)} students are exposed as power-dependent classes are released or moved.`,
      "room-pressure": `Powered room utilization moves to ${formatPercent(metrics.roomUtilization)} as compatible facilities absorb displaced demand.`,
      "student-movement": `${formatNumber(Math.round(metrics.affectedStudents * 0.82))} students are modeled moving toward available powered facilities.`,
      "faculty-conflict": `${metrics.conflicts} operational conflicts reflect timetable, faculty and facility availability constraints.`,
      "transport-load": `Transport load reaches ${formatPercent(metrics.transportLoad)} as power-aware reassignment increases cross-campus movement.`,
      "campus-stability": `Stability is the downstream result after facility capacity, room pressure, conflicts and transport are evaluated.`,
    }
    return details[id]
  }
  if (scenario?.kind === "examination-surge") {
    const details: Record<string, string> = {
      "building-failure": `${scenario.targetLabel ?? "The examination period"} creates a concentrated demand surge for the ${scenario.durationHours}h window.`,
      "class-displacement": `${formatNumber(metrics.affectedStudents)} students are exposed as assessment sessions compete for compatible rooms.`,
      "room-pressure": `Room utilization reaches ${formatPercent(metrics.roomUtilization)} as the exam schedule consumes available capacity.`,
      "student-movement": `${formatNumber(Math.round(metrics.affectedStudents * 0.82))} students are modeled moving between examination and support areas.`,
      "faculty-conflict": `${metrics.conflicts} scheduling conflicts reflect overlapping faculty and assessment time windows.`,
      "transport-load": `Transport load reaches ${formatPercent(metrics.transportLoad)} during peak examination movement.`,
      "campus-stability": `Stability is the downstream result after examination demand, capacity, scheduling and mobility pressure are evaluated.`,
    }
    return details[id]
  }
  return undefined
}

export function RippleRail({ metrics, buildings, activeNodeIndex, events, scenario }: RippleRailProps) {
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null)
  const activeEventCount = Math.max(0, activeNodeIndex + 1)
  const stabilitySeverity = nodes.find((node) => node.id === "campus-stability")?.severity(metrics, buildings) ?? "normal"
  const readyMessage = scenario?.kind === "building-closure" && (scenario.targetLabel ?? "TT Block") === "TT Block" ? "Ready. Run the TT Block scenario to reveal the causal sequence." : `Ready. Run the ${focusScenarioConfiguration(scenario ?? { buildingId: "", condition: "close", durationHours: 1, startTime: "00:00" }).typeLabel.toLowerCase()} to reveal the causal sequence.`
  return <div className="ripple-body">
    <div className="ripple-intro"><div className="ripple-intro-copy"><h3>Cause → ripple → consequence</h3><p>Each node activates from the same state transition that drives the map and KPI bar.</p></div>{activeNodeIndex >= 6 ? <div className="ripple-intro-status"><div className="ripple-state-label">Cascade state / <strong>complete</strong></div><div className="ripple-primary-outcome"><span>PRIMARY CONSEQUENCE / CAMPUS STABILITY</span><strong>{metrics.campusStability}</strong><small>{stabilitySeverity.toUpperCase()} / INDEX 100</small></div></div> : <div className="ripple-state-label">Cascade state / <strong>{activeNodeIndex < 0 ? "ready" : `${activeNodeIndex + 1} of 7 active`}</strong></div>}</div>
    <div className="ripple-rail" aria-label="Causal ripple sequence">
      {nodes.map((node, index) => {
        const active = index <= activeNodeIndex
        const severity = node.severity(metrics, buildings)
        const expanded = expandedNodeId === node.id
        const title = scenarioNodeTitles[scenario?.kind ?? ""]?.[node.id] ?? node.title
        const detail = scenarioNodeDetail(node.id, metrics, scenario) ?? node.detail(metrics, buildings, scenario)
        return <button className={`ripple-node ${active ? "active" : ""} node-${severity} ${expanded ? "expanded" : ""}`} type="button" aria-expanded={expanded} aria-controls={`ripple-detail-${node.id}`} onClick={() => setExpandedNodeId(expanded ? null : node.id)} key={node.id}>
          <span className="ripple-node-index">0{index + 1}</span>
          <span className="ripple-node-title">{title}</span>
          <span className="ripple-node-value">{active ? node.value(metrics, buildings) : "—"}</span>
          <span className="ripple-node-status">{active ? titleCase(severity) : "Waiting"}</span>
          <span className="ripple-node-expand">{expanded ? "Hide detail" : "Why?"} <b>↗</b></span>
          {expanded ? <span className="ripple-node-detail" id={`ripple-detail-${node.id}`}><span>WHAT CHANGED / WHY</span>{detail}</span> : null}
        </button>
      }).flatMap((node, index) => index < nodes.length - 1 ? [node, <span className={`ripple-connector ${index < activeNodeIndex ? "active" : ""}`} aria-hidden="true" key={`connector-${index}`} />] : [node])}
    </div>
    {events.length === 0 ? <div className="ready-state">{readyMessage}</div> : <div className="event-stream" aria-live="polite">{events.map((event, index) => <div className={`event-item ${index <= activeNodeIndex ? "active" : ""}`} key={event.id}><div className="event-time">{event.timeLabel}</div><div className="event-title">{event.title}</div></div>)}</div>}
    {activeEventCount > 0 && activeEventCount < events.length ? <div className="sr-only">Simulation is progressing through event {activeEventCount} of {events.length}.</div> : null}
  </div>
}
