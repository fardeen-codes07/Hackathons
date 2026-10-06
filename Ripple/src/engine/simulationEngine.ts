import { baselineMetrics, buildings, rooms } from "@/data/campusData"
import { defaultScenario } from "@/data/mockData"
import { classifyRoomPressure, classifyTransportPressure, deriveScenarioMetrics } from "@/engine/rules"
import { createDecisionSession } from "@/lib/decisionSession"
import type {
  AffectedSystem,
  Building,
  CampusSnapshot,
  CampusState,
  CampusMetrics,
  Scenario,
  SimulationEvent,
  SimulationResult,
  ScenarioKind,
} from "@/types"

const eventDefinitions = [
  { minuteOffset: 0, title: "constraint active", description: "The scenario condition is confirmed for the simulation window.", nodeId: "building-failure", severity: "critical" as const },
  { minuteOffset: 4, title: "Class displacement detected", description: "Scheduled classes are released from TT Block.", nodeId: "class-displacement", severity: "elevated" as const },
  { minuteOffset: 7, title: "Room pressure rising", description: "Compatible rooms begin absorbing displaced demand.", nodeId: "room-pressure", severity: "high" as const },
  { minuteOffset: 12, title: "Student redistribution", description: "Movement increases across the central and east routes.", nodeId: "student-movement", severity: "elevated" as const },
  { minuteOffset: 18, title: "Faculty conflicts detected", description: "Several assignments exceed faculty and time constraints.", nodeId: "faculty-conflict", severity: "high" as const },
  { minuteOffset: 24, title: "Transport load increasing", description: "Cross-campus movement adds pressure to the shuttle loop.", nodeId: "transport-load", severity: "high" as const },
  { minuteOffset: 31, title: "Campus stability decreasing", description: "The cascade crosses the high-pressure threshold.", nodeId: "campus-stability", severity: "critical" as const },
]

const scenarioEventNarratives: Partial<Record<ScenarioKind, { title: string; description: string }[]>> = {
  "power-disruption": [
    { title: "Power availability constrained", description: "The central power loop is operating below the required availability for the simulation window." },
    { title: "Facility capacity degraded", description: "Power-dependent teaching capacity is released or constrained across connected facilities." },
    { title: "Room pressure rising", description: "Compatible powered rooms begin absorbing displaced demand." },
    { title: "Student redistribution", description: "Movement increases as classes shift toward available powered facilities." },
    { title: "Operational conflicts detected", description: "Several assignments exceed faculty, time and facility constraints." },
    { title: "Transport load increasing", description: "Cross-campus movement adds pressure to the connected shuttle routes." },
    { title: "Campus stability decreasing", description: "The power cascade crosses the high-pressure threshold." },
  ],
  "examination-surge": [
    { title: "Exam demand surge active", description: "The examination window is creating a concentrated demand increase across the campus schedule." },
    { title: "Exam sessions competing", description: "Assessment sessions compete for compatible rooms and faculty time windows." },
    { title: "Room pressure rising", description: "Available rooms begin absorbing the examination demand surge." },
    { title: "Student redistribution", description: "Student movement increases between examination and support areas." },
    { title: "Scheduling pressure detected", description: "Faculty and room assignments begin to exceed available time and resource constraints." },
    { title: "Transport load increasing", description: "Peak examination movement adds pressure to the connected shuttle routes." },
    { title: "Campus stability decreasing", description: "The examination surge crosses the high-pressure threshold." },
  ],
}

function addMinutesToTime(time: string, offset: number): string {
  const [hours, minutes] = time.split(":").map(Number)
  const total = hours * 60 + minutes + offset
  const nextHours = Math.floor((total % (24 * 60)) / 60)
  const nextMinutes = total % 60
  return `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`
}

function withBuildingStatuses(
  source: Building[],
  closedBuildingId: string,
  progress: number,
  scenarioKind: Scenario["kind"],
): Building[] {
  return source.map((building) => {
    if (building.id === closedBuildingId) return { ...building, status: progress === 0 ? "selected" : scenarioKind === "building-closure" ? "offline" : "affected" }
    if (progress === 0) return { ...building, status: "operational" }
    if (building.id === "innovation-hub" && progress > 0.35) return { ...building, status: "affected" }
    if (building.id === "library" && progress > 0.55) return { ...building, status: "warning" }
    if (building.id === "north-quad" && progress > 0.75) return { ...building, status: "warning" }
    return { ...building, status: "operational" }
  })
}

