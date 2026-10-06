import { describe, expect, it } from "vitest"
import { scenarioPresets } from "@/data/mockData"
import { extractNeuralFeatures, NEURAL_FEATURE_METADATA, NEURAL_SCENARIO_KINDS, validateNeuralVector } from "@/engine/neuralFeatures"

describe("local neural feature contract", () => {
  it("encodes the scenario with stable numeric and categorical positions", () => {
    const features = extractNeuralFeatures(scenarioPresets[0].scenario)
    expect(features).toHaveLength(NEURAL_FEATURE_METADATA.length)
    expect(features.slice(14, 19)).toEqual([1, 1, 1, 1, 1])
    expect(features.slice(19, 26)).toEqual([1, 0, 0, 0, 0, 0, 0])
    expect(features.slice(26)).toEqual([100, 0])
    expect(validateNeuralVector(features)).toEqual([])
  })

  it("changes meaningful state features without treating IDs as continuous values", () => {
    const scenario = scenarioPresets.find((preset) => preset.id === "weather-event")?.scenario ?? scenarioPresets[3].scenario
    const baseline = extractNeuralFeatures(scenario)
    const stressed = extractNeuralFeatures(scenario, { activeStudents: 22000, roomUtilization: 91, transportLoad: 81, campusStability: 74 })
    expect(stressed[0]).toBe(22000)
    expect(stressed[1]).toBe(91)
    expect(stressed[3]).toBe(81)
    expect(stressed[4]).toBe(74)
    expect(stressed.slice(19, 26)).toEqual([0, 0, 1, 0, 0, 0, 0])
    expect(NEURAL_SCENARIO_KINDS).toHaveLength(7)
    expect(baseline).not.toEqual(stressed)
  })

  it("encodes power availability and examination demand as semantic inputs", () => {
    const power = extractNeuralFeatures(scenarioPresets.find((preset) => preset.id === "power-grid-disruption")!.scenario)
    const examination = extractNeuralFeatures(scenarioPresets.find((preset) => preset.id === "examination-period-surge")!.scenario)
    expect(power.slice(26)).toEqual([22, 0])
    expect(examination.slice(26)).toEqual([100, 76])
  })

  it("rejects non-finite and out-of-range vectors", () => {
    const features = extractNeuralFeatures(scenarioPresets[0].scenario)
    features[0] = Number.NaN
    features[1] = 101
    expect(validateNeuralVector(features)).toEqual(["active_students is not finite", "room_utilization is outside its supported range"])
  })
})
