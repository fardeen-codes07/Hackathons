import { baselineMetrics } from "@/data/campusData"
import { campusTwin } from "@/data/campusTwin"
import { runSimulation } from "@/engine/simulationEngine"
import { runNeuralInference } from "@/engine/neuralInference"
import { classifyRoomPressure, classifyTransportPressure } from "@/engine/rules"
import type { PredictiveResult, PredictiveSignal, Scenario } from "@/types"

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value))

function directionFor(baseline: number, projected: number) {
  if (projected > baseline) return "up" as const
  if (projected < baseline) return "down" as const
  return "stable" as const
}

function confidenceFor(scenario: Scenario): number {
  const applicableSources = scenario.kind === "transport-capacity"
    ? ["student-mobility", "transport", "academic-scheduling"]
    : scenario.kind === "weather-event"
      ? ["student-mobility", "transport", "weather"]
      : scenario.kind === "power-disruption"
        ? ["facilities", "room-occupancy", "academic-scheduling", "transport"]
        : scenario.kind === "examination-surge"
          ? ["academic-scheduling", "room-occupancy", "faculty-allocation", "student-mobility", "events"]
      : ["academic-scheduling", "room-occupancy", "student-mobility", "faculty-allocation", "transport"]
  const sources = campusTwin.dataSources.filter((source) => applicableSources.includes(source.id))
  const averageQuality = sources.reduce((total, source) => total + source.quality, 0) / Math.max(sources.length, 1)
  const horizonAdjustment = Math.round(Math.abs(scenario.durationHours - 6) * 0.5)
  return clamp(Math.round(averageQuality - 5 - horizonAdjustment), 65, 92)
}

function signal(
  metric: PredictiveSignal["metric"],
  label: string,
  baseline: number,
  projected: number,
  unit: PredictiveSignal["unit"],
  severity: PredictiveSignal["severity"],
  confidence: number,
  contributors: string[],
  horizon: string,
): PredictiveSignal {
  return {
    metric,
    label,
    baseline,
    projected,
    delta: projected - baseline,
    unit,
    direction: directionFor(baseline, projected),
    severity,
    confidence,
    contributors,
    horizon,
  }
}

/**
 * Predictive simulation is intentionally separate from decision ranking.
 * It keeps the deterministic preview and causal projection alongside the
 * exported local neural component model; neither path selects an intervention.
 */
export function predictScenario(scenario: Scenario): PredictiveResult {
  const projection = runSimulation(scenario)
  const projectedMetrics = projection.snapshots[projection.snapshots.length - 1]?.metrics ?? baselineMetrics
  const studentMovement = Math.round(projectedMetrics.affectedStudents * 0.82)
  const inference = runNeuralInference(scenario)
  const neuralOutput = inference.source === "local-neural-network" ? inference.output : {
    projectedRoomUtilization: projectedMetrics.roomUtilization,
    projectedTransportLoad: projectedMetrics.transportLoad,
    projectedStudentMovement: studentMovement,
    projectedFacultyConflicts: projectedMetrics.conflicts,
    projectedStability: projectedMetrics.campusStability,
    projectedRecoveryHours: projectedMetrics.recoveryHours,
  }
  const confidence = confidenceFor(scenario)
  const horizon = `${scenario.durationHours}h scenario window`

  const signals = [
    signal("room-pressure", "Room pressure", baselineMetrics.roomUtilization, projectedMetrics.roomUtilization, "percent", classifyRoomPressure(projectedMetrics.roomUtilization), confidence, ["Displaced classes", "Room compatibility", "Timetable density"], horizon),
    signal("student-movement", "Student movement", 0, studentMovement, "students", studentMovement > 3000 ? "elevated" : studentMovement > 0 ? "normal" : "normal", confidence, ["Affected student count", "Connected campus zones", "Route topology"], horizon),
    signal("faculty-conflict", "Faculty conflicts", 0, projectedMetrics.conflicts, "conflicts", projectedMetrics.conflicts >= 30 ? "high" : projectedMetrics.conflicts > 0 ? "elevated" : "normal", confidence, ["Displaced classes", "Faculty allocations", "Time-window overlap"], horizon),
    signal("transport-load", "Transport load", baselineMetrics.transportLoad, projectedMetrics.transportLoad, "percent", classifyTransportPressure(projectedMetrics.transportLoad), confidence, ["Student movement", "Route capacity", "Peak-time demand"], horizon),
    signal("campus-stability", "Campus stability", baselineMetrics.campusStability, projectedMetrics.campusStability, "percent", projectedMetrics.campusStability < 60 ? "critical" : projectedMetrics.campusStability < baselineMetrics.campusStability ? "elevated" : "normal", confidence, ["Room pressure", "Faculty conflicts", "Transport load"], horizon),
  ]

  const neuralSignals = [
    signal("room-pressure", "Room pressure", baselineMetrics.roomUtilization, neuralOutput.projectedRoomUtilization, "percent", classifyRoomPressure(neuralOutput.projectedRoomUtilization), inference.confidence, ["Displaced classes", "Room compatibility", "Timetable density"], horizon),
    signal("student-movement", "Student movement", 0, Math.round(neuralOutput.projectedStudentMovement), "students", neuralOutput.projectedStudentMovement > 3000 ? "elevated" : "normal", inference.confidence, ["Affected student count", "Connected campus zones", "Route topology"], horizon),
    signal("faculty-conflict", "Faculty conflicts", 0, Math.round(neuralOutput.projectedFacultyConflicts), "conflicts", neuralOutput.projectedFacultyConflicts >= 30 ? "high" : neuralOutput.projectedFacultyConflicts > 0 ? "elevated" : "normal", inference.confidence, ["Displaced classes", "Faculty allocations", "Time-window overlap"], horizon),
    signal("transport-load", "Transport load", baselineMetrics.transportLoad, neuralOutput.projectedTransportLoad, "percent", classifyTransportPressure(neuralOutput.projectedTransportLoad), inference.confidence, ["Student movement", "Route capacity", "Peak-time demand"], horizon),
    signal("campus-stability", "Campus stability", baselineMetrics.campusStability, neuralOutput.projectedStability, "percent", neuralOutput.projectedStability < 60 ? "critical" : neuralOutput.projectedStability < baselineMetrics.campusStability ? "elevated" : "normal", inference.confidence, ["Room pressure", "Faculty conflicts", "Transport load"], horizon),
  ]

  return {
    signals,
    neuralSignals,
    confidence,
    primaryUncertainty: scenario.kind === "weather-event" ? "Route availability during peak rain movement" : scenario.kind === "power-disruption" ? "Facility availability while the grid constraint persists" : scenario.kind === "examination-surge" ? "Assessment room demand during the peak examination window" : "Transport demand during peak movement",
    projectedMetrics: {
      roomUtilization: projectedMetrics.roomUtilization,
      affectedStudents: projectedMetrics.affectedStudents,
      conflicts: projectedMetrics.conflicts,
      transportLoad: projectedMetrics.transportLoad,
      campusStability: projectedMetrics.campusStability,
    },
    inferenceProjectedMetrics: {
      roomUtilization: Math.round(neuralOutput.projectedRoomUtilization),
      affectedStudents: Math.round(neuralOutput.projectedStudentMovement / 0.82),
      conflicts: Math.round(neuralOutput.projectedFacultyConflicts),
      transportLoad: Math.round(neuralOutput.projectedTransportLoad),
      campusStability: Math.round(neuralOutput.projectedStability),
    },
    inference,
  }
}
