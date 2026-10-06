import { expect, test, type Page } from "@playwright/test"

function guidedDialog(page: Page) {
  return page.getByRole("dialog")
}

async function runGuidedJourney(page: Page, entry: "landing" | "direct") {
  if (entry === "landing") {
    await page.goto("/")
    await page.getByRole("link", { name: /Guided demo/ }).click()
    await expect(page).toHaveURL(/\/sandbox\?guide=1/)
  } else {
    await page.goto("/sandbox?guide=1")
  }

  const dialog = guidedDialog(page)
  await expect(dialog).toHaveAttribute("data-step", "1")
  await expect(dialog).toContainText("Let’s simulate a campus disruption")
  await dialog.getByRole("button", { name: /Begin demo/ }).click()
  await expect(dialog).toHaveAttribute("data-step", "2")

  const ttBuilding = page.getByRole("button", { name: /Select TT Block/ })
  await ttBuilding.focus()
  await ttBuilding.press("Enter")
  await expect(dialog).toHaveAttribute("data-step", "3")
  await expect(page.getByRole("button", { name: /Select TT Block, selected/ })).toHaveAttribute("aria-pressed", "true")

  await page.getByLabel("Duration", { exact: true }).selectOption("6")
  await expect(dialog).toHaveAttribute("data-step", "4")
  await expect(page.getByLabel("Duration", { exact: true })).toHaveValue("6")

  await page.getByRole("button", { name: "Simulate →" }).click()
  await expect(page.locator(".live-status")).toHaveText(/RIPPLE RUNNING/, { timeout: 1000 })
  await expect(dialog).toHaveAttribute("data-step", "4")
  await expect(page.getByText("RIPPLE COMPLETE", { exact: true })).toBeVisible({ timeout: 5000 })
  await expect(dialog).toHaveAttribute("data-step", "5")
  await expect(page.locator("#ripple")).toContainText("Cascade state / complete")
  for (const node of ["Building Failure", "Class Displacement", "Room Pressure", "Student Movement", "Faculty Conflict", "Transport Load", "Campus Stability"]) {
    await expect(page.locator("#ripple")).toContainText(node)
  }
  await expect(page.locator(".kpi-item").filter({ hasText: "Campus stability" }).getByText("41", { exact: true })).toBeVisible()
  await expect(page.locator(".kpi-item").filter({ hasText: "Room utilization" }).getByText("96%", { exact: true })).toBeVisible()
  await expect(page.getByText("4,820", { exact: true }).first()).toBeVisible()

  await dialog.getByRole("button", { name: /Open Compare/ }).click()
  await expect(dialog).toHaveAttribute("data-step", "6")
  await expect(page.getByRole("tab", { name: "COMPARE" })).toHaveAttribute("aria-selected", "true")
  await expect(page.locator("#decision")).toBeInViewport()
  await expect(page.getByText("Do Nothing", { exact: true })).toBeVisible()
  await expect(page.getByText("Dynamic Reallocation", { exact: true }).first()).toBeVisible()
  await expect(page.locator(".intervention-table")).toContainText("4,820")
  await expect(page.locator(".intervention-table")).toContainText("1,180")
  await expect(page.locator(".intervention-table")).toContainText("37")
  await expect(page.locator(".intervention-table")).toContainText("4")

  await dialog.getByRole("button", { name: /Open Optimize/ }).click()
  await expect(dialog).toHaveAttribute("data-step", "7")
  await expect(page.getByRole("tab", { name: "OPTIMIZE" })).toHaveAttribute("aria-selected", "true")
  await expect(page.getByRole("heading", { name: /Dynamic Reallocation/ })).toBeVisible()
  await expect(page.getByText("Decision score", { exact: true })).toBeVisible()
  await expect(page.getByText("87", { exact: true }).last()).toBeVisible()

  await dialog.getByRole("button", { name: /Open WHY/ }).click()
  await expect(dialog).toHaveAttribute("data-step", "8")
  await expect(page.getByRole("tab", { name: "WHY?" })).toHaveAttribute("aria-selected", "true")
  await expect(page.getByRole("heading", { name: "Why this decision?" })).toBeVisible()
  await expect(page.getByText(/Student movement adds transport load/)).toBeVisible()

  await dialog.getByRole("button", { name: /Finish demo/ }).click()
  await expect(dialog).toHaveAttribute("data-step", "complete")
  await expect(dialog).toContainText("You just ran your first ripple")
  await expect(dialog).toContainText("TT Block")
  await expect(dialog).toContainText("6-hour closure")
  await expect(dialog).toContainText("Students affected")
  await expect(dialog).toContainText("4,820")
  await expect(dialog).toContainText("Faculty conflicts")
  await expect(dialog).toContainText("37")

  await dialog.getByRole("button", { name: /Explore freely/ }).click()
  await expect(page).toHaveURL(/\/sandbox$/)
  await expect(page.getByTestId("guided-demo")).toHaveCount(0)
}

test.describe("RIPPLE Guided Demo", () => {
  test("runs the complete journey from the landing-page entry", async ({ page }) => {
    await runGuidedJourney(page, "landing")
  })

  test("runs the complete journey from the direct URL", async ({ page }) => {
    await runGuidedJourney(page, "direct")
  })

  test("can exit early, in the middle, and after completion", async ({ page }) => {
    await page.goto("/sandbox?guide=1")
    const dialog = guidedDialog(page)
    await dialog.getByRole("button", { name: "EXIT GUIDED DEMO" }).click()
    await expect(page).toHaveURL(/\/sandbox$/)
    await expect(page.getByTestId("guided-demo")).toHaveCount(0)

    await page.goto("/sandbox?guide=1")
    await dialog.getByRole("button", { name: /Begin demo/ }).click()
    await page.getByRole("button", { name: /Select TT Block/ }).click()
    await expect(dialog).toContainText("Set the duration")
    await dialog.getByRole("button", { name: "EXIT GUIDED DEMO" }).click()
    await expect(page).toHaveURL(/\/sandbox$/)
    await expect(page.getByTestId("guided-demo")).toHaveCount(0)

    await runGuidedJourney(page, "direct")
    await page.goto("/sandbox?guide=1")
    await expect(guidedDialog(page)).toHaveAttribute("data-step", "1")
  })

  test("resets to the intro state after a refresh", async ({ page }) => {
    await page.goto("/sandbox?guide=1")
    const dialog = guidedDialog(page)
    await dialog.getByRole("button", { name: /Begin demo/ }).click()
    await page.getByRole("button", { name: /Select TT Block/ }).press("Enter")
    await expect(dialog).toHaveAttribute("data-step", "3")
    await page.getByRole("tab", { name: "WHY?" }).click()
    await page.reload()
    await expect(guidedDialog(page)).toHaveAttribute("data-step", "1")
    await expect(page.getByRole("tab", { name: "COMPARE" })).toHaveAttribute("aria-selected", "true")
  })

  test("keeps the complete journey usable on a mobile viewport", async ({ page }) => {
    await page.goto("/sandbox?guide=1")
    const dialog = guidedDialog(page)
    await expect(dialog).toBeVisible()
    await expect(page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).resolves.toBe(true)
    await runGuidedJourney(page, "direct")
  })
})
