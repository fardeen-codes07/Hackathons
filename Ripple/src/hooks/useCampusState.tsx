"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { createInitialState, runSimulation } from "@/engine/simulationEngine"
import { applyDecisionResultToMetrics, backtrackDecision as backtrackDecisionSession, branchIdForCandidate, createDecisionSession as createDecisionSessionForScenario, markDecisionBranchComplete, markDecisionBranchRunning, selectDecisionBranch as selectBranchSession, toggleDecisionBranch as toggleBranchSession } from "@/lib/decisionSession"
import { validateScenario } from "@/lib/scenarioConfiguration"
import type { CampusState, DecisionCandidate, Scenario, SimulationPhase } from "@/types"

type CampusStateContextValue = {
  state: CampusState
  isSimulationRunning: boolean
  selectBuilding: (buildingId: string) => void
  updateScenario: (patch: Partial<Scenario>) => void
  loadScenario: (scenario: Scenario) => void
  simulate: () => void
  pause: () => void
  reset: () => void
  selectDecisionBranch: (candidateId: DecisionCandidate["id"]) => void
  backtrackDecision: () => void
  toggleDecisionBranch: (branchId: string) => void
}

const CampusStateContext = createContext<CampusStateContextValue | null>(null)

type TimerHandle = ReturnType<typeof setTimeout>

