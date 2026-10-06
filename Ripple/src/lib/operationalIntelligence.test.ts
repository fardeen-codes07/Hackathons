import { describe, expect, it } from "vitest"
import { derivedDecisionCandidates } from "@/engine/interventionRules"
import { createInitialState } from "@/engine/simulationEngine"
import { backtrackDecision, markDecisionBranchComplete, selectDecisionBranch } from "@/lib/decisionSession"
import { buildDecisionBrief, decisionStatusFor, operationalImpactFor } from "@/lib/operationalIntelligence"

const baseline = derivedDecisionCandidates.find((candidate) => candidate.id === "do-nothing")!
const dynamic = derivedDecisionCandidates.find((candidate) => candidate.id === "dynamic-reallocation")!

describe("operational intelligence view models", () => {
  it("derives Dynamic Reallocation impact from the controlled candidates", () => {
    const impact = operationalImpactFor(baseline, dynamic)

    expect(impact).toMatchObject({
      studentsProtected: 3640,
      conflictsAvoided: 33,
      recoveryImprovementHours: 5,
      stabilityDelta: 46,
    })
    expect(impact.projected.operationalCost).toBe(18000)
  })

  it("maps an active completed branch into the projected future", () => {
    const selected = selectDecisionBranch(createInitialState().decisionSession, "dynamic-reallocation")
    const complete = markDecisionBranchComplete(selected, "decision-dynamic-reallocation")
    const state = { ...createInitialState(), phase: "complete" as const, decisionSession: complete }
    const brief = buildDecisionBrief(state)

    expect(brief.projection).toMatchObject({ selected: true })
    expect(brief.projection.projected.label).toBe("Dynamic Reallocation")
    expect(brief.impact.studentsProtected).toBe(3640)
    expect(brief.text).toContain("Recommended intervention:\nDynamic Reallocation")
    expect(brief.text).toContain("Operational impact:")
    expect(brief.text).toContain("Status:\nRecommended.")
  })

  it("keeps status and brief output deterministic across repeated requests", () => {
    const state = createInitialState()
    const first = buildDecisionBrief(state)
    const second = buildDecisionBrief(state)

    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    expect(decisionStatusFor(state, "brief")).toBe("EXPLORING")

    const firstBranch = markDecisionBranchComplete(selectDecisionBranch(state.decisionSession, "do-nothing"), "decision-do-nothing")
    const secondBranch = markDecisionBranchComplete(selectDecisionBranch(backtrackDecision(firstBranch), "dynamic-reallocation"), "decision-dynamic-reallocation")
    const compared = { ...state, decisionSession: secondBranch }
    expect(decisionStatusFor(compared, "compare")).toBe("COMPARED")
    expect(decisionStatusFor(compared, "brief")).toBe("READY FOR HUMAN REVIEW")
  })
})
