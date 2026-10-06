import { expect, test } from "@playwright/test"

test.describe("RIPPLE predictive scenario layer", () => {
  test("shows deterministic expected signals before the Focus run", async ({ page }) => {
    await page.goto("/sandbox?view=focus")
    await page.getByRole("button", { name: /Building closure/ }).click()

    const prediction = page.getByTestId("predicted-ripple")
    await expect(prediction).toBeVisible()
    await expect(prediction).toContainText("Expected signals")
    await expect(prediction).toContainText("Room pressure")
    await expect(prediction).toContainText("96%")
    await expect(prediction).toContainText("Prototype confidence signal")
  })

  test("keeps Operations configuration aligned to non-building scenario semantics", async ({ page }) => {
    await page.goto("/sandbox?view=operations")
    await page.getByRole("button", { name: /Transport Capacity Reduction/ }).click()
    await expect(page.getByTestId("scenario-target-readout")).toContainText("Shuttle loop")
    await expect(page.locator("#scenario-building")).toHaveCount(0)

    await page.getByRole("button", { name: /Heavy Rain Event/ }).click()
    await expect(page.getByTestId("scenario-target-readout")).toContainText("North campus routes")
    await expect(page.locator("#scenario-building")).toHaveCount(0)
    await expect(page.getByTestId("predicted-ripple")).toContainText("Expected signals")
  })

  test("shows honest local neural inference before the causal ripple", async ({ page }) => {
    await page.goto("/sandbox?view=focus")
    await page.getByRole("button", { name: /Building closure/ }).click()
    await page.getByRole("button", { name: /^Simulate/ }).click()
    const stage = page.getByTestId("neural-inference-stage")
    await expect(stage).toBeVisible()
    await expect(stage).toContainText("LOCAL NEURAL MODEL")
    await expect(stage).toContainText("Running neural network inference")
    await expect(stage).toContainText("no training during simulation")
    await expect(page.getByTestId("predicted-ripple")).toContainText("Model confidence")
    await expect(page.getByTestId("predicted-ripple")).toContainText("LOCAL NEURAL MODEL")
  })

  test("shows the completed predictive model trace in Operations and clears it on reset", async ({ page }) => {
    await page.goto("/sandbox?view=operations")
    await page.getByRole("button", { name: /^Simulate/ }).click()
    await expect(page.getByText("RIPPLE COMPLETE", { exact: true })).toBeVisible({ timeout: 5000 })

    const trace = page.getByTestId("predicted-ripple")
    await expect(trace).toContainText("Predicted ripple")
    await expect(trace).toContainText("LOCAL NEURAL MODEL")
    await expect(trace).toContainText("Model confidence")
    await expect(trace.locator(".prediction-signal")).toHaveCount(5)
    await expect(page.getByTestId("neural-inference-stage")).toHaveCount(0)

    const details = trace.locator("details")
    await details.locator("summary").click()
    await expect(details).toContainText("Campus Operational Neural Network v1")
    await expect(details).toContainText("local forward pass")

    await page.getByRole("button", { name: "Reset", exact: true }).click()
    await expect(page.getByText("RIPPLE T+00:00", { exact: true })).toBeVisible()
    await expect(page.getByTestId("selected-future-banner")).toHaveCount(0)
    await expect(trace).toContainText("Expected signals")
    await expect(trace).not.toContainText("Predicted ripple")
  })

  test("integrates power and examination scenarios through configuration, inference, and ripple", async ({ page }) => {
    await page.goto("/sandbox?view=operations")

    for (const scenario of [
      { card: /Power \/ Grid Disruption/, target: "Central power loop", condition: "Power availability constrained" },
      { card: /Examination Period Surge/, target: "Examination period", condition: "Exam demand surge active" },
    ]) {
      await page.getByRole("button", { name: scenario.card }).click()
      await expect(page.getByTestId("scenario-target-readout")).toContainText(scenario.target)
      await expect(page.locator("#scenario-building")).toHaveCount(0)
      await expect(page.getByTestId("predicted-ripple")).toContainText("Expected signals")
      await expect(page.getByText(scenario.condition, { exact: true })).toBeVisible()
      await page.getByRole("button", { name: /^Simulate/ }).click()
      await expect(page.getByText("RIPPLE COMPLETE", { exact: true })).toBeVisible({ timeout: 5000 })
      await expect(page.locator(".event-stream")).toContainText(scenario.condition)
      await expect(page.getByTestId("predicted-ripple")).toContainText("LOCAL NEURAL MODEL")
      await page.getByRole("button", { name: "Reset", exact: true }).click()
      await expect(page.getByText("RIPPLE T+00:00", { exact: true })).toBeVisible()
    }
  })
})