function interpolateMetrics(baseline: CampusMetrics, final: CampusMetrics, progress: number): CampusMetrics {
  const interpolate = (start: number, end: number) => Math.round(start + (end - start) * progress)
  const roomUtilization = interpolate(baseline.roomUtilization, final.roomUtilization)
  const transportLoad = interpolate(baseline.transportLoad, final.transportLoad)

  return {
    ...baseline,
    activeStudents: baseline.activeStudents,
    affectedStudents: interpolate(0, final.affectedStudents),
    roomUtilization,
    facultyLoad: interpolate(baseline.facultyLoad, final.facultyLoad),
    transportLoad,
    campusStability: interpolate(baseline.campusStability, final.campusStability),
    conflicts: interpolate(0, final.conflicts),
    recoveryHours: interpolate(0, final.recoveryHours),
    personHoursDisrupted: interpolate(0, final.personHoursDisrupted),
    estimatedOperationalCost: interpolate(0, final.estimatedOperationalCost),
    transportImpact: interpolate(0, final.transportImpact),
    energyImpact: interpolate(0, final.energyImpact),
    carbonImpact: interpolate(0, final.carbonImpact),
    roomPressure: roomUtilization > 100 ? "critical" : roomUtilization >= 90 ? "high" : roomUtilization >= 85 ? "elevated" : "normal",
    transportPressure: transportLoad > 90 ? "critical" : transportLoad >= 80 ? "high" : transportLoad >= 70 ? "elevated" : "normal",
  }
}

function getProgressForNode(index: number): number {
  return [0, 0.14, 0.3, 0.5, 0.68, 0.84, 1][index] ?? 1
}

function addScenarioLabel(event: typeof eventDefinitions[number], scenario: Scenario, closedBuilding: Building): string {
  if (event.nodeId !== "building-failure") return event.title
  const target = scenario.targetLabel ?? closedBuilding.name
  return scenario.kind === "building-closure" ? `${target} offline` : `${target} constraint active`
}

function createEventList(scenario: Scenario, closedBuilding: Building): SimulationEvent[] {
  const startTime = scenario.startTime
  const endTime = addMinutesToTime(startTime, scenario.durationHours * 60)
  return eventDefinitions.map((event, index) => ({
    id: `event-${index + 1}`,
    minuteOffset: event.minuteOffset,
    timeLabel: addMinutesToTime(startTime, event.minuteOffset),
    title: scenarioEventNarratives[scenario.kind ?? "building-closure"]?.[index]?.title ?? addScenarioLabel(event, scenario, closedBuilding),
    description: scenarioEventNarratives[scenario.kind ?? "building-closure"]?.[index]?.description ?? (event.nodeId === "building-failure" ? `${scenario.kind === "building-closure" ? "Closure" : "Constraint"} confirmed for the ${startTime}–${endTime} window.` : event.description),
    nodeId: event.nodeId,
    severity: event.severity,
  }))
}

const allSystems: AffectedSystem[] = ["classes", "rooms", "students", "faculty", "transport"]

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function scenarioImpactFactor(scenario: Scenario): number {
  const severityFactor = clamp((scenario.severity ?? defaultScenario.severity ?? 72) / 72, 0.2, 1.5)
  const durationFactor = Math.max(0.25, scenario.durationHours / 6)
  const kindFactor = scenario.kind === "transport-capacity" ? 0.38 : scenario.kind === "weather-event" ? 0.62 : scenario.kind === "campus-event" ? 0.72 : scenario.kind === "network-disruption" ? 0.48 : scenario.kind === "power-disruption" ? 0.78 : scenario.kind === "examination-surge" ? 0.72 : 1
  const systems = scenario.affectedSystems ?? allSystems
  const classFactor = systems.includes("classes") ? 1 : 0.3
  return severityFactor * durationFactor * kindFactor * classFactor
}