export function CampusStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CampusState>(() => createInitialState())
  const timersRef = useRef<TimerHandle[]>([])
  const runTokenRef = useRef(0)
  const phaseRef = useRef<SimulationPhase>("idle")
  const resultRef = useRef<ReturnType<typeof runSimulation> | null>(null)
  const decisionBranchIdRef = useRef<string | null>(null)
  const historyIdRef = useRef(0)
  const historyRecordedRef = useRef(false)

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer))
    timersRef.current = []
  }, [])

  const selectBuilding = useCallback((buildingId: string) => {
    setState((current) => ({ ...current, selectedBuildingId: buildingId }))
  }, [])

  const updateScenario = useCallback((patch: Partial<Scenario>) => {
    const phase = phaseRef.current
    if (phase === "running") return

    if (phase === "complete" || phase === "paused") {
      runTokenRef.current += 1
      clearTimers()
      resultRef.current = null
      decisionBranchIdRef.current = null
      phaseRef.current = "idle"
      setState((current) => {
        const baseline = createInitialState()
        const scenario = { ...baseline.scenario, ...patch }
        return {
          ...baseline,
          selectedBuildingId: current.selectedBuildingId,
          scenarioHistory: current.scenarioHistory,
          scenario,
          decisionSession: createDecisionSessionForScenario(scenario),
        }
      })
      return
    }

    setState((current) => ({
      ...current,
      scenario: { ...current.scenario, ...patch },
      decisionSession: createDecisionSessionForScenario({ ...current.scenario, ...patch }),
    }))
  }, [clearTimers])

  const loadScenario = useCallback((scenario: Scenario) => {
    runTokenRef.current += 1
    clearTimers()
    resultRef.current = null
    decisionBranchIdRef.current = null
    historyRecordedRef.current = false
    phaseRef.current = "idle"
    setState((current) => {
      const baseline = createInitialState()
      const nextScenario = { ...baseline.scenario, ...scenario, affectedSystems: [...(scenario.affectedSystems ?? baseline.scenario.affectedSystems ?? [])] }
      return {
        ...baseline,
        selectedBuildingId: scenario.buildingId,
        scenario: nextScenario,
        decisionSession: createDecisionSessionForScenario(nextScenario),
        scenarioHistory: current.scenarioHistory,
      }
    })
  }, [clearTimers])

  const selectDecisionBranch = useCallback((candidateId: DecisionCandidate["id"]) => {
    if (phaseRef.current === "running") return
    const branchId = branchIdForCandidate(candidateId)
    decisionBranchIdRef.current = branchId
    const branch = state.decisionSession.branches.find((item) => item.id === branchId)
    if (branch?.status === "complete") {
      setState((current) => {
        const nextDecisionSession = selectBranchSession(current.decisionSession, candidateId)
        const selectedResult = nextDecisionSession.branches.find((item) => item.id === branchId)?.result
        return { ...current, metrics: selectedResult ? applyDecisionResultToMetrics(current.metrics, selectedResult) : current.metrics, decisionSession: nextDecisionSession }
      })
      return
    }
    runTokenRef.current += 1
    clearTimers()
    resultRef.current = null
    phaseRef.current = "idle"
    const baseline = createInitialState()
    setState((current) => ({
      ...baseline,
      selectedBuildingId: current.selectedBuildingId,
      scenario: current.scenario,
      scenarioHistory: current.scenarioHistory,
      decisionSession: selectBranchSession(current.decisionSession, candidateId),
    }))
  }, [clearTimers, state.decisionSession])

  const scheduleSnapshots = useCallback((result: ReturnType<typeof runSimulation>, startIndex: number, phase: SimulationPhase = "running", decisionBranchId = decisionBranchIdRef.current) => {
    const token = runTokenRef.current
    clearTimers()
    setState((current) => ({ ...current, phase, snapshots: result.snapshots, events: result.events, decisionSession: decisionBranchId ? markDecisionBranchRunning(current.decisionSession, decisionBranchId) : current.decisionSession }))

    result.snapshots.slice(startIndex).forEach((snapshot, index) => {
      const timer = setTimeout(() => {
        if (token !== runTokenRef.current) return
        const isLast = startIndex + index === result.snapshots.length - 1
        const shouldRecordHistory = isLast && !historyRecordedRef.current
        if (shouldRecordHistory) historyRecordedRef.current = true
        const historyEntry = shouldRecordHistory ? {
          id: `history-${historyIdRef.current++}`,
          scenario: result.scenario,
          completedAt: result.events[result.events.length - 1]?.timeLabel ?? result.scenario.startTime,
          stabilityBefore: result.baseline.metrics.campusStability,
          stabilityAfter: snapshot.metrics.campusStability,
          affectedStudents: snapshot.metrics.affectedStudents,
          recommendedIntervention: "Dynamic Reallocation",
        } : null
        setState((current) => {
          const nextDecisionSession = isLast && decisionBranchId ? markDecisionBranchComplete(current.decisionSession, decisionBranchId, current.scenario) : current.decisionSession
          const branchResult = decisionBranchId ? nextDecisionSession.branches.find((branch) => branch.id === decisionBranchId)?.result : undefined
          const displayedMetrics = branchResult ? applyDecisionResultToMetrics(snapshot.metrics, branchResult) : snapshot.metrics
          const displayedHistoryEntry = historyEntry ? { ...historyEntry, stabilityAfter: displayedMetrics.campusStability, affectedStudents: displayedMetrics.affectedStudents } : null
          return {
            ...current,
            simulationTimeMinutes: snapshot.simulationTimeMinutes,
            buildings: snapshot.buildings,
            metrics: displayedMetrics,
            activeSnapshotIndex: startIndex + index,
            phase: isLast ? "complete" : "running",
            scenarioHistory: displayedHistoryEntry ? [displayedHistoryEntry, ...current.scenarioHistory].slice(0, 8) : current.scenarioHistory,
            decisionSession: nextDecisionSession,
          }
        })
      }, Math.max(80, index * 420))
      timersRef.current.push(timer)
    })
  }, [clearTimers])

  const simulate = useCallback(() => {
    const phase = phaseRef.current
    if (phase === "running" || phase === "complete") return
    if (!validateScenario(state.scenario).valid) return
    if (phase === "paused" && resultRef.current) {
      phaseRef.current = "running"
      scheduleSnapshots(resultRef.current, state.activeSnapshotIndex + 1)
      return
    }

    phaseRef.current = "running"
    runTokenRef.current += 1
    historyRecordedRef.current = false
    const result = runSimulation(state.scenario)
    resultRef.current = result
    setState((current) => ({
      ...current,
      phase: "running",
      simulationTimeMinutes: 0,
      activeSnapshotIndex: 0,
      buildings: result.baseline.buildings,
      metrics: result.baseline.metrics,
      snapshots: result.snapshots,
      events: result.events,
    }))
    scheduleSnapshots(result, 1)
  }, [scheduleSnapshots, state.activeSnapshotIndex, state.scenario])

  const pause = useCallback(() => {
    if (phaseRef.current !== "running") return
    runTokenRef.current += 1
    clearTimers()
    phaseRef.current = "paused"
    setState((current) => ({ ...current, phase: "paused" }))
  }, [clearTimers])

  const backtrackDecision = useCallback(() => {
    runTokenRef.current += 1
    clearTimers()
    resultRef.current = null
    decisionBranchIdRef.current = null
    historyRecordedRef.current = false
    phaseRef.current = "idle"
    setState((current) => {
      const baseline = createInitialState()
      return {
        ...baseline,
        selectedBuildingId: current.selectedBuildingId,
        scenario: current.scenario,
        scenarioHistory: current.scenarioHistory,
        decisionSession: backtrackDecisionSession(current.decisionSession),
      }
    })
  }, [clearTimers])

  const toggleDecisionBranch = useCallback((branchId: string) => {
    setState((current) => ({ ...current, decisionSession: toggleBranchSession(current.decisionSession, branchId) }))
  }, [])

  const reset = useCallback(() => {
    runTokenRef.current += 1
    clearTimers()
    resultRef.current = null
    decisionBranchIdRef.current = null
    phaseRef.current = "idle"
    historyRecordedRef.current = false
    const next = createInitialState()
    setState((current) => ({ ...next, selectedBuildingId: current.selectedBuildingId, scenarioHistory: current.scenarioHistory }))
  }, [clearTimers])

  useEffect(() => () => {
    runTokenRef.current += 1
    clearTimers()
  }, [clearTimers])

  useEffect(() => {
    phaseRef.current = state.phase
  }, [state.phase])

  const value = useMemo(() => ({
    state,
    isSimulationRunning: state.phase === "running",
    selectBuilding,
    updateScenario,
    loadScenario,
    simulate,
    pause,
    reset,
    selectDecisionBranch,
    backtrackDecision,
    toggleDecisionBranch,
  }), [backtrackDecision, loadScenario, pause, reset, selectBuilding, selectDecisionBranch, simulate, state, toggleDecisionBranch, updateScenario])

  return <CampusStateContext.Provider value={value}>{children}</CampusStateContext.Provider>
}

export function useCampusState() {
  const value = useContext(CampusStateContext)
  if (!value) throw new Error("useCampusState must be used within CampusStateProvider")
  return value
}
