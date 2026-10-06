import { expect, test } from "@playwright/test"

async function exploreFuture(page: import("@playwright/test").Page, label: RegExp) {
  await page.getByTestId(/decision-branch-/).getByRole("button", { name: label }).click()
  await page.getByRole("button", { name: "Simulate this future" }).click()
  await expect(page.getByText("SIMULATION RUNNING", { exact: true })).toBeVisible()
  await expect(page.getByTestId(/decision-branch-/).filter({ hasText: /EXPLORED/ }).first()).toBeVisible({ timeout: 5000 })
}

test.describe("RIPPLE Phase 3 operational intelligence", () => {
  test("completes the judge journey through the brief and human handoff", async ({ page }) => {
    await page.goto("/sandbox?view=operations")
    await expect(page.getByText("SIMULATION DATA — REPRESENTATIVE SYNTHETIC MODEL, NOT OFFICIAL OPERATIONAL DATA", { exact: true })).toBeVisible()
    await expect(page.getByTestId("digital-twin-network")).toContainText("What is connected?")
    await page.getByRole("button", { name: /^Simulate/ }).click()
    await expect(page.getByText("RIPPLE COMPLETE", { exact: true })).toBeVisible({ timeout: 5000 })

    await page.locator('nav[aria-label="RIPPLE view mode"] a[href="/sandbox?view=decision"]').click()
    await exploreFuture(page, /Dynamic Reallocation future/)
    await page.getByRole("button", { name: /Try another path/ }).click()
    await exploreFuture(page, /Do Nothing future/)
    await expect(page.getByTestId("human-review")).toContainText("READY FOR HUMAN REVIEW")

    await page.getByTestId("decision-branch-dynamic-reallocation").getByRole("button", { name: /Dynamic Reallocation future/ }).click()
    await page.getByTestId("human-review").getByRole("button", { name: "Open Operations" }).click()
    await expect(page.getByTestId("selected-future-banner")).toContainText("CURRENT BASELINE / DO NOTHING")
    await expect(page.getByTestId("selected-future-banner")).toContainText("PROJECTED OUTCOME")

    await page.getByRole("button", { name: "Brief", exact: true }).click()
    await expect(page.getByTestId("decision-brief")).toContainText("Recommended intervention")
    await expect(page.getByTestId("operational-impact")).toContainText("3,640")
    await expect(page.getByTestId("decision-brief")).toContainText("Final operational approval remains with the campus operator.")

    await page.evaluate(() => {
      const target = window as Window & { __rippleCopied?: string }
      target.__rippleCopied = ""
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value: string) => { target.__rippleCopied = value } } })
    })
    await page.getByRole("button", { name: "Copy brief" }).click()
    await expect(page.getByText("Brief copied to clipboard.", { exact: true })).toBeVisible()
    const copied = await page.evaluate(() => (window as Window & { __rippleCopied?: string }).__rippleCopied ?? "")
    expect(copied).toContain("Scenario:")
    expect(copied).toContain("Recommended intervention:")
    expect(copied).toContain("Operational impact:")
    expect(copied).toContain("Primary trade-off:")
    expect(copied).toContain("Status:")
  })

  test("keeps Digital Twin node selection keyboard-safe on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/sandbox?view=operations")
    const transport = page.getByTestId("digital-twin-node-transport")
    await transport.focus()
    await transport.press("Enter")
    await expect(transport).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByTestId("digital-twin-network")).toContainText("SELECTED ENTITY")
    const [scrollWidth, viewportWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth)
  })
})
