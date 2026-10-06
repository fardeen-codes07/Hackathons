import { expect, test, type Page } from "@playwright/test"

async function runFocusScenario(page: Page) {
  await page.goto("/sandbox?view=focus")
  await page.getByRole("button", { name: /Building closure/ }).click()
  await expect(page.getByRole("heading", { name: "What do you want to change?" })).toBeVisible()
  await expect(page.getByLabel("Focus duration")).toHaveValue("6")
  await page.getByRole("button", { name: /^Simulate/ }).click()
  await expect(page.getByText("SIMULATION COMPLETE", { exact: false })).toBeVisible({ timeout: 5000 })
}

test.describe("RIPPLE Focus Mode", () => {
  test("opens Focus from the landing page", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: /Experience RIPPLE/ }).click()
    await expect(page).toHaveURL(/\/sandbox(?:\?view=focus)?$/)
    await expect(page.getByRole("heading", { name: "What decision do you want to test?" })).toBeVisible()
  })

  test("selects a real TT Block preset and exposes essential configuration", async ({ page }) => {
    await page.goto("/sandbox?view=focus")
    await page.getByRole("button", { name: /Building closure/ }).click()
    await expect(page.getByRole("heading", { name: "What do you want to change?" })).toBeVisible()
    await expect(page.getByText("CONFIGURE / BUILDING CLOSURE", { exact: true })).toBeVisible()
    await expect(page.getByLabel("Focus building")).toHaveValue("tt-block")
    await expect(page.getByLabel("Focus duration")).toHaveValue("6")
    await expect(page.getByText("Advanced options", { exact: false })).toBeVisible()
  })

  test("keeps configuration targets coherent and returns cleanly to scenario choice", async ({ page }) => {
    await page.goto("/sandbox?view=focus")
    await page.getByRole("button", { name: /Building closure/ }).click()
    await page.getByLabel("Focus building").selectOption("science-court")
    await expect(page.getByTestId("focus-config")).toContainText("Science Court / 6h")
    await expect(page.locator(".focus-footer-disclosure")).toHaveCount(1)
    await page.getByRole("button", { name: /Choose another scenario/ }).click()
    await expect(page.getByRole("heading", { name: "What decision do you want to test?" })).toBeVisible()
    await expect(page.getByTestId("focus-config")).toHaveCount(0)
  })

  test("keeps transport and weather configuration fields scenario-aware", async ({ page }) => {
    await page.goto("/sandbox?view=focus")
    await page.getByRole("button", { name: /Transport disruption/ }).click()
    await expect(page.getByText("CONFIGURE / TRANSPORT", { exact: true })).toBeVisible()
    await expect(page.getByLabel("Focus route")).toHaveText("Shuttle loop")
    await expect(page.getByLabel("Focus building")).toHaveCount(0)
    await expect(page.getByLabel("Focus duration")).toHaveValue("5")
    await expect(page.getByLabel("Focus load / severity")).toHaveValue("64")
    await expect(page.getByTestId("focus-config")).toContainText("Shuttle loop / 5h / 64% severity")

    await page.getByRole("button", { name: /Choose another scenario/ }).click()
    await page.getByRole("button", { name: /Weather event/ }).click()
    await expect(page.getByText("CONFIGURE / WEATHER", { exact: true })).toBeVisible()
    await expect(page.getByLabel("Focus affected area")).toHaveText("North campus routes")
    await expect(page.getByLabel("Focus building")).toHaveCount(0)
    await expect(page.getByLabel("Focus duration")).toHaveValue("8")
    await expect(page.getByLabel("Focus severity")).toHaveValue("55")
    await expect(page.getByTestId("focus-config")).toContainText("North campus routes / 8h / 55% severity")
  })

  test("runs the deterministic Focus result and recommendation", async ({ page }) => {
    await runFocusScenario(page)
    await expect(page.getByText("4,820", { exact: true })).toBeVisible()
    await expect(page.getByText("8h", { exact: true })).toBeVisible()
    await expect(page.locator(".focus-result-primary")).toContainText("41")
    await expect(page.getByRole("heading", { name: "Dynamic Reallocation" })).toBeVisible()
    await expect(page.locator(".focus-score")).toContainText("87")
    await expect(page.locator(".focus-recommendation-stats")).toContainText("3,640")
    await expect(page.locator(".focus-recommendation-stats")).toContainText("33")
    await expect(page.locator(".focus-recommendation-stats")).toContainText("5h")
  })

  test("opens the focused WHY causal explanation", async ({ page }) => {
    await runFocusScenario(page)
    await page.getByRole("button", { name: /Why this decision/ }).click()
    await expect(page.getByRole("heading", { name: "The cascade starts upstream." })).toBeVisible()
    await expect(page.getByText("Classes are displaced", { exact: true })).toBeVisible()
    await expect(page.getByText("INTERVENTION / CASCADE ABSORBED UPSTREAM", { exact: true })).toBeVisible()
  })

  test("opens the focused high-value comparison", async ({ page }) => {
    await runFocusScenario(page)
    await page.getByRole("button", { name: "Compare", exact: true }).click()
    await expect(page.getByRole("heading", { name: "Same disruption. Different outcome." })).toBeVisible()
    await expect(page.getByText("Do Nothing", { exact: true })).toBeVisible()
    await expect(page.getByText("Dynamic Reallocation", { exact: true })).toBeVisible()
    await expect(page.getByText("1,180", { exact: true })).toBeVisible()
    await expect(page.locator(".focus-compare")).toContainText("37")
    await expect(page.locator(".focus-compare")).toContainText("4")
    await expect(page.getByRole("button", { name: /View full comparison/ })).toBeVisible()
  })

  test("explores the existing Operations surface without losing state", async ({ page }) => {
    await runFocusScenario(page)
    await page.getByRole("button", { name: /Explore system/ }).click()
    await expect(page).toHaveURL(/view=operations/)
    await expect(page.getByRole("heading", { name: "Campus system" })).toBeVisible()
    await expect(page.getByText("RIPPLE COMPLETE", { exact: false })).toBeVisible()
    await expect(page.locator(".kpi-item").filter({ hasText: "Campus stability" }).getByText("41", { exact: true })).toBeVisible()
  })

  test("switches to Decision on the same provider", async ({ page }) => {
    await runFocusScenario(page)
    await page.getByRole("button", { name: /Explore decisions/ }).click()
    await expect(page).toHaveURL(/view=decision/)
    await expect(page.getByRole("heading", { name: "Explore possible futures before you act." })).toBeVisible()
    await expect(page.getByTestId("decision-tree")).toBeVisible()
  })

  test("returns to the scenario picker with Try another scenario", async ({ page }) => {
    await runFocusScenario(page)
    await page.getByRole("button", { name: "Try another scenario" }).click()
    await expect(page.getByRole("heading", { name: "What decision do you want to test?" })).toBeVisible()
    await expect(page.getByRole("button", { name: /Transport disruption/ })).toBeVisible()
  })

  test("resets a running Focus presentation without stale output", async ({ page }) => {
    await page.goto("/sandbox?view=focus")
    await page.getByRole("button", { name: /Building closure/ }).click()
    await page.getByRole("button", { name: /^Simulate/ }).click()
    await expect(page.getByRole("button", { name: "Reset simulation" })).toBeVisible()
    await page.getByRole("button", { name: "Reset simulation" }).click()
    await expect(page.getByRole("heading", { name: "What decision do you want to test?" })).toBeVisible()
    await expect(page.getByText("4,820", { exact: true })).not.toBeVisible()
  })

  test("keeps Focus, Decision, and Operations routes responsive and overflow-safe", async ({ page }) => {
    await page.goto("/sandbox?view=focus")
    for (const view of ["focus", "decision", "operations"]) {
      await page.goto(`/sandbox?view=${view}`)
      const [scrollWidth, viewportWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
      expect(scrollWidth).toBeLessThanOrEqual(viewportWidth)
    }
  })

  test("reinitializes directly to the requested view after refresh", async ({ page }) => {
    await page.goto("/sandbox?view=decision")
    await expect(page.getByRole("heading", { name: "Explore possible futures before you act." })).toBeVisible()
    await page.reload()
    await expect(page).toHaveURL(/view=decision/)
    await expect(page.getByRole("heading", { name: "Explore possible futures before you act." })).toBeVisible()
    await expect(page.getByTestId("decision-branch-do-nothing")).toBeVisible()
  })
})
