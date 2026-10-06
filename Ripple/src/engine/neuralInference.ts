import modelArtifact from "@/data/neuralModel.json"
import { extractNeuralFeatures, NEURAL_FEATURE_METADATA, NEURAL_TARGET_METADATA, validateNeuralVector } from "@/engine/neuralFeatures"
import type { NeuralInference, NeuralInferenceOutput, PredictiveModelSource, Scenario } from "@/types"

type ModelArtifact = typeof modelArtifact

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value))
}

function finiteVector(values: number[]) {
  return values.every((value) => Number.isFinite(value))
}

function validateArtifact(artifact: ModelArtifact): string | null {
  const layers = artifact.model?.weights
  const biases = artifact.model?.biases
  if (!layers || !biases || layers.length === 0 || layers.length !== biases.length) return "Local neural model layers are incomplete."
  if (artifact.preprocessing.featureMeans.length !== NEURAL_FEATURE_METADATA.length || artifact.preprocessing.featureStds.length !== NEURAL_FEATURE_METADATA.length) return "Local neural model preprocessing metadata is incomplete."
  if (artifact.preprocessing.targetMeans.length !== NEURAL_TARGET_METADATA.length || artifact.preprocessing.targetStds.length !== NEURAL_TARGET_METADATA.length) return "Local neural model target metadata is incomplete."
  let inputSize = NEURAL_FEATURE_METADATA.length
  for (let layerIndex = 0; layerIndex < layers.length; layerIndex += 1) {
    const layer = layers[layerIndex]
    if (layer.length === 0 || layer.some((row) => row.length !== inputSize) || biases[layerIndex].length !== layer.length) return "Local neural model weight shapes are invalid."
    inputSize = layer.length
  }
  if (inputSize !== NEURAL_TARGET_METADATA.length) return "Local neural model output shape is invalid."
  return null
}

function forwardPass(features: number[], artifact: ModelArtifact): number[] {
  let activation = features.map((value, index) => (value - artifact.preprocessing.featureMeans[index]) / artifact.preprocessing.featureStds[index])
  artifact.model.weights.forEach((weights, layerIndex) => {
    const biases = artifact.model.biases[layerIndex]
    const next = weights.map((row, rowIndex) => row.reduce((sum, weight, columnIndex) => sum + weight * activation[columnIndex], biases[rowIndex]))
    activation = layerIndex === artifact.model.weights.length - 1 ? next : next.map((value) => Math.max(0, value))
  })
  return activation.map((value, index) => value * artifact.preprocessing.targetStds[index] + artifact.preprocessing.targetMeans[index])
}

function confidenceFor(features: number[], artifact: ModelArtifact) {
  const normalizedDistance = features.reduce((sum, value, index) => {
    const centered = (value - artifact.preprocessing.featureMeans[index]) / artifact.preprocessing.featureStds[index]
    return sum + Math.min(centered * centered, 16)
  }, 0) / Math.max(features.length, 1)
  const testError = artifact.metrics.test.mae
  const errorPenalty = Math.min(28, testError / 180)
  const coveragePenalty = Math.min(18, normalizedDistance * 5)
  return Math.round(clamp(96 - errorPenalty - coveragePenalty, 55, 94))
}

function modelOutput(values: number[]): NeuralInferenceOutput {
  const ranges = NEURAL_TARGET_METADATA.map((target) => ({ min: target.min, max: target.max }))
  const bounded = values.map((value, index) => clamp(Number.isFinite(value) ? value : 0, ranges[index].min, ranges[index].max))
  return {
    projectedRoomUtilization: bounded[0],
    projectedTransportLoad: bounded[1],
    projectedStudentMovement: bounded[2],
    projectedFacultyConflicts: bounded[3],
    projectedStability: bounded[4],
    projectedRecoveryHours: bounded[5],
  }
}

function fallbackInference(reason: string): NeuralInference {
  return {
    source: "deterministic-fallback",
    modelLabel: "Deterministic predictive model",
    output: {
      projectedRoomUtilization: 0,
      projectedTransportLoad: 0,
      projectedStudentMovement: 0,
      projectedFacultyConflicts: 0,
      projectedStability: 0,
      projectedRecoveryHours: 0,
    },
    confidence: 0,
    confidenceBasis: "Fallback is active because the local model artifact could not be used.",
    latencyMs: 0,
    fallbackReason: reason,
  }
}

export function runNeuralInference(scenario: Scenario, artifact: ModelArtifact | null | undefined = modelArtifact): NeuralInference {
  if (!artifact) return fallbackInference("Local neural model artifact is unavailable.")
  const artifactError = validateArtifact(artifact)
  if (artifactError) return fallbackInference(artifactError)
  const features = extractNeuralFeatures(scenario)
  const validationErrors = validateNeuralVector(features, NEURAL_FEATURE_METADATA)
  if (validationErrors.length > 0) return fallbackInference(validationErrors[0])

  try {
    const rawOutput = forwardPass(features, artifact)
    if (!finiteVector(rawOutput)) return fallbackInference("Model returned a non-finite output.")
    const output = modelOutput(rawOutput)
    return {
      source: "local-neural-network",
      modelLabel: artifact.modelLabel,
      output,
      confidence: confidenceFor(features, artifact),
      confidenceBasis: `Held-out test MAE ${artifact.metrics.test.mae.toFixed(2)} across ${artifact.training.testSamples.toLocaleString("en-IN")} samples; adjusted for input coverage.`,
      // Runtime timing is intentionally excluded from state so repeated runs serialize identically.
      latencyMs: 0,
    }
  } catch (error) {
    return fallbackInference(error instanceof Error ? error.message : "Local neural model execution failed.")
  }
}

export function modelSourceLabel(source: PredictiveModelSource) {
  return source === "local-neural-network" ? "LOCAL NEURAL MODEL" : "DETERMINISTIC FALLBACK"
}
