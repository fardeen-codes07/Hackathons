import { describe, expect, it } from "vitest"
import { derivedDecisionCandidates } from "@/engine/interventionRules"
import { applyDecisionResultToMetrics, backtrackDecision, createDecisionSession, markDecisionBranchComplete, markDecisionBranchRunning, selectDecisionBranch, toggleDecisionBranch } from "@/lib/decisionSession"
import { createInitialState } from "@/engine/simulationEngine"

describe("decision session future exploration", () => {
  it("creates the three available futures in a stable order", () => {
    const session = createDecisionSession()

    expect(session.branches.map((branch) => branch.candidateId)).toEqual(["do-nothing", "dynamic-reallocation", "temporary-rooms"])
    expect(session.branches.every((branch) => branch.status === "unexplored")).toBe(true)
    expect(session.selectedBranchIds).toEqual([])
  })

  it("preserves an explored branch while allowing a sibling future", () => {
    let session = selectDecisionBranch(createDecisionSession(), "dynamic-reallocation")
    const dynamicId = session.activeBranchId!
    session = markDecisionBranchRunning(session, dynamicId)
    session = markDecisionBranchComplete(session, dynamicId)

    expect(session.branches.find((branch) => branch.id === dynamicId)?.result).toMatchObject({ affectedStudents: 1180, conflicts: 4, recoveryHours: 3, stability: 87, operationalCost: 18000 })

    session = backtrackDecision(session)
    expect(session.activeBranchId).toBeNull()
    expect(session.branches.find((branch) => branch.id === dynamicId)?.status).toBe("complete")
    expect(session.branches.find((branch) => branch.candidateId === "do-nothing")?.status).toBe("unexplored")

    session = selectDecisionBranch(session, "do-nothing")
    expect(session.branches.find((branch) => branch.id === dynamicId)?.status).toBe("complete")
    expect(session.branches.find((branch) => branch.candidateId === "do-nothing")?.status).toBe("selected")
  })

  it("supports comparison selection without changing branch results", () => {
    let session = createDecisionSession()
    const dynamicId = "decision-dynamic-reallocation"
    const nothingId = "decision-do-nothing"
    session = markDecisionBranchComplete(markDecisionBranchRunning(selectDecisionBranch(session, "dynamic-reallocation"), dynamicId), dynamicId)
    session = backtrackDecision(session)
    session = markDecisionBranchComplete(markDecisionBranchRunning(selectDecisionBranch(session, "do-nothing"), nothingId), nothingId)

    const selected = toggleDecisionBranch(toggleDecisionBranch(session, nothingId), nothingId)
    expect(selected.selectedBranchIds).toEqual([dynamicId, nothingId])
    expect(selected.branches.find((branch) => branch.id === dynamicId)?.result?.stability).toBe(87)
    expect(selected.branches.find((branch) => branch.id === nothingId)?.result?.stability).toBe(41)
  })

  it("applies the selected future to operational metrics", () => {
    const dynamic = derivedDecisionCandidates.find((candidate) => candidate.id === "dynamic-reallocation")!
    const session = markDecisionBranchComplete(markDecisionBranchRunning(selectDecisionBranch(createDecisionSession(), dynamic.id), "decision-dynamic-reallocation"), "decision-dynamic-reallocation")
    const result = session.branches.find((branch) => branch.id === "decision-dynamic-reallocation")!.result!
    const metrics = applyDecisionResultToMetrics(createInitialState().metrics, result)

    expect(metrics).toMatchObject({ campusStability: 87, roomUtilization: 96, transportLoad: 64, estimatedOperationalCost: 18000 })
  })
})