function deriveOperationalMetrics(scenario: Scenario, displacedStudents: number, closedBuilding: Building): CampusMetrics {
  const systems = scenario.affectedSystems ?? allSystems
  const severityFactor = clamp((scenario.severity ?? defaultScenario.severity ?? 72) / 72, 0.2, 1.5)
  const durationFactor = Math.max(0.25, scenario.durationHours / 6)
  const base = deriveScenarioMetrics(baselineMetrics, displacedStudents, closedBuilding.scheduledStudents)
  const transportBonus = scenario.kind === "transport-capacity" ? Math.round(15 * severityFactor) : scenario.kind === "weather-event" ? Math.round(8 * severityFactor) : scenario.kind === "campus-event" ? Math.round(5 * severityFactor) : scenario.kind === "power-disruption" ? Math.round(6 * severityFactor) : scenario.kind === "examination-surge" ? Math.round(9 * severityFactor) : 0
  const roomBonus = scenario.kind === "campus-event" ? Math.round(5 * severityFactor) : scenario.kind === "weather-event" ? Math.round(3 * severityFactor) : scenario.kind === "power-disruption" ? Math.round(6 * severityFactor) : scenario.kind === "examination-surge" ? Math.round(8 * severityFactor) : 0
  const transportLoad = systems.includes("transport") ? base.transportLoad + transportBonus : baselineMetrics.transportLoad + Math.round((base.transportLoad - baselineMetrics.transportLoad) * 0.25)
  const roomUtilization = systems.includes("rooms") ? base.roomUtilization + roomBonus : baselineMetrics.roomUtilization + Math.round((base.roomUtilization - baselineMetrics.roomUtilization) * 0.25)
  const conflicts = systems.includes("faculty") ? base.conflicts : Math.round(base.conflicts * 0.22)
  const facultyLoad = systems.includes("faculty") ? base.facultyLoad : baselineMetrics.facultyLoad + Math.round((base.facultyLoad - baselineMetrics.facultyLoad) * 0.2)
  const affectedStudents = systems.includes("students") ? displacedStudents : Math.round(displacedStudents * 0.25)
  const campusStability = clamp(base.campusStability - transportBonus * 0.35 - roomBonus * 0.25, 0, 100)
  const recoveryHours = Math.max(1, Math.round(2 + scenario.durationHours + transportBonus / 8))
  const estimatedOperationalCost = Math.round(affectedStudents * 2.5 + conflicts * 120 + Math.max(0, transportLoad - baselineMetrics.transportLoad) * 300)

  return {
    ...base,
    affectedStudents,
    roomUtilization,
    facultyLoad,
    transportLoad,
    campusStability,
    conflicts,
    recoveryHours,
    personHoursDisrupted: affectedStudents * scenario.durationHours,
    estimatedOperationalCost,
    transportImpact: transportLoad,
    energyImpact: Math.round(roomUtilization * durationFactor * 1.1),
    carbonImpact: Math.round(transportLoad * durationFactor * 2.4),
    roomPressure: classifyRoomPressure(roomUtilization),
    transportPressure: classifyTransportPressure(transportLoad),
  }
}

export function createInitialState(): CampusState {
  return {
    simulationTimeMinutes: 0,
    buildings: buildings.map((building) => ({ ...building })),
    rooms: rooms.map((room) => ({ ...room })),
    metrics: { ...baselineMetrics },
    selectedBuildingId: null,
    scenario: { ...defaultScenario, affectedSystems: [...(defaultScenario.affectedSystems ?? [])] },
    phase: "idle",
    activeSnapshotIndex: 0,
    snapshots: [],
    events: [],
    scenarioHistory: [],
    decisionSession: createDecisionSession(),
  }
}

export function runSimulation(scenario: Scenario): SimulationResult {
  const normalizedScenario: Scenario = {
    ...defaultScenario,
    ...scenario,
    severity: scenario.severity ?? defaultScenario.severity,
    affectedSystems: scenario.affectedSystems ?? defaultScenario.affectedSystems,
    kind: scenario.kind ?? defaultScenario.kind,
  }
  const closedBuilding = buildings.find((building) => building.id === normalizedScenario.buildingId) ?? buildings[0]
  const displacedStudents = Math.round(closedBuilding.scheduledStudents * scenarioImpactFactor(normalizedScenario))
  const finalMetrics = deriveOperationalMetrics(normalizedScenario, displacedStudents, closedBuilding)
  const events = createEventList(normalizedScenario, closedBuilding)
  const baseline: CampusSnapshot = {
    simulationTimeMinutes: 0,
    label: "BASELINE",
    metrics: { ...baselineMetrics },
    buildings: withBuildingStatuses(buildings, closedBuilding.id, 0, normalizedScenario.kind),
    activeNodeIndex: -1,
  }
  const snapshots = [baseline, ...events.map((event, index) => {
    const progress = getProgressForNode(index + 1)
    return {
      simulationTimeMinutes: event.minuteOffset,
      label: event.title.toUpperCase(),
      metrics: interpolateMetrics(baselineMetrics, finalMetrics, progress),
      buildings: withBuildingStatuses(buildings, closedBuilding.id, progress, normalizedScenario.kind),
      activeNodeIndex: index,
    }
  })]

  return { baseline, snapshots, events, scenario: normalizedScenario }
}
