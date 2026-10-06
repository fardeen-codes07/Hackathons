import { describe, expect, it } from "vitest"
import { scenarioPresets } from "@/data/mockData"
import { focusScenarioConfiguration, scenarioSummary, validateScenario } from "@/lib/scenarioConfiguration"

describe("Focus scenario configuration", () => {
  it("audits every existing preset kind with a coherent target and duration", () => {
    const configurations = scenarioPresets.map((preset) => focusScenarioConfiguration(preset.scenario))

    expect(configurations.map((configuration) => configuration.kind)).toEqual([
      "building-closure",
      "building-closure",
      "transport-capacity",
      "weather-event",
      "campus-event",
      "network-disruption",
      "power-disruption",
      "examination-surge",
    ])

    for (const preset of scenarioPresets) {
      const configuration = focusScenarioConfiguration(preset.scenario)
      expect(configuration.durationOptions).toContain(preset.durationHours)
      expect(preset.scenario.targetLabel).toBeTruthy()
    }
  })

  it("does not expose a building control for non-building scenarios", () => {
    const transport = focusScenarioConfiguration(scenarioPresets.find((preset) => preset.id === "transport-reduction")!.scenario)
    const weather = focusScenarioConfiguration(scenarioPresets.find((preset) => preset.id === "heavy-rain")!.scenario)

    expect(transport).toMatchObject({ heading: "TRANSPORT", targetFieldLabel: "Route", targetMode: "readout", sourceEventLabel: "Transport constraint", severityLabel: "Load / severity", severityMode: "exact" })
    expect(transport.durationOptions).toContain(5)
    expect(weather).toMatchObject({ heading: "WEATHER", targetFieldLabel: "Affected area", targetMode: "readout", sourceEventLabel: "Weather constraint", severityMode: "exact" })
    expect(weather.durationOptions).toContain(8)
  })

  it("gives the new scenarios native controls and causal language", () => {
    const power = focusScenarioConfiguration(scenarioPresets.find((preset) => preset.id === "power-grid-disruption")!.scenario)
    const examination = focusScenarioConfiguration(scenarioPresets.find((preset) => preset.id === "examination-period-surge")!.scenario)

    expect(power).toMatchObject({ heading: "POWER / GRID", targetFieldLabel: "Affected system", targetMode: "readout", durationLabel: "Outage duration", severityLabel: "Grid severity" })
    expect(power.causalSequence[0]).toBe("Power availability constrained")
    expect(examination).toMatchObject({ heading: "EXAMINATION", targetFieldLabel: "Demand window", targetMode: "readout", durationLabel: "Exam window", severityLabel: "Demand intensity" })
    expect(examination.causalSequence[1]).toBe("Exam sessions compete")
  })

  it("keeps building closure configuration on the existing essential controls", () => {
    const closure = focusScenarioConfiguration(scenarioPresets[0].scenario)

    expect(closure).toMatchObject({ heading: "BUILDING CLOSURE", targetFieldLabel: "Building", targetMode: "building", sourceEventLabel: "Building offline", severityMode: "band", advancedExactSeverity: true })
    expect(closure.durationOptions).toEqual([2, 4, 6, 8, 12])
  })

  it("validates scenario inputs and produces a coherent summary", () => {
    const scenario = scenarioPresets.find((preset) => preset.id === "transport-reduction")!.scenario
    expect(validateScenario(scenario)).toEqual({ valid: true, errors: [] })
    expect(scenarioSummary(scenario)).toMatchObject({ title: "Transport Capacity Reduction", target: "Shuttle loop", window: "09:00–14:00" })
  })

  it("rejects impossible or incomplete configurations", () => {
    const result = validateScenario({ buildingId: "", condition: "close", durationHours: 0, startTime: "25:00", severity: 140, affectedSystems: [] })
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(expect.arrayContaining([
      "Choose a target before simulating.",
      "Duration must be between 1 and 24 hours.",
      "Start time must use a valid 24-hour time.",
      "Severity must stay between 0 and 100%.",
      "Select at least one affected system.",
    ]))
  })
})
