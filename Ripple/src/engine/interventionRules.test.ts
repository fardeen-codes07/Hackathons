import { describe, expect, it } from "vitest"
import { decisionCandidates, scenarioPresets } from "@/data/mockData"
import { classifyRoomPressure, classifyTransportPressure } from "@/engine/rules"
import { decisionCandidatesForScenario, deriveInterventionCandidate, derivedDecisionCandidates, interventionRules } from "@/engine/interventionRules"
import { decisionOptionCandidates, decisionResultForCandidate } from "@/lib/decisionSession"

describe("deterministic intervention rules", () => {
  it("defines an explicit mechanism for every intervention candidate", () => {
    for (const candidate of decisionCandidates) {
      expect(interventionRules[candidate.id].mechanism).toBeTruthy()
      expect(deriveInterventionCandidate(candidate).mechanism).toBe(interventionRules[candidate.id].mechanism)
    }
  })

  it("selects the three supported decision branches in stable order", () => {
    expect(decisionOptionCandidates.map((candidate) => candidate.id)).toEqual([
      "do-nothing",
      "dynamic-reallocation",
      "temporary-rooms",
    ])
  })

  it("preserves the Dynamic Reallocation regression values", () => {
    const dynamic = derivedDecisionCandidates.find((candidate) => candidate.id === "dynamic-reallocation")!
    expect(dynamic).toMatchObject({ affectedStudents: 1180, conflicts: 4, recoveryHours: 3, stability: 87, roomUtilization: 96, transportLoad: 64 })
    expect(decisionResultForCandidate(dynamic)).toMatchObject({ score: 87, affectedStudents: 1180, conflicts: 4, recoveryHours: 3, stability: 87 })
  })

  it("keeps intervention relationships coherent with centralized thresholds", () => {
    const nothing = derivedDecisionCandidates.find((candidate) => candidate.id === "do-nothing")!
    const dynamic = derivedDecisionCandidates.find((candidate) => candidate.id === "dynamic-reallocation")!
    const rooms = derivedDecisionCandidates.find((candidate) => candidate.id === "temporary-rooms")!

    expect(dynamic.affectedStudents).toBeLessThan(rooms.affectedStudents)
    expect(rooms.affectedStudents).toBeLessThan(nothing.affectedStudents)
    expect(dynamic.conflicts).toBeLessThan(rooms.conflicts)
    expect(rooms.conflicts).toBeLessThan(nothing.conflicts)
    expect(dynamic.stability).toBeGreaterThan(rooms.stability)
    expect(rooms.stability).toBeGreaterThan(nothing.stability)
    expect(classifyRoomPressure(dynamic.roomUtilization)).toBe("high")
    expect(classifyRoomPressure(rooms.roomUtilization)).toBe("critical")
    expect(classifyTransportPressure(dynamic.transportLoad)).toBe("normal")
    expect(classifyTransportPressure(rooms.transportLoad)).toBe("elevated")
  })

  it("returns byte-equivalent results for repeated rule evaluation", () => {
    const first = derivedDecisionCandidates.map((candidate) => decisionResultForCandidate(candidate))
    const second = derivedDecisionCandidates.map((candidate) => decisionResultForCandidate(candidate))
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })

  it("derives scenario-specific futures while preserving intervention ordering", () => {
    for (const id of ["power-grid-disruption", "examination-period-surge"]) {
      const scenario = scenarioPresets.find((preset) => preset.id === id)!.scenario
      const first = decisionCandidatesForScenario(scenario)
      const second = decisionCandidatesForScenario(scenario)
      expect(JSON.stringify(first)).toBe(JSON.stringify(second))
      const nothing = first.find((candidate) => candidate.id === "do-nothing")!
      const dynamic = first.find((candidate) => candidate.id === "dynamic-reallocation")!
      const rooms = first.find((candidate) => candidate.id === "temporary-rooms")!
      expect(dynamic.affectedStudents).toBeLessThan(rooms.affectedStudents)
      expect(rooms.affectedStudents).toBeLessThan(nothing.affectedStudents)
      expect(dynamic.stability).toBeGreaterThan(rooms.stability)
      expect(dynamic.mechanism?.toLowerCase()).toContain(id === "power-grid-disruption" ? "power" : "exam")
    }
  })
})
