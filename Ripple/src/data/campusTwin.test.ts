import { describe, expect, it } from "vitest"
import { campusTwin, getBuildingTwinSummary } from "@/data/campusTwin"

describe("campus twin seed data", () => {
  it("keeps the synthetic campus population internally coherent", () => {
    expect(campusTwin.studentPopulations.reduce((total, population) => total + population.count, 0)).toBe(18420)
    expect(campusTwin.campus.buildingIds).toHaveLength(5)
    expect(campusTwin.transportRoutes).toHaveLength(3)
    expect(campusTwin.dataSources.every((source) => source.quality >= 0 && source.quality <= 100)).toBe(true)
  })

  it("resolves TT Block relationships from normalized records", () => {
    expect(getBuildingTwinSummary("tt-block")).toMatchObject({ classes: 8, students: 4820, faculty: 112, routes: 1 })
    expect(getBuildingTwinSummary("tt-block").connectedSystems).toContain("Transport")
  })
})
