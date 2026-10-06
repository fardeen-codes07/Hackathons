import { describe, expect, it } from "vitest"
import { scenarioPresets } from "@/data/mockData"
import { runNeuralInference } from "@/engine/neuralInference"
import modelArtifact from "@/data/neuralModel.json"

const goldenScenario = scenarioPresets[0].scenario

describe("local neural inference", () => {
  it("loads the exported model and returns six bounded operational outputs", () => {
    const result = runNeuralInference(goldenScenario)
    expect(result.source).toBe("local-neural-network")
    expect(result.modelLabel).toContain("Campus Operational Neural Network")
    expect(result.confidence).toBeGreaterThan(50)
    expect(result.output.projectedRoomUtilization).toBeGreaterThanOrEqual(0)
    expect(result.output.projectedRoomUtilization).toBeLessThanOrEqual(130)
    expect(result.output.projectedTransportLoad).toBeGreaterThanOrEqual(0)
    expect(result.output.projectedTransportLoad).toBeLessThanOrEqual(130)
    expect(result.output.projectedStudentMovement).toBeGreaterThanOrEqual(0)
    expect(result.output.projectedStability).toBeGreaterThanOrEqual(0)
    expect(result.output.projectedStability).toBeLessThanOrEqual(100)
  })

  it("is deterministic for identical inputs and separates scenario inputs", () => {
    const first = runNeuralInference(goldenScenario)
    const second = runNeuralInference(goldenScenario)
    const weather = runNeuralInference(scenarioPresets[3].scenario)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    expect(weather.output.projectedStudentMovement).not.toBe(first.output.projectedStudentMovement)
  })

  it("returns an explicit safe fallback when the artifact is unavailable", () => {
    const result = runNeuralInference(goldenScenario, null)
    expect(result.source).toBe("deterministic-fallback")
    expect(result.modelLabel).toBe("Deterministic predictive model")
    expect(result.fallbackReason).toContain("unavailable")
    expect(result.confidence).toBe(0)
  })

  it("runs the actual local model for power and examination scenarios", () => {
    for (const id of ["power-grid-disruption", "examination-period-surge"]) {
      const scenario = scenarioPresets.find((preset) => preset.id === id)!.scenario
      const result = runNeuralInference(scenario)
      expect(result.source).toBe("local-neural-network")
      expect(result.output.projectedRoomUtilization).toBeGreaterThanOrEqual(0)
      expect(result.output.projectedStability).toBeGreaterThanOrEqual(0)
    }
  })

  it("falls back when an artifact has an invalid tensor shape", () => {
    const invalid = { ...modelArtifact, model: { ...modelArtifact.model, weights: [] } }
    const result = runNeuralInference(goldenScenario, invalid)
    expect(result.source).toBe("deterministic-fallback")
    expect(result.fallbackReason).toContain("layers are incomplete")
  })
})
