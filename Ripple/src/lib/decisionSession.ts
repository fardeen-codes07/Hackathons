import { calculateDecisionScore } from "@/engine/decisionScore"
import { decisionCandidatesForScenario, deriveInterventionCandidate, derivedDecisionCandidates } from "@/engine/interventionRules"
import { defaultScenario } from "@/data/mockData"
import { classifyRoomPressure, classifyTransportPressure } from "@/engine/rules"
import type { CampusMetrics, DecisionBranch, DecisionBranchResult, DecisionCandidate, DecisionSession, Scenario } from "@/types"

export const decisionOptionCandidates = derivedDecisionCandidates.filter((candidate) => ["do-nothing", "dynamic-reallocation", "temporary-rooms"].includes(candidate.id))

export function decisionOptionCandidatesForScenario(scenario: Scenario = defaultScenario): DecisionCandidate[] {
  return decisionCandidatesForScenario(scenario).filter((candidate) => ["do-nothing", "dynamic-reallocation", "temporary-rooms"].includes(candidate.id))
}

const rootId = "scenario-root"

export function branchIdForCandidate(candidateId: DecisionCandidate["id"]): string {
  return `decision-${candidateId}`
}

export function createDecisionSession(scenario: Scenario = defaultScenario): DecisionSession {
  return {
    branches: decisionOptionCandidatesForScenario(scenario).map((candidate): DecisionBranch => ({
      id: branchIdForCandidate(candidate.id),
      parentId: rootId,
      candidateId: candidate.id,
      status: "unexplored",
    })),
    activeBranchId: null,
    selectedBranchIds: [],
  }
}

export function decisionResultForCandidate(candidate: DecisionCandidate, scenario?: Scenario): DecisionBranchResult {
  const resolvedCandidate = scenario ? candidate : deriveInterventionCandidate(candidate)
  const score = calculateDecisionScore(resolvedCandidate)
  return {
    score: score.score,
    subscores: score.subscores,
    affectedStudents: resolvedCandidate.affectedStudents,
    conflicts: resolvedCandidate.conflicts,
    recoveryHours: resolvedCandidate.recoveryHours,
    stability: resolvedCandidate.stability,
    roomUtilization: resolvedCandidate.roomUtilization,
    transportLoad: resolvedCandidate.transportLoad,
    operationalCost: resolvedCandidate.operationalCost,
  }
}

export function applyDecisionResultToMetrics(metrics: CampusMetrics, result: DecisionBranchResult): CampusMetrics {
  return {
    ...metrics,
    affectedStudents: result.affectedStudents,
    conflicts: result.conflicts,
    recoveryHours: result.recoveryHours,
    campusStability: result.stability,
    roomUtilization: result.roomUtilization,
    transportLoad: result.transportLoad,
    transportImpact: result.transportLoad,
    estimatedOperationalCost: result.operationalCost,
    roomPressure: classifyRoomPressure(result.roomUtilization),
    transportPressure: classifyTransportPressure(result.transportLoad),
  }
}

export function selectDecisionBranch(session: DecisionSession, candidateId: DecisionCandidate["id"]): DecisionSession {
  const id = branchIdForCandidate(candidateId)
  return {
    ...session,
    activeBranchId: id,
    branches: session.branches.map((branch) => {
      if (branch.id === id) return branch.status === "complete" ? branch : { ...branch, status: "selected" }
      return branch.status === "selected" || branch.status === "running" ? { ...branch, status: "unexplored" } : branch
    }),
  }
}

export function markDecisionBranchRunning(session: DecisionSession, branchId: string): DecisionSession {
  return {
    ...session,
    activeBranchId: branchId,
    branches: session.branches.map((branch) => branch.id === branchId ? { ...branch, status: "running" } : branch),
  }
}

export function markDecisionBranchComplete(session: DecisionSession, branchId: string, scenario: Scenario = defaultScenario): DecisionSession {
  const branch = session.branches.find((item) => item.id === branchId)
  if (!branch) return session
  const candidate = decisionOptionCandidatesForScenario(scenario).find((item) => item.id === branch.candidateId)
  if (!candidate) return session
  return {
    ...session,
    activeBranchId: branchId,
    selectedBranchIds: session.selectedBranchIds.includes(branchId) ? session.selectedBranchIds : [...session.selectedBranchIds, branchId],
    branches: session.branches.map((item) => item.id === branchId ? { ...item, status: "complete", result: decisionResultForCandidate(candidate, scenario) } : item),
  }
}

export function backtrackDecision(session: DecisionSession): DecisionSession {
  return {
    ...session,
    activeBranchId: null,
    branches: session.branches.map((branch) => branch.status === "selected" || branch.status === "running" ? { ...branch, status: "unexplored" } : branch),
  }
}

export function toggleDecisionBranch(session: DecisionSession, branchId: string): DecisionSession {
  const branch = session.branches.find((item) => item.id === branchId)
  if (!branch || branch.status !== "complete") return session
  const selectedBranchIds = session.selectedBranchIds.includes(branchId)
    ? session.selectedBranchIds.filter((id) => id !== branchId)
    : [...session.selectedBranchIds, branchId]
  return { ...session, selectedBranchIds }
}
