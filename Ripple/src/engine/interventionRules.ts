import { decisionCandidates } from "@/data/mockData"
import type { DecisionCandidate, Scenario } from "@/types"

type OutcomeMetric = Pick<DecisionCandidate, "affectedStudents" | "conflicts" | "recoveryHours" | "stability" | "roomUtilization" | "transportLoad">
type OutcomeDelta = { [Key in keyof OutcomeMetric]: number }

export type InterventionRule = {
  mechanism: string
  deltas: OutcomeDelta
}

const zeroDelta: OutcomeDelta = {
  affectedStudents: 0,
  conflicts: 0,
  recoveryHours: 0,
  stability: 0,
  roomUtilization: 0,
  transportLoad: 0,
}

/**
 * These are deliberately small, transparent transformations of the closure
 * outcome. They are synthetic calibration rules, not forecasts.
 */
export const interventionRules: Record<DecisionCandidate["id"], InterventionRule> = {
  "do-nothing": {
    mechanism: "Allows the existing cascade to propagate without intervention.",
    deltas: zeroDelta,
  },
  "dynamic-reallocation": {
    mechanism: "Redistributes compatible classes before room pressure becomes critical.",
    deltas: {
      affectedStudents: -3640,
      conflicts: -33,
      recoveryHours: -5,
      stability: 46,
      roomUtilization: -16,
      transportLoad: -18,
    },
  },
  "temporary-rooms": {
    mechanism: "Adds short-term capacity to absorb displaced classes.",
    deltas: {
      affectedStudents: -2620,
      conflicts: -23,
      recoveryHours: -3,
      stability: 31,
      roomUtilization: -8,
      transportLoad: -8,
    },
  },
  "hybrid-intervention": {
    mechanism: "Combines upstream reassignment with short-term capacity for a wider response.",
    deltas: {
      affectedStudents: -4200,
      conflicts: -35,
      recoveryHours: -6,
      stability: 49,
      roomUtilization: 0,
      transportLoad: 2,
    },
  },
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value))
}

function applyMetricDelta(metric: keyof OutcomeMetric, value: number, delta: number) {
  if (metric === "stability") return clamp(value + delta, 0, 100)
  return Math.max(0, value + delta)
}

/** Resolve an intervention from the same Do Nothing closure outcome every time. */
export function deriveInterventionCandidate(candidate: DecisionCandidate, baseline = decisionCandidates[0]): DecisionCandidate {
  const rule = interventionRules[candidate.id]
  if (!rule) return candidate

  return {
    ...candidate,
    mechanism: rule.mechanism,
    ...Object.fromEntries(
      (Object.keys(rule.deltas) as (keyof OutcomeMetric)[]).map((metric) => [metric, applyMetricDelta(metric, baseline[metric], rule.deltas[metric])]),
    ),
  } as DecisionCandidate
}

/** Resolved candidates are the single source used by Decision and analysis views. */
export const derivedDecisionCandidates = decisionCandidates.map((candidate) => deriveInterventionCandidate(candidate))

type ScenarioOutcome = Pick<DecisionCandidate, "affectedStudents" | "conflicts" | "recoveryHours" | "stability" | "roomUtilization" | "transportLoad">

const scenarioMechanisms: Record<"power-disruption" | "examination-surge", Record<DecisionCandidate["id"], { mechanism: string; description: string; primaryTradeoff: string }>> = {
  "power-disruption": {
    "do-nothing": { mechanism: "Leaves constrained power capacity in place while the facility cascade propagates.", description: "Allow power-constrained facilities to pass the disruption through the existing schedule.", primaryTradeoff: "Facility cascade and slower recovery" },
    "dynamic-reallocation": { mechanism: "Reassigns power-tolerant classes before constrained facilities create room pressure.", description: "Redistribute compatible classes toward powered capacity before the grid constraint compounds.", primaryTradeoff: "Short-term power-aware scheduling complexity" },
    "temporary-rooms": { mechanism: "Adds short-term powered teaching capacity to absorb displaced classes.", description: "Open reserved powered rooms for the highest-priority classes during the outage window.", primaryTradeoff: "Additional capacity cost with residual room pressure" },
    "hybrid-intervention": { mechanism: "Combines power-aware reassignment with temporary powered capacity for a wider response.", description: "Coordinate reassignment and reserve powered rooms across the affected facilities.", primaryTradeoff: "Highest coordination cost and operational complexity" },
  },
  "examination-surge": {
    "do-nothing": { mechanism: "Allows the examination demand surge to propagate through the existing schedule.", description: "Let the concentrated exam window compete for rooms and faculty time without intervention.", primaryTradeoff: "Peak scheduling pressure and slower recovery" },
    "dynamic-reallocation": { mechanism: "Redistributes compatible exam sessions before room pressure becomes critical.", description: "Reassign compatible assessments across available rooms before the peak window compounds.", primaryTradeoff: "Short-term examination scheduling complexity" },
    "temporary-rooms": { mechanism: "Adds short-term capacity to absorb examination demand.", description: "Open reserve rooms for the highest-priority assessment sessions during the surge.", primaryTradeoff: "Added operating cost with residual capacity pressure" },
    "hybrid-intervention": { mechanism: "Combines session reassignment with temporary rooms for a wider exam response.", description: "Coordinate schedule changes and reserve capacity across the examination window.", primaryTradeoff: "Highest coordination cost and operational complexity" },
  },
}

