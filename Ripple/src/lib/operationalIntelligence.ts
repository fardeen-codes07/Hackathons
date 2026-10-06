import { calculateDecisionScore } from "@/engine/decisionScore"
import { decisionCandidatesForScenario, derivedDecisionCandidates } from "@/engine/interventionRules"
import { predictScenario } from "@/engine/predictiveModel"
import { formatCurrency, formatNumber } from "@/lib/format"
import type { CampusState, DecisionCandidate, DecisionSession } from "@/types"

export type OperationalImpact = {
  baseline: DecisionCandidate
  projected: DecisionCandidate
  studentsProtected: number
  conflictsAvoided: number
  recoveryImprovementHours: number
  stabilityDelta: number
}

export type DecisionStatus = "EXPLORING" | "COMPARED" | "RECOMMENDED" | "READY FOR HUMAN REVIEW"

export type DecisionProjection = {
  baseline: DecisionCandidate
  projected: DecisionCandidate
  selected: boolean
}

function candidatesForScenario(scenario?: CampusState["scenario"]) {
  return scenario ? decisionCandidatesForScenario(scenario) : derivedDecisionCandidates
}

export function doNothingCandidate(scenario?: CampusState["scenario"]): DecisionCandidate {
  const candidates = candidatesForScenario(scenario)
  return candidates.find((candidate) => candidate.id === "do-nothing") ?? candidates[0]
}

export function recommendedDecisionCandidate(scenario?: CampusState["scenario"]): DecisionCandidate {
  const candidates = candidatesForScenario(scenario)
  return candidates.reduce((winner, candidate) => calculateDecisionScore(candidate).score > calculateDecisionScore(winner).score ? candidate : winner)
}

export function candidateForBranchId(session: DecisionSession, branchId: string | null, scenario?: CampusState["scenario"]): DecisionCandidate | null {
  if (!branchId) return null
  const branch = session.branches.find((item) => item.id === branchId)
  if (!branch || branch.status !== "complete") return null
  return candidatesForScenario(scenario).find((candidate) => candidate.id === branch.candidateId) ?? null
}

export function decisionProjection(session: DecisionSession, scenario?: CampusState["scenario"]): DecisionProjection {
  const baseline = doNothingCandidate(scenario)
  const selected = candidateForBranchId(session, session.activeBranchId, scenario)
  return {
    baseline,
    projected: selected ?? recommendedDecisionCandidate(scenario),
    selected: Boolean(selected),
  }
}

export function operationalImpactFor(baseline: DecisionCandidate, projected: DecisionCandidate): OperationalImpact {
  return {
    baseline,
    projected,
    studentsProtected: Math.max(0, baseline.affectedStudents - projected.affectedStudents),
    conflictsAvoided: Math.max(0, baseline.conflicts - projected.conflicts),
    recoveryImprovementHours: Math.max(0, baseline.recoveryHours - projected.recoveryHours),
    stabilityDelta: projected.stability - baseline.stability,
  }
}

export function decisionStatusFor(state: CampusState, activeTab: "compare" | "optimize" | "why" | "brief"): DecisionStatus {
  const completedBranches = state.decisionSession.branches.filter((branch) => branch.status === "complete").length
  if (completedBranches >= 2 && activeTab === "compare") return "COMPARED"
  if (completedBranches >= 2) return "READY FOR HUMAN REVIEW"
  if (state.phase === "complete" || completedBranches >= 1) return "RECOMMENDED"
  return "EXPLORING"
}

function timeAfterHours(startTime: string, durationHours: number): string {
  const [hours, minutes] = startTime.split(":").map(Number)
  const totalMinutes = hours * 60 + minutes + durationHours * 60
  return `${String(Math.floor((totalMinutes % (24 * 60)) / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`
}

export type DecisionBriefModel = {
  recommendation: DecisionCandidate
  projection: DecisionProjection
  impact: OperationalImpact
  score: ReturnType<typeof calculateDecisionScore>
  confidence: number
  primaryUncertainty: string
  status: DecisionStatus
  scenarioLabel: string
  scenarioWindow: string
  why: string
  text: string
}

export function buildDecisionBrief(state: CampusState, activeTab: "compare" | "optimize" | "why" | "brief" = "brief"): DecisionBriefModel {
  const recommendation = recommendedDecisionCandidate(state.scenario)
  const projection = decisionProjection(state.decisionSession, state.scenario)
  const impact = operationalImpactFor(projection.baseline, projection.projected)
  const score = calculateDecisionScore(recommendation)
  const prediction = predictScenario(state.scenario)
  const scenarioLabel = state.scenario.label ?? `${state.scenario.targetLabel ?? "Campus"} closure`
  const scenarioWindow = `${state.scenario.startTime}–${timeAfterHours(state.scenario.startTime, state.scenario.durationHours)}`
  const why = `${recommendation.mechanism ?? recommendation.description} This reduces downstream mobility and scheduling pressure before the cascade reaches the stability threshold.`
  const status = decisionStatusFor(state, activeTab)
  const projectionLabel = projection.selected ? "Selected future" : "Recommended future"

  const text = [
    "RIPPLE DECISION BRIEF",
    "",
    `Scenario:\n${scenarioLabel} — ${state.scenario.durationHours} hours (${scenarioWindow})`,
    "",
    `Recommended intervention:\n${recommendation.label}`,
    `Decision score: ${score.score}/100`,
    "",
    `${projectionLabel}:\nCampus stability ${projection.baseline.stability} → ${projection.projected.stability}\nStudents affected ${formatNumber(projection.baseline.affectedStudents)} → ${formatNumber(projection.projected.affectedStudents)}\nFaculty conflicts ${projection.baseline.conflicts} → ${projection.projected.conflicts}\nRecovery ${projection.baseline.recoveryHours}h → ${projection.projected.recoveryHours}h`,
    "",
    `Operational impact:\n${formatNumber(impact.studentsProtected)} students protected\n${impact.conflictsAvoided} conflicts avoided\n${impact.recoveryImprovementHours}h recovery improvement\n${formatCurrency(projection.projected.operationalCost)} estimated operational cost`,
    "",
    `Primary trade-off:\n${recommendation.primaryTradeoff}`,
    "",
    `Analysis confidence:\n${prediction.confidence}%\nPrimary uncertainty: ${prediction.primaryUncertainty}`,
    "",
    `Why:\n${why}`,
    "",
    `Status:\n${status === "READY FOR HUMAN REVIEW" ? "Ready for human review." : `${status.charAt(0)}${status.slice(1).toLowerCase()}.`}`,
    "",
    "Final operational approval remains with the campus operator.",
  ].join("\n")

  return {
    recommendation,
    projection,
    impact,
    score,
    confidence: prediction.confidence,
    primaryUncertainty: prediction.primaryUncertainty,
    status,
    scenarioLabel,
    scenarioWindow,
    why,
    text,
  }
}
