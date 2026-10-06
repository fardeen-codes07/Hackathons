import { describe, expect, it } from "vitest"
import { scenarioPresets } from "@/data/mockData"
import { predictScenario } from "@/engine/predictiveModel"

describe("deterministic predictive model", () => {
  it("projects the existing TT closure through separate component signals", () => {
    const result = predictScenario(scenarioPresets[0].scenario)

    expect(result.projectedMetrics).toMatchObject({ roomUtilization: 96, affectedStudents: 4820, conflicts: 37, transportLoad: 82, campusStability: 41 })
    expect(result.signals.map((signal) => signal.metric)).toEqual(["room-pressure", "student-movement", "faculty-conflict", "transport-load", "campus-stability"])
    expect(result.signals[0]).toMatchObject({ label: "Room pressure", baseline: 82, projected: 96, delta: 14, unit: "percent", severity: "high" })
    expect(result.signals[1]).toMatchObject({ label: "Student movement", projected: 3952, unit: "students" })
    expect(result.confidence).toBeGreaterThanOrEqual(65)
    expect(result.confidence).toBeLessThanOrEqual(92)
    expect(result.primaryUncertainty).toContain("Transport demand")
  })

  it("remains byte-equivalent for repeated prediction requests", () => {
    const scenario = scenarioPresets.find((preset) => preset.id === "heavy-rain")!.scenario
    expect(JSON.stringify(predictScenario(scenario))).toBe(JSON.stringify(predictScenario(scenario)))
  })

  it("keeps scenario-specific predictions coherent", () => {
    const transport = predictScenario(scenarioPresets.find((preset) => preset.id === "transport-reduction")!.scenario)
    const weather = predictScenario(scenarioPresets.find((preset) => preset.id === "heavy-rain")!.scenario)

    expect(transport.signals.find((signal) => signal.metric === "transport-load")!.projected).toBeGreaterThan(64)
    expect(weather.signals.find((signal) => signal.metric === "student-movement")!.projected).toBeGreaterThan(0)
    expect(transport.signals.find((signal) => signal.metric === "transport-load")!.contributors).toContain("Route capacity")
  })

  it("projects the two added scenarios through the same deterministic signal contract", () => {
    const power = predictScenario(scenarioPresets.find((preset) => preset.id === "power-grid-disruption")!.scenario)
    const examination = predictScenario(scenarioPresets.find((preset) => preset.id === "examination-period-surge")!.scenario)
    expect(power.signals[0].projected).toBeGreaterThan(82)
    expect(power.primaryUncertainty).toContain("Facility availability")
    expect(examination.signals.find((signal) => signal.metric === "faculty-conflict")?.projected).toBeGreaterThan(0)
    expect(examination.primaryUncertainty).toContain("examination window")
  })
})
