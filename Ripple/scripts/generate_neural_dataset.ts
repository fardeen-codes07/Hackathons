import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { baselineMetrics, buildings } from "../src/data/campusData"
import { runSimulation } from "../src/engine/simulationEngine"
import { extractNeuralFeatures, NEURAL_FEATURE_METADATA, NEURAL_TARGET_METADATA, NEURAL_SCENARIO_KINDS, type NeuralStateOverrides } from "../src/engine/neuralFeatures"
import type { AffectedSystem, Scenario, ScenarioKind } from "../src/types"

const SEED = 42017
const SAMPLE_COUNT = 12000
const outputPath = resolve(process.cwd(), "scripts/generated/neural_dataset.json")

function seededRandom(seed: number) {
  let value = seed >>> 0
  return () => {
    value += 0x6D2B79F5
    let result = value
    result = Math.imul(result ^ result >>> 15, result | 1)
    result ^= result + Math.imul(result ^ result >>> 7, result | 61)
    return ((result ^ result >>> 14) >>> 0) / 4294967296
  }
}

function pick<T>(random: () => number, values: readonly T[]) {
  return values[Math.floor(random() * values.length)]
}

function integerBetween(random: () => number, min: number, max: number) {
  return Math.round(min + random() * (max - min))
}

function systemsFor(random: () => number, kind: ScenarioKind): AffectedSystem[] {
  const all: AffectedSystem[] = ["classes", "rooms", "students", "faculty", "transport"]
  const required: AffectedSystem[] = kind === "transport-capacity" ? ["students", "transport"] : kind === "weather-event" ? ["students", "rooms", "transport"] : kind === "network-disruption" ? ["classes", "faculty", "students"] : ["classes", "rooms", "students", "faculty", "transport"]
  return all.filter((system) => required.includes(system) || random() > 0.3)
}

function makeScenario(random: () => number): Scenario {
  const kind = pick(random, NEURAL_SCENARIO_KINDS)
  const buildingId = pick(random, buildings.map((building) => building.id))
  const durationHours = integerBetween(random, 1, 12)
  const startHour = integerBetween(random, 8, 17)
  return {
    buildingId,
    condition: "close",
    durationHours,
    startTime: `${String(startHour).padStart(2, "0")}:00`,
    severity: integerBetween(random, 20, 100),
    affectedSystems: systemsFor(random, kind),
    kind,
  }
}

function makeState(random: () => number): NeuralStateOverrides {
  return {
    activeStudents: integerBetween(random, 15000, 23000),
    roomUtilization: integerBetween(random, 58, 92),
    facultyLoad: integerBetween(random, 48, 84),
    transportLoad: integerBetween(random, 38, 82),
    campusStability: integerBetween(random, 72, 98),
  }
}

function teacherTargets(scenario: Scenario, state: NeuralStateOverrides): number[] {
  const finalMetrics = runSimulation(scenario).snapshots.at(-1)?.metrics ?? baselineMetrics
  const roomShift = ((state.roomUtilization ?? baselineMetrics.roomUtilization) - baselineMetrics.roomUtilization) * 0.42
  const transportShift = ((state.transportLoad ?? baselineMetrics.transportLoad) - baselineMetrics.transportLoad) * 0.38
  const facultyShift = ((state.facultyLoad ?? baselineMetrics.facultyLoad) - baselineMetrics.facultyLoad) * 0.18
  const stabilityShift = ((state.campusStability ?? baselineMetrics.campusStability) - baselineMetrics.campusStability) * 0.45
  const studentsShift = ((state.activeStudents ?? baselineMetrics.activeStudents) - baselineMetrics.activeStudents) * 0.1
  return [
    finalMetrics.roomUtilization + roomShift,
    finalMetrics.transportLoad + transportShift,
    Math.max(0, finalMetrics.affectedStudents * 0.82 + studentsShift),
    Math.max(0, finalMetrics.conflicts + facultyShift),
    Math.max(0, Math.min(100, finalMetrics.campusStability + stabilityShift - roomShift * 0.22 - transportShift * 0.18)),
    Math.max(0, finalMetrics.recoveryHours + Math.max(0, roomShift + transportShift) / 20),
  ]
}

async function main() {
  const random = seededRandom(SEED)
  const samples = Array.from({ length: SAMPLE_COUNT }, () => {
    const scenario = makeScenario(random)
    const state = makeState(random)
    return { features: extractNeuralFeatures(scenario, state), targets: teacherTargets(scenario, state), scenarioKind: scenario.kind }
  })
  const summary = {
    version: "ripple-neural-dataset-v1",
    seed: SEED,
    generatedAt: "deterministic-local-build",
    totalSamples: samples.length,
    featureMetadata: NEURAL_FEATURE_METADATA,
    targetMetadata: NEURAL_TARGET_METADATA,
    scenarioDistribution: Object.fromEntries(NEURAL_SCENARIO_KINDS.map((kind) => [kind, samples.filter((sample) => sample.scenarioKind === kind).length])),
    samples,
  }
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, JSON.stringify(summary))
  process.stdout.write(`Generated ${samples.length} deterministic samples at ${outputPath}\n`)
}

void main()