function scenarioFactor(scenario: Scenario): number {
  const severityFactor = clamp((scenario.severity ?? 72) / 72, 0.2, 1.5)
  const durationFactor = Math.max(0.25, scenario.durationHours / 6)
  const kindFactor = scenario.kind === "power-disruption" ? 0.78 : 0.72
  return severityFactor * durationFactor * kindFactor
}

function scenarioBaseline(scenario: Scenario): ScenarioOutcome {
  const factor = scenarioFactor(scenario)
  const severityFactor = clamp((scenario.severity ?? 72) / 72, 0.2, 1.5)
  const isPower = scenario.kind === "power-disruption"
  const transportBonus = isPower ? Math.round(6 * severityFactor) : Math.round(9 * severityFactor)
  const roomBonus = isPower ? Math.round(6 * severityFactor) : Math.round(8 * severityFactor)
  const affectedStudents = Math.round(4820 * factor)
  const roomUtilization = Math.round(82 + 14 * factor + roomBonus)
  const transportLoad = Math.round(64 + 18 * factor + transportBonus)
  const conflicts = Math.round(affectedStudents / 130)
  const recoveryHours = Math.max(1, Math.round(2 + (scenario.durationHours || 1) + transportBonus / 8))
  const stability = clamp(Math.round(87 - 46 * factor - transportBonus * 0.35 - roomBonus * 0.25), 0, 100)
  return { affectedStudents, conflicts, recoveryHours, stability, roomUtilization, transportLoad }
}

function formatCount(value: number) {
  return value.toLocaleString("en-IN")
}

/**
 * Resolve the three decision futures against the selected scenario. The six
 * original scenarios retain their established controlled candidates; the two
 * added scenarios use the same intervention deltas against a deterministic
 * scenario baseline so their relationships remain visible and repeatable.
 */
export function decisionCandidatesForScenario(scenario: Scenario): DecisionCandidate[] {
  if (scenario.kind !== "power-disruption" && scenario.kind !== "examination-surge") return derivedDecisionCandidates

  const baseline = scenarioBaseline(scenario)
  const reference = derivedDecisionCandidates[0]
  const profile = scenarioMechanisms[scenario.kind]
  return derivedDecisionCandidates.map((candidate) => {
    const mechanism = profile[candidate.id]
    const affectedStudents = Math.round(baseline.affectedStudents * candidate.affectedStudents / reference.affectedStudents)
    const conflicts = Math.round(baseline.conflicts * candidate.conflicts / reference.conflicts)
    const recoveryHours = Math.max(1, Math.round(baseline.recoveryHours * candidate.recoveryHours / reference.recoveryHours))
    const stabilityGainRatio = (candidate.stability - reference.stability) / Math.max(1, 100 - reference.stability)
    const stability = clamp(Math.round(baseline.stability + (100 - baseline.stability) * stabilityGainRatio), 0, 100)
    const roomUtilization = Math.max(0, Math.round(baseline.roomUtilization + candidate.roomUtilization - reference.roomUtilization))
    const transportLoad = Math.max(0, Math.round(baseline.transportLoad + candidate.transportLoad - reference.transportLoad))
    const operationalCost = Math.round(candidate.operationalCost * baseline.affectedStudents / reference.affectedStudents)
    const studentsProtected = Math.max(0, baseline.affectedStudents - affectedStudents)
    const conflictsAvoided = Math.max(0, baseline.conflicts - conflicts)
    return {
      ...candidate,
      ...mechanism,
      affectedStudents,
      conflicts,
      recoveryHours,
      stability,
      roomUtilization,
      transportLoad,
      operationalCost,
      benefits: candidate.id === "do-nothing" ? ["No immediate intervention cost", `${formatCount(affectedStudents)} students remain exposed`] : [`${formatCount(studentsProtected)} students protected`, `${conflictsAvoided} faculty conflicts avoided`],
      tradeoffs: candidate.id === "do-nothing" ? ["No capacity protection", `${recoveryHours}h modeled recovery burden`] : [mechanism.primaryTradeoff, `${formatCount(affectedStudents)} students remain in the projection`],
    }
  })
}
