import type { Scenario, ScenarioKind } from "@/types"

export type FocusScenarioConfiguration = {
  kind: ScenarioKind | "fallback"
  heading: string
  typeLabel: string
  targetFieldLabel: string
  targetMode: "building" | "readout"
  sourceEventLabel: string
  sourceAction: string
  severityLabel: string
  severityMode: "band" | "exact"
  advancedExactSeverity: boolean
  durationOptions: number[]
  durationLabel: string
  causalSequence: string[]
}

export type ScenarioSummary = {
  title: string
  target: string
  window: string
  affectedSystems: string[]
}

export type ScenarioValidationResult = {
  valid: boolean
  errors: string[]
}

const defaultDurationOptions = [2, 4, 6, 8, 12]

const scenarioConfigurationByKind: Record<ScenarioKind, Omit<FocusScenarioConfiguration, "kind" | "durationOptions">> = {
  "building-closure": {
    heading: "BUILDING CLOSURE",
    typeLabel: "Building closure",
    targetFieldLabel: "Building",
    targetMode: "building",
    sourceEventLabel: "Building offline",
    sourceAction: "closes",
    severityLabel: "Severity",
    severityMode: "band",
    advancedExactSeverity: true,
    durationLabel: "Closure duration",
    causalSequence: ["Building offline", "Classes displaced", "Room pressure", "Student movement", "Faculty conflict", "Transport load", "Campus stability"],
  },
  "transport-capacity": {
    heading: "TRANSPORT",
    typeLabel: "Transport capacity reduction",
    targetFieldLabel: "Route",
    targetMode: "readout",
    sourceEventLabel: "Transport constraint",
    sourceAction: "capacity constrained",
    severityLabel: "Load / severity",
    severityMode: "exact",
    advancedExactSeverity: false,
    durationLabel: "Constraint duration",
    causalSequence: ["Transport constrained", "Classes displaced", "Room pressure", "Student movement", "Faculty conflict", "Transport load", "Campus stability"],
  },
  "weather-event": {
    heading: "WEATHER",
    typeLabel: "Severe weather",
    targetFieldLabel: "Affected area",
    targetMode: "readout",
    sourceEventLabel: "Weather constraint",
    sourceAction: "is affected",
    severityLabel: "Severity",
    severityMode: "exact",
    advancedExactSeverity: false,
    durationLabel: "Event duration",
    causalSequence: ["Weather constraint", "Classes displaced", "Room pressure", "Student movement", "Faculty conflict", "Transport load", "Campus stability"],
  },
  "campus-event": {
    heading: "OPERATIONS",
    typeLabel: "Major campus event",
    targetFieldLabel: "Event area",
    targetMode: "readout",
    sourceEventLabel: "Campus event active",
    sourceAction: "demand increases",
    severityLabel: "Severity",
    severityMode: "exact",
    advancedExactSeverity: false,
    durationLabel: "Event duration",
    causalSequence: ["Event demand active", "Classes displaced", "Room pressure", "Student movement", "Faculty conflict", "Transport load", "Campus stability"],
  },
  "network-disruption": {
    heading: "CAPACITY",
    typeLabel: "Infrastructure disruption",
    targetFieldLabel: "Affected system",
    targetMode: "readout",
    sourceEventLabel: "Network constraint",
    sourceAction: "is disrupted",
    severityLabel: "Severity",
    severityMode: "exact",
    advancedExactSeverity: false,
    durationLabel: "Constraint duration",
    causalSequence: ["Network constrained", "Classes displaced", "Room pressure", "Student movement", "Faculty conflict", "Transport load", "Campus stability"],
  },
  "power-disruption": {
    heading: "POWER / GRID",
    typeLabel: "Power / grid disruption",
    targetFieldLabel: "Affected system",
    targetMode: "readout",
    sourceEventLabel: "Power availability constrained",
    sourceAction: "is constrained",
    severityLabel: "Grid severity",
    severityMode: "exact",
    advancedExactSeverity: false,
    durationLabel: "Outage duration",
    causalSequence: ["Power availability constrained", "Facility capacity degraded", "Room pressure", "Student movement", "Operational conflict", "Transport load", "Campus stability"],
  },
  "examination-surge": {
    heading: "EXAMINATION",
    typeLabel: "Examination period surge",
    targetFieldLabel: "Demand window",
    targetMode: "readout",
    sourceEventLabel: "Exam demand surge active",
    sourceAction: "increases demand",
    severityLabel: "Demand intensity",
    severityMode: "exact",
    advancedExactSeverity: false,
    durationLabel: "Exam window",
    causalSequence: ["Exam demand surge active", "Exam sessions compete", "Room pressure", "Student movement", "Scheduling pressure", "Transport load", "Campus stability"],
  },
}

