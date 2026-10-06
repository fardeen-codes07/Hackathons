import { baselineMetrics, buildings } from "@/data/campusData"
import type { AffectedSystem, CampusMetrics, Scenario, ScenarioKind } from "@/types"

export type NeuralStateOverrides = Partial<Pick<CampusMetrics, "activeStudents" | "roomUtilization" | "facultyLoad" | "transportLoad" | "campusStability">>

export type NeuralFeatureMetadata = {
  name: string
  label: string
  kind: "numeric" | "categorical"
  min: number
  max: number
}

export type NeuralTargetName = "projected_room_utilization" | "projected_transport_load" | "projected_student_movement" | "projected_faculty_conflicts" | "projected_stability" | "projected_recovery_hours"

export const NEURAL_SCENARIO_KINDS: ScenarioKind[] = ["building-closure", "transport-capacity", "weather-event", "campus-event", "network-disruption", "power-disruption", "examination-surge"]

export const NEURAL_FEATURE_METADATA: NeuralFeatureMetadata[] = [
  { name: "active_students", label: "Active students", kind: "numeric", min: 12000, max: 26000 },
  { name: "room_utilization", label: "Current room utilization", kind: "numeric", min: 45, max: 100 },
  { name: "faculty_load", label: "Current faculty load", kind: "numeric", min: 35, max: 95 },
  { name: "transport_load", label: "Current transport load", kind: "numeric", min: 20, max: 100 },
  { name: "campus_stability", label: "Current campus stability", kind: "numeric", min: 40, max: 100 },
  { name: "disruption_severity", label: "Disruption severity", kind: "numeric", min: 20, max: 100 },
  { name: "duration_hours", label: "Duration", kind: "numeric", min: 1, max: 12 },
  { name: "affected_capacity_ratio", label: "Affected capacity ratio", kind: "numeric", min: 0.25, max: 0.98 },
  { name: "target_scheduled_ratio", label: "Target scheduled ratio", kind: "numeric", min: 0.25, max: 0.98 },
  { name: "target_capacity_ratio", label: "Target capacity ratio", kind: "numeric", min: 0.55, max: 1.1 },
  { name: "start_time_fraction", label: "Start time", kind: "numeric", min: 0.25, max: 0.8 },
  { name: "event_intensity", label: "Event intensity", kind: "numeric", min: 0, max: 100 },
  { name: "weather_severity", label: "Weather severity", kind: "numeric", min: 0, max: 100 },
  { name: "infrastructure_severity", label: "Infrastructure severity", kind: "numeric", min: 0, max: 100 },
  { name: "system_classes", label: "Classes affected", kind: "categorical", min: 0, max: 1 },
  { name: "system_rooms", label: "Rooms affected", kind: "categorical", min: 0, max: 1 },
  { name: "system_students", label: "Students affected", kind: "categorical", min: 0, max: 1 },
  { name: "system_faculty", label: "Faculty affected", kind: "categorical", min: 0, max: 1 },
  { name: "system_transport", label: "Transport affected", kind: "categorical", min: 0, max: 1 },
  ...NEURAL_SCENARIO_KINDS.map((kind) => ({ name: `scenario_${kind}`, label: kind, kind: "categorical" as const, min: 0, max: 1 })),
  { name: "power_availability", label: "Power availability", kind: "numeric", min: 0, max: 100 },
  { name: "exam_demand_intensity", label: "Examination demand intensity", kind: "numeric", min: 0, max: 100 },
]

export const NEURAL_TARGET_METADATA: { name: NeuralTargetName; label: string; unit: string; min: number; max: number }[] = [
  { name: "projected_room_utilization", label: "Projected room utilization", unit: "percent", min: 0, max: 130 },
  { name: "projected_transport_load", label: "Projected transport load", unit: "percent", min: 0, max: 130 },
  { name: "projected_student_movement", label: "Projected student movement", unit: "students", min: 0, max: 26000 },
  { name: "projected_faculty_conflicts", label: "Projected faculty conflicts", unit: "conflicts", min: 0, max: 120 },
  { name: "projected_stability", label: "Projected campus stability", unit: "percent", min: 0, max: 100 },
  { name: "projected_recovery_hours", label: "Projected recovery", unit: "hours", min: 0, max: 24 },
]

const DEFAULT_STATE = {
  activeStudents: baselineMetrics.activeStudents,
  roomUtilization: baselineMetrics.roomUtilization,
  facultyLoad: baselineMetrics.facultyLoad,
  transportLoad: baselineMetrics.transportLoad,
  campusStability: baselineMetrics.campusStability,
}

function targetBuilding(scenario: Scenario) {
  return buildings.find((building) => building.id === scenario.buildingId) ?? buildings[0]
}

function startTimeFraction(startTime: string) {
  const [hours, minutes] = startTime.split(":").map(Number)
  return (hours * 60 + minutes) / (24 * 60)
}

function systemsFor(scenario: Scenario): AffectedSystem[] {
  return scenario.affectedSystems ?? ["classes", "rooms", "students", "faculty", "transport"]
}

export function extractNeuralFeatures(scenario: Scenario, overrides: NeuralStateOverrides = {}): number[] {
  const state = { ...DEFAULT_STATE, ...overrides }
  const building = targetBuilding(scenario)
  const systems = systemsFor(scenario)
  const kind = scenario.kind ?? "building-closure"
  const eventIntensity = kind === "campus-event" ? scenario.severity ?? 48 : kind === "weather-event" ? 0 : 0
  const weatherSeverity = kind === "weather-event" ? scenario.severity ?? 55 : 0
  const infrastructureSeverity = kind === "network-disruption" || kind === "building-closure" || kind === "power-disruption" ? scenario.severity ?? 72 : 0
  const powerAvailability = kind === "power-disruption" ? 100 - (scenario.severity ?? 78) : 100
  const examDemandIntensity = kind === "examination-surge" ? scenario.severity ?? 76 : 0

  return [
    state.activeStudents,
    state.roomUtilization,
    state.facultyLoad,
    state.transportLoad,
    state.campusStability,
    scenario.severity ?? 72,
    scenario.durationHours,
    building.scheduledStudents / Math.max(building.capacity, 1),
    building.scheduledStudents / 5000,
    building.capacity / 5600,
    startTimeFraction(scenario.startTime),
    eventIntensity,
    weatherSeverity,
    infrastructureSeverity,
    ...(["classes", "rooms", "students", "faculty", "transport"] as AffectedSystem[]).map((system) => systems.includes(system) ? 1 : 0),
    ...NEURAL_SCENARIO_KINDS.map((scenarioKind) => scenarioKind === kind ? 1 : 0),
    powerAvailability,
    examDemandIntensity,
  ]
}

export function validateNeuralVector(values: number[], metadata = NEURAL_FEATURE_METADATA): string[] {
  const errors: string[] = []
  if (values.length !== metadata.length) errors.push(`Expected ${metadata.length} features, received ${values.length}`)
  values.forEach((value, index) => {
    const item = metadata[index]
    if (!Number.isFinite(value)) errors.push(`${item?.name ?? `feature_${index}`} is not finite`)
    if (item && (value < item.min || value > item.max)) errors.push(`${item.name} is outside its supported range`)
  })
  return errors
}
