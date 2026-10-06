"use client"

import { useMemo, useState } from "react"
import { buildDigitalTwinModel, type DigitalTwinNodeId } from "@/lib/digitalTwinModel"
import { formatNumber } from "@/lib/format"
import type { Building, CampusMetrics, DecisionSession, Scenario } from "@/types"

type SystemNetworkProps = {
  metrics: CampusMetrics
  buildings: Building[]
  activeNodeIndex: number
  scenario: Scenario
  decisionSession: DecisionSession
}

const nodeWidth = 150
const nodeHeight = 68

function nodeStyle(x: number, y: number) {
  return { left: `${x / 10}%`, top: `${(y / 300) * 100}%` }
}

function statusLabel(state: string) {
  return state === "operational" ? "OPERATIONAL" : state.toUpperCase()
}

export function SystemNetwork({ metrics, buildings, activeNodeIndex, scenario, decisionSession }: SystemNetworkProps) {
  const model = useMemo(() => buildDigitalTwinModel({ scenario, metrics, buildings, activeNodeIndex }), [activeNodeIndex, buildings, metrics, scenario])
  const [selectedNodeId, setSelectedNodeId] = useState<DigitalTwinNodeId>("building")

  const selectedNode = model.nodes.find((node) => node.id === selectedNodeId) ?? model.nodes[0]
  const selectedBranch = decisionSession.branches.find((branch) => branch.id === decisionSession.activeBranchId && branch.status === "complete")
  const modeLabel = selectedBranch ? "SELECTED FUTURE" : activeNodeIndex >= 0 ? "MODELED RIPPLE" : "CURRENT BASELINE"
  const selectedDetails = selectedNode.id === "building"
    ? `${model.selectedBuilding.roomCount} rooms · ${formatNumber(model.selectedBuilding.scheduledStudents)} scheduled students · ${model.selectedBuilding.facultyCount} faculty`
    : selectedNode.detail

  return <section className="system-network digital-twin-network" data-testid="digital-twin-network" aria-labelledby="digital-twin-title">
    <div className="network-header"><div><span className="eyebrow">DIGITAL TWIN / SYSTEM VIEW</span><h3 id="digital-twin-title">What is connected?</h3><p>Structure shows which campus systems carry the disruption. Select an entity to inspect its linked records.</p></div><div className="network-header-meta"><span className="analysis-tag">{modeLabel}</span><small>{scenario.targetLabel ?? model.selectedBuilding.name} / {scenario.durationHours}H window</small></div></div>
    <div className="network-canvas" aria-label="Interactive campus system dependency network">
      <svg className="network-connections" viewBox="0 0 1000 300" aria-hidden="true">
        {model.relationships.map((relationship) => {
          const source = model.nodes.find((node) => node.id === relationship.from)!
          const target = model.nodes.find((node) => node.id === relationship.to)!
          const active = source.state !== "operational" || target.state !== "operational"
          return <g key={`${relationship.from}-${relationship.to}`} className={active ? "active" : ""}><line x1={source.x + nodeWidth} y1={source.y + nodeHeight / 2} x2={target.x} y2={target.y + nodeHeight / 2} /><text x={(source.x + nodeWidth + target.x) / 2} y={(source.y + target.y) / 2 + 4}>{relationship.label}</text></g>
        })}
      </svg>
      <div className="network-node-grid">
        {model.nodes.map((node) => <button className={`digital-twin-node ${node.state} ${selectedNodeId === node.id ? "selected" : ""}`} style={nodeStyle(node.x, node.y)} type="button" key={node.id} onClick={() => setSelectedNodeId(node.id)} aria-pressed={selectedNodeId === node.id} data-testid={`digital-twin-node-${node.id}`}>
          <span className="digital-twin-node-status"><i />{statusLabel(node.state)}</span>
          <strong>{node.label}</strong>
          <span>{node.sublabel} / {node.value}</span>
        </button>)}
      </div>
    </div>
    <div className="network-selection" aria-live="polite"><div className="network-selection-heading"><div><span className="eyebrow">SELECTED ENTITY</span><h4>{selectedNode.label}</h4></div><span className={`status-badge ${selectedNode.state}`}><span className="status-dot" />{statusLabel(selectedNode.state)}</span></div><p>{selectedDetails}</p><div className="network-selection-meta"><div><span>CONNECTED SYSTEMS</span><strong>{model.connectedSystems.join(" · ")}</strong></div><div><span>DEPENDENCIES</span><strong>{model.infrastructure.length > 0 ? model.infrastructure.join(" · ") : "Academic · Mobility · Transport"}</strong></div></div></div>
    <p className="network-disclosure">Relationships are representative synthetic campus topology. They explain modeled dependencies; they do not represent live university telemetry.</p>
  </section>
}