function durationOptionsFor(scenario: Scenario) {
  return [...new Set([...defaultDurationOptions, scenario.durationHours])].sort((a, b) => a - b)
}

export function focusScenarioConfiguration(scenario: Scenario): FocusScenarioConfiguration {
  const configuration = scenario.kind ? scenarioConfigurationByKind[scenario.kind] : undefined

  return {
    kind: scenario.kind ?? "fallback",
    heading: configuration?.heading ?? scenario.category ?? "SCENARIO",
    typeLabel: configuration?.typeLabel ?? scenario.label ?? "Scenario disruption",
    targetFieldLabel: configuration?.targetFieldLabel ?? "Target",
    targetMode: configuration?.targetMode ?? "readout",
    sourceEventLabel: configuration?.sourceEventLabel ?? "Scenario constraint",
    sourceAction: configuration?.sourceAction ?? "is active",
    severityLabel: configuration?.severityLabel ?? "Severity",
    severityMode: configuration?.severityMode ?? "exact",
    advancedExactSeverity: configuration?.advancedExactSeverity ?? false,
    durationOptions: durationOptionsFor(scenario),
    durationLabel: configuration?.durationLabel ?? "Scenario duration",
    causalSequence: configuration?.causalSequence ?? ["Scenario active", "Classes displaced", "Room pressure", "Student movement", "Faculty conflict", "Transport load", "Campus stability"],
  }
}

function addMinutesToTime(time: string, offset: number): string {
  const [hours, minutes] = time.split(":").map(Number)
  const total = hours * 60 + minutes + offset
  const nextHours = Math.floor((total % (24 * 60)) / 60)
  const nextMinutes = total % 60
  return `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`
}

export function scenarioSummary(scenario: Scenario): ScenarioSummary {
  const configuration = focusScenarioConfiguration(scenario)
  const target = scenario.targetLabel ?? scenario.buildingId
  return {
    title: scenario.label ?? configuration.typeLabel,
    target,
    window: `${scenario.startTime}–${addMinutesToTime(scenario.startTime, scenario.durationHours * 60)}`,
    affectedSystems: (scenario.affectedSystems ?? []).map((system) => system.charAt(0).toUpperCase() + system.slice(1)),
  }
}

export function validateScenario(scenario: Scenario): ScenarioValidationResult {
  const errors: string[] = []
  const kind = scenario.kind ?? "building-closure"
  const configuration = focusScenarioConfiguration(scenario)

  if (!configuration || !scenario.buildingId) errors.push("Choose a target before simulating.")
  if (!Number.isFinite(scenario.durationHours) || scenario.durationHours <= 0 || scenario.durationHours > 24) errors.push("Duration must be between 1 and 24 hours.")
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(scenario.startTime)) errors.push("Start time must use a valid 24-hour time.")
  if (scenario.severity !== undefined && (!Number.isFinite(scenario.severity) || scenario.severity < 0 || scenario.severity > 100)) errors.push("Severity must stay between 0 and 100%.")
  if (kind !== "building-closure" && !scenario.targetLabel) errors.push(`${configuration.targetFieldLabel} is required for this scenario.`)
  if (!scenario.affectedSystems || scenario.affectedSystems.length === 0) errors.push("Select at least one affected system.")

  return { valid: errors.length === 0, errors }
}
