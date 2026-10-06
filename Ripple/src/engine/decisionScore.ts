import type { DecisionCandidate, DecisionScore } from "@/types"

const WEIGHTS = {
  stability: 0.35,
  capacity: 0.25,
  mobility: 0.15,
  recovery: 0.15,
  conflict: 0.1,
} as const

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

export function calculateDecisionScore(candidate: DecisionCandidate): DecisionScore {
  const subscores = {
    stability: clampScore(candidate.stability),
    capacity: clampScore(100 - Math.max(0, candidate.roomUtilization - 82) * 0.7),
    mobility: clampScore(100 - candidate.transportLoad * 0.25),
    recovery: clampScore(100 - candidate.recoveryHours * 6),
    conflict: clampScore(100 - candidate.conflicts * 1.5),
  }

  const score = Math.round(
    subscores.stability * WEIGHTS.stability +
      subscores.capacity * WEIGHTS.capacity +
      subscores.mobility * WEIGHTS.mobility +
      subscores.recovery * WEIGHTS.recovery +
      subscores.conflict * WEIGHTS.conflict,
  )

  return { score, subscores }
}

export const decisionObjective = [
  { label: "Campus stability", weight: 35 },
  { label: "Capacity", weight: 25 },
  { label: "Mobility", weight: 15 },
  { label: "Recovery", weight: 15 },
  { label: "Conflicts", weight: 10 },
] as const

export const decisionWeights = {
  stability: 35,
  capacity: 25,
  mobility: 15,
  recovery: 15,
  conflict: 10,
} as const
