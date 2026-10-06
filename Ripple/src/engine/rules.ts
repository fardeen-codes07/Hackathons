import type { CampusMetrics, Severity } from "@/types"

export const ROOM_UTILIZATION_THRESHOLDS = {
  elevated: 85,
  high: 90,
  critical: 100,
} as const

export const TRANSPORT_LOAD_THRESHOLDS = {
  elevated: 70,
  high: 80,
  critical: 90,
} as const

export const SCENARIO_CALIBRATION = {
  roomUtilizationDeltaAtFullDisplacement: 14,
  facultyLoadDeltaAtFullDisplacement: 17,
  transportLoadDeltaAtFullDisplacement: 18,
  stabilityDeltaAtFullDisplacement: 46,
  conflictScale: 130,
} as const

export function classifyRoomPressure(utilization: number): Severity {
  if (utilization > ROOM_UTILIZATION_THRESHOLDS.critical) return "critical"
  if (utilization >= ROOM_UTILIZATION_THRESHOLDS.high) return "high"
  if (utilization >= ROOM_UTILIZATION_THRESHOLDS.elevated) return "elevated"
  return "normal"
}

export function classifyTransportPressure(load: number): Severity {
  if (load > TRANSPORT_LOAD_THRESHOLDS.critical) return "critical"
  if (load >= TRANSPORT_LOAD_THRESHOLDS.high) return "high"
  if (load >= TRANSPORT_LOAD_THRESHOLDS.elevated) return "elevated"
  return "normal"
}

export function roundMetric(value: number): number {
  return Math.round(value)
}

export function deriveScenarioMetrics(
  baseline: CampusMetrics,
  displacedStudents: number,
  scheduledStudentsInClosedBuilding: number,
): CampusMetrics {
  const displacementRatio = Math.max(displacedStudents / Math.max(scheduledStudentsInClosedBuilding, 1), 0)
  const roomUtilization = roundMetric(
    baseline.roomUtilization + SCENARIO_CALIBRATION.roomUtilizationDeltaAtFullDisplacement * displacementRatio,
  )
  const facultyLoad = roundMetric(
    baseline.facultyLoad + SCENARIO_CALIBRATION.facultyLoadDeltaAtFullDisplacement * displacementRatio,
  )
  const transportLoad = roundMetric(
    baseline.transportLoad + SCENARIO_CALIBRATION.transportLoadDeltaAtFullDisplacement * displacementRatio,
  )
  const campusStability = roundMetric(
    baseline.campusStability - SCENARIO_CALIBRATION.stabilityDeltaAtFullDisplacement * displacementRatio,
  )
  const conflicts = roundMetric(displacedStudents / SCENARIO_CALIBRATION.conflictScale)

  return {
    ...baseline,
    affectedStudents: displacedStudents,
    roomUtilization,
    facultyLoad,
    transportLoad,
    campusStability,
    conflicts,
    roomPressure: classifyRoomPressure(roomUtilization),
    transportPressure: classifyTransportPressure(transportLoad),
  }
}
