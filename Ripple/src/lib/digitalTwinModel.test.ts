import { describe, expect, it } from "vitest"
import { defaultScenario } from "@/data/mockData"
import { createInitialState, runSimulation } from "@/engine/simulationEngine"
import { buildDigitalTwinModel } from "@/lib/digitalTwinModel"

describe("digital twin network model", () => {
  it("preserves meaningful baseline relationships", () => {
    const state = createInitialState()
    const model = buildDigitalTwinModel({ scenario: state.scenario, metrics: state.metrics, buildings: state.buildings, activeNodeIndex: -1 })

    expect(model.nodes.find((node) => node.id === "building")).toMatchObject({ label: "TT Block", value: "ONLINE", state: "operational" })
    expect(model.nodes.find((node) => node.id === "classes")?.detail).toContain("8 connected classes")
    expect(model.relationships).toContainEqual({ from: "students", to: "movement", label: "redistributes" })
    expect(model.relationships).toContainEqual({ from: "transport", to: "stability", label: "pressures" })
    expect(model.infrastructure).toContain("Core network spine")
  })

  it("maps the active scenario to downstream system states", () => {
    const result = runSimulation(defaultScenario)
    const final = result.snapshots[result.snapshots.length - 1]
    const model = buildDigitalTwinModel({ scenario: result.scenario, metrics: final.metrics, buildings: final.buildings, activeNodeIndex: final.activeNodeIndex })

    expect(model.nodes.find((node) => node.id === "building")).toMatchObject({ label: "TT Block", value: "OFFLINE", state: "offline" })
    expect(model.nodes.find((node) => node.id === "rooms")).toMatchObject({ value: "96% load", state: "warning" })
    expect(model.nodes.find((node) => node.id === "stability")).toMatchObject({ value: "41 / 100", state: "critical" })
  })

  it("preserves derived severity for moderated projected futures", () => {
    const result = runSimulation(defaultScenario)
    const final = result.snapshots[result.snapshots.length - 1]
    const model = buildDigitalTwinModel({
      scenario: result.scenario,
      metrics: { ...final.metrics, roomUtilization: 104, roomPressure: "critical", campusStability: 72 },
      buildings: final.buildings,
      activeNodeIndex: 6,
    })

    expect(model.nodes.find((node) => node.id === "rooms")?.state).toBe("critical")
    expect(model.nodes.find((node) => node.id === "classes")?.state).toBe("affected")
    expect(model.nodes.find((node) => node.id === "students")?.state).toBe("affected")
    expect(model.nodes.find((node) => node.id === "stability")?.state).toBe("operational")
  })
})
