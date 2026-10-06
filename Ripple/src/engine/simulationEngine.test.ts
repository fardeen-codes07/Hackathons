import { describe, expect, it } from "vitest"
import { createInitialState, runSimulation } from "@/engine/simulationEngine"
import { calculateDecisionScore } from "@/engine/decisionScore"
import { decisionCandidates, scenarioPresets } from "@/data/mockData"

describe("RIPPLE simulation engine", () => {
  it("creates a clean deterministic baseline", () => {
    const state = createInitialState()
    expect(state.phase).toBe("idle")
    expect(state.metrics).toMatchObject({ roomUtilization: 82, transportLoad: 64, campusStability: 87 })
    expect(state.scenario).toMatchObject({ buildingId: "tt-block", durationHours: 6, startTime: "10:00" })
  })

  it("propagates TT Block closure through the causal chain", () => {
    const result = runSimulation({ buildingId: "tt-block", condition: "close", durationHours: 6, startTime: "10:00" })
    const final = result.snapshots[result.snapshots.length - 1]
    expect(final.metrics).toMatchObject({
      affectedStudents: 4820,
      roomUtilization: 96,
      facultyLoad: 85,
      transportLoad: 82,
      campusStability: 41,
      conflicts: 37,
      recoveryHours: 8,
    })
    expect(final.buildings.find((building) => building.id === "tt-block")?.status).toBe("offline")
    expect(result.events).toHaveLength(7)
  })

  it("produces byte-equivalent output for repeated runs", () => {
    const scenario = { buildingId: "tt-block", condition: "close" as const, durationHours: 6, startTime: "10:00" }
    expect(JSON.stringify(runSimulation(scenario))).toBe(JSON.stringify(runSimulation(scenario)))
  })

  it("derives a higher objective score for dynamic reallocation", () => {
    const nothing = calculateDecisionScore(decisionCandidates[0])
    const dynamic = calculateDecisionScore(decisionCandidates[1])
    expect(dynamic.score).toBe(87)
    expect(dynamic.score).toBeGreaterThan(nothing.score)
    expect(dynamic.score).toBeGreaterThan(calculateDecisionScore(decisionCandidates[3]).score)
  })

  it("changes alternate futures through deterministic scenario inputs", () => {
    const twoHour = runSimulation({ ...scenarioPresets[0].scenario, durationHours: 2 }).snapshots.at(-1)
    const twelveHour = runSimulation({ ...scenarioPresets[0].scenario, durationHours: 12 }).snapshots.at(-1)
    expect(twoHour?.metrics.campusStability).toBeGreaterThan(twelveHour?.metrics.campusStability ?? 0)
    expect(twoHour?.metrics.affectedStudents).toBeLessThan(twelveHour?.metrics.affectedStudents ?? 0)
    expect(JSON.stringify(runSimulation(scenarioPresets[2].scenario))).toBe(JSON.stringify(runSimulation(scenarioPresets[2].scenario)))
  })

  it("supports every scenario preset without falling back to random data", () => {
    for (const preset of scenarioPresets) {
      const result = runSimulation(preset.scenario)
      expect(result.events).toHaveLength(7)
      expect(result.scenario.presetId).toBe(preset.id)
      expect(result.snapshots.at(-1)?.metrics.campusStability).toBeGreaterThanOrEqual(0)
    }
  })

  it("uses scenario-native event narratives for power and examination demand", () => {
    const power = runSimulation(scenarioPresets.find((preset) => preset.id === "power-grid-disruption")!.scenario)
    const examination = runSimulation(scenarioPresets.find((preset) => preset.id === "examination-period-surge")!.scenario)
    expect(power.events.map((event) => event.title)).toEqual(expect.arrayContaining(["Power availability constrained", "Facility capacity degraded"]))
    expect(examination.events.map((event) => event.title)).toEqual(expect.arrayContaining(["Exam demand surge active", "Exam sessions competing"]))
    expect(power.snapshots.at(-1)?.metrics.transportLoad).toBeGreaterThan(64)
    expect(examination.snapshots.at(-1)?.metrics.roomUtilization).toBeGreaterThan(82)
  })
})
