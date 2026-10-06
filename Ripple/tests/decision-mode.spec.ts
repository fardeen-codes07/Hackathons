import { expect, test, type Page } from "@playwright/test"

async function openDecision(page: Page) {
  await page.goto("/sandbox?view=decision")
  await expect(page.getByTestId("decision-mode")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Explore possible futures before you act." })).toBeVisible()
}

async function completeBranch(page: Page, label: RegExp) {
  await page.getByTestId(/decision-branch-/).getByRole("button", { name: label }).click()
  await page.getByRole("button", { name: "Simulate this future" }).click()
  await expect(page.getByText("SIMULATION RUNNING", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: /Back to decision/ })).toBeVisible({ timeout: 1000 })
  await expect(page.getByTestId(/decision-branch-/).filter({ hasText: /EXPLORED/ }).first()).toBeVisible({ timeout: 5000 })
}

test.describe("RIPPLE Decision Mode", () => {
  test("replaces Executive with a Decision mode while keeping Focus first", async ({ page }) => {
    await page.goto("/sandbox")
    await expect(page.getByRole("link", { name: /^Focus/ })).toBeVisible()
    await expect(page.getByRole("link", { name: /^Decision/ })).toBeVisible()
    await expect(page.getByRole("link", { name: /^Executive/ })).toHaveCount(0)
  })

  test("renders the decision tree and lets a user choose a branch", async ({ page }) => {
    await openDecision(page)
    await expect(page.getByTestId("decision-tree")).toContainText("Do Nothing")
    await expect(page.getByTestId("decision-tree")).toContainText("Dynamic Reallocation")
    await expect(page.getByTestId("decision-tree")).toContainText("Temporary Rooms")
    const branch = page.getByTestId("decision-branch-dynamic-reallocation")
    await branch.getByRole("button", { name: /Dynamic Reallocation future/ }).click()
    await expect(branch).toContainText("CURRENT / READY")
    await expect(page.getByTestId("decision-mechanism")).toContainText("HOW IT WORKS")
    await expect(page.getByTestId("decision-mechanism")).toContainText("Redistributes compatible classes")
    await expect(page.getByRole("button", { name: "Simulate this future" })).toBeVisible()
  })

  test("simulates, backtracks, preserves a branch, and compares sibling futures", async ({ page }) => {
    await openDecision(page)
    await completeBranch(page, /Do Nothing future/)
    await expect(page.getByTestId("decision-branch-do-nothing")).toContainText("41")
    await page.getByRole("button", { name: /Try another path/ }).click()
    await expect(page.getByText("1 of 3 futures explored", { exact: true })).toBeVisible()
    await expect(page.getByTestId("decision-branch-do-nothing")).toContainText("EXPLORED")

    await completeBranch(page, /Dynamic Reallocation future/)
    await expect(page.getByTestId("decision-mechanism")).toContainText("1,180 students affected")
    await expect(page.getByTestId("decision-mechanism")).toContainText("87 stability / 100")
    await expect(page.getByTestId("decision-compare")).toContainText("Different responses. Measurable outcomes.")
    await expect(page.getByTestId("decision-compare")).toContainText("4,820")
    await expect(page.getByTestId("decision-compare")).toContainText("1,180")
    await expect(page.getByTestId("decision-compare")).toContainText("37")
    await expect(page.getByTestId("decision-compare")).toContainText("4")
    await expect(page.getByTestId("decision-recommendation")).toContainText("Dynamic Reallocation")
    await expect(page.getByTestId("decision-recommendation")).toContainText("3,640")
    await expect(page.getByTestId("decision-recommendation")).toContainText("33")
    await expect(page.getByTestId("decision-recommendation")).toContainText("5h")
    await expect(page.getByTestId("decision-why")).toContainText("absorbs the cascade upstream")
  })

  test("allows compare selection, try another path, and reset without stale branches", async ({ page }) => {
    await openDecision(page)
    await completeBranch(page, /Do Nothing future/)
    await page.getByRole("button", { name: /Try another path/ }).click()
    await completeBranch(page, /Dynamic Reallocation future/)
    await page.getByTestId("decision-branch-do-nothing").getByRole("button", { name: "Selected for comparison" }).click()
    await expect(page.getByTestId("decision-compare")).toContainText("Explore one more response")
    await page.getByTestId("decision-branch-do-nothing").getByRole("button", { name: "Add to comparison" }).click()
    await expect(page.getByTestId("decision-compare")).toContainText("Different responses. Measurable outcomes.")
    await page.getByRole("button", { name: "Reset session" }).click()
    await expect(page.getByTestId("decision-recommendation")).toHaveCount(0)
    await expect(page.getByTestId("decision-why")).toHaveCount(0)
    await expect(page.getByTestId("decision-branch-do-nothing")).toContainText("UNEXPLORED")
  })

  test("preserves the decision session when switching to Operations and back", async ({ page }) => {
    await openDecision(page)
    await completeBranch(page, /Dynamic Reallocation future/)
    await page.getByRole("button", { name: "Open Operations" }).click()
    await expect(page).toHaveURL(/view=operations/)
    await expect(page.getByRole("heading", { name: "Campus system" })).toBeVisible()
    await expect(page.getByText("RIPPLE COMPLETE", { exact: false })).toBeVisible()
    await expect(page.locator(".kpi-item").filter({ hasText: "Campus stability" }).getByText("87", { exact: true })).toBeVisible()
    await page.locator('nav[aria-label="RIPPLE view mode"] a[href="/sandbox?view=decision"]').click()
    await expect(page).toHaveURL(/view=decision/)
    await expect(page.getByTestId("decision-branch-dynamic-reallocation")).toContainText("EXPLORED")
  })

  test("supports keyboard branch selection on a mobile-sized viewport", async ({ page }) => {
    await openDecision(page)
    const branch = page.getByTestId("decision-branch-temporary-rooms").getByRole("button", { name: /Temporary Rooms future/ })
    await branch.focus()
    await branch.press("Enter")
    await expect(page.getByRole("button", { name: "Simulate this future" })).toBeVisible()
    const [scrollWidth, viewportWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth)
  })

  test("explores, backtracks, compares, reviews, and resets alternate futures", async ({ page }) => {
    await openDecision(page)
    await completeBranch(page, /Dynamic Reallocation future/)
    await expect(page.getByTestId("decision-history")).toContainText("Explored futures")
    await page.getByRole("button", { name: /Try another path/ }).click()

    await completeBranch(page, /Do Nothing future/)
    await expect(page.getByTestId("decision-compare")).toContainText("Estimated cost")
    await expect(page.getByTestId("decision-compare")).toContainText("₹18K")
    await expect(page.getByTestId("human-review")).toContainText("READY FOR HUMAN REVIEW")

    await page.getByTestId("decision-branch-dynamic-reallocation").getByRole("button", { name: /Dynamic Reallocation future/ }).click()
    await page.getByTestId("human-review").getByRole("button", { name: "Open Operations" }).click()
    await expect(page.getByTestId("selected-future-banner")).toContainText("Dynamic Reallocation")
    await expect(page.getByTestId("selected-future-banner")).toContainText("PROJECTED OUTCOME")

    await page.locator('nav[aria-label="RIPPLE view mode"] a[href="/sandbox?view=decision"]').click()
    await expect(page.getByTestId("decision-history").getByRole("button", { name: /Dynamic Reallocation/ })).toBeVisible()
    await page.getByRole("button", { name: "Reset session" }).click()
    await expect(page.getByTestId("human-review")).toHaveCount(0)
    await expect(page.getByTestId("decision-history")).toContainText("Not explored")
  })

  test("expands a modeled ripple node with its causal evidence", async ({ page }) => {
    await page.goto("/sandbox?view=operations")
    const roomPressure = page.locator(".ripple-node").filter({ hasText: "Room Pressure" }).first()
    await roomPressure.click()
    await expect(roomPressure).toHaveAttribute("aria-expanded", "true")
    await expect(roomPressure).toContainText("WHAT CHANGED / WHY")
    await expect(roomPressure).toContainText("82% baseline")
  })
})
