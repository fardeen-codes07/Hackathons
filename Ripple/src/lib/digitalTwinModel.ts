import { getBuildingTwinSummary, campusTwin } from "@/data/campusTwin"
import { formatNumber } from "@/lib/format"
import type { Building, BuildingStatus, CampusMetrics, Scenario } from "@/types"

export type DigitalTwinNodeId = "building" | "classes" | "rooms" | "students" | "faculty" | "movement" | "transport" | "stability"

export type DigitalTwinNode = {
  id: DigitalTwinNodeId
  label: string
  sublabel: string
  value: string
  detail: string
  state: BuildingStatus
  x: number
  y: number
}

export type DigitalTwinRelationship = {
  from: DigitalTwinNodeId
  to: DigitalTwinNodeId
  label: string
}

export type DigitalTwinModel = {
  nodes: DigitalTwinNode[]
  relationships: DigitalTwinRelationship[]
  selectedBuilding: Building
  connectedSystems: string[]
  infrastructure: string[]
}

const relationships: DigitalTwinRelationship[] = [
  { from: "building", to: "classes", label: "hosts" },
  { from: "building", to: "rooms", label: "contains" },
  { from: "classes", to: "students", label: "displaces" },
  { from: "classes", to: "faculty", label: "assigns" },
  { from: "rooms", to: "movement", label: "redirects" },
  { from: "students", to: "movement", label: "redistributes" },
  { from: "movement", to: "transport", label: "loads" },
  { from: "transport", to: "stability", label: "pressures" },
]

function stateFor(activeNodeIndex: number, nodeIndex: number, state: BuildingStatus): BuildingStatus {
  if (nodeIndex === 0) return state
  if (activeNodeIndex < nodeIndex - 1) return "operational"
  return state
}

export function buildDigitalTwinModel({ scenario, metrics, buildings, activeNodeIndex }: { scenario: Scenario; metrics: CampusMetrics; buildings: Building[]; activeNodeIndex: number }): DigitalTwinModel {
  const selectedBuilding = buildings.find((building) => building.id === scenario.buildingId) ?? buildings[0]
  const summary = getBuildingTwinSummary(selectedBuilding.id)
  const sourceState = activeNodeIndex >= 0 ? selectedBuilding.status : "operational"
  const movingStudents = Math.round(metrics.affectedStudents * 0.82)
  const buildingLabel = scenario.targetLabel ?? selectedBuilding.name
  const sourceSublabel = scenario.kind === "power-disruption" ? "POWER SOURCE" : scenario.kind === "examination-surge" ? "EXAM DEMAND" : "SOURCE"
  const sourceOnlineLabel = scenario.kind === "power-disruption" ? "POWER ONLINE" : scenario.kind === "examination-surge" ? "BASELINE" : "ONLINE"
  const sourceActiveLabel = scenario.kind === "power-disruption" ? "POWER CONSTRAINED" : scenario.kind === "examination-surge" ? "SURGE ACTIVE" : sourceState.toUpperCase()
  const roomDetail = scenario.kind === "power-disruption" ? `${selectedBuilding.roomCount} rooms · powered capacity is constrained by the active grid scenario` : scenario.kind === "examination-surge" ? `${selectedBuilding.roomCount} rooms · assessment demand is concentrated in the active window` : `${selectedBuilding.roomCount} rooms · ${metrics.roomPressure.toUpperCase()} pressure`
  const movementDetail = scenario.kind === "power-disruption" ? "Power-aware reassignment adds movement toward available powered facilities" : scenario.kind === "examination-surge" ? "Assessment scheduling adds movement between examination and support areas" : "Student redistribution adds cross-campus movement demand"

  const nodes: DigitalTwinNode[] = [
    { id: "building", label: buildingLabel, sublabel: sourceSublabel, value: sourceState === "operational" && activeNodeIndex < 0 ? sourceOnlineLabel : sourceActiveLabel, detail: `${summary.classes} connected classes · ${summary.routes} route${summary.routes === 1 ? "" : "s"}`, state: sourceState, x: 20, y: 116 },
    { id: "classes", label: "Classes", sublabel: "SCHEDULE", value: `${summary.classes} linked`, detail: `${summary.classes} connected classes · ${formatNumber(summary.students)} scheduled students${metrics.affectedStudents > 0 ? ` · ${formatNumber(metrics.affectedStudents)} affected in scenario` : ""}`, state: stateFor(activeNodeIndex, 1, metrics.affectedStudents > 0 ? "affected" : "operational"), x: 190, y: 36 },
    { id: "rooms", label: "Rooms", sublabel: "CAPACITY", value: `${metrics.roomUtilization}% load`, detail: roomDetail, state: stateFor(activeNodeIndex, 2, metrics.roomPressure === "critical" ? "critical" : metrics.roomPressure === "high" ? "warning" : "operational"), x: 190, y: 196 },
    { id: "students", label: "Students", sublabel: "DEMAND", value: `${formatNumber(metrics.affectedStudents)} affected`, detail: `${formatNumber(movingStudents)} modeled movements follow displacement`, state: stateFor(activeNodeIndex, 3, metrics.affectedStudents > 0 ? "affected" : "operational"), x: 380, y: 36 },
    { id: "faculty", label: "Faculty", sublabel: "CONFLICTS", value: `${metrics.conflicts} conflicts`, detail: `${metrics.conflicts} assignments remain in conflict after displacement`, state: stateFor(activeNodeIndex, 4, metrics.conflicts > 0 ? "warning" : "operational"), x: 380, y: 196 },
    { id: "movement", label: "Mobility", sublabel: "MOVEMENT", value: `${formatNumber(movingStudents)} moving`, detail: movementDetail, state: stateFor(activeNodeIndex, 5, movingStudents > 0 ? "affected" : "operational"), x: 570, y: 36 },
    { id: "transport", label: "Transport", sublabel: "ROUTE LOAD", value: `${metrics.transportLoad}% load`, detail: `${metrics.transportPressure.toUpperCase()} against connected route capacity`, state: stateFor(activeNodeIndex, 6, metrics.transportPressure === "critical" ? "critical" : metrics.transportPressure === "high" ? "warning" : "operational"), x: 570, y: 196 },
    { id: "stability", label: "Stability", sublabel: "OUTCOME", value: `${metrics.campusStability} / 100`, detail: "Final system condition after the modeled cascade", state: stateFor(activeNodeIndex, 7, metrics.campusStability < 60 ? "critical" : "operational"), x: 760, y: 116 },
  ]

  const infrastructure = campusTwin.infrastructureAssets.filter((asset) => asset.connectedBuildingIds.includes(selectedBuilding.id)).map((asset) => asset.name)
  return { nodes, relationships, selectedBuilding, connectedSystems: summary.connectedSystems, infrastructure }
}
