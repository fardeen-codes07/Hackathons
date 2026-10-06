import { expect, test } from "@playwright/test"

test.describe("RIPPLE Operations header", () => {
  test("keeps header zones separated across supported widths", async ({ page }) => {
    for (const width of [1440, 1280, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto("/sandbox?view=operations")

      const layout = await page.evaluate(() => {
        const selectors = [".sandbox-header .brand-lockup", ".sandbox-header .sandbox-nav", ".sandbox-header .view-switcher", ".sandbox-header .sandbox-header-actions"]
        const boxes = selectors.map((selector) => {
          const element = document.querySelector(selector)
          if (!element) return null
          const rect = element.getBoundingClientRect()
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
        })
        return { boxes, scrollWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth }
      })

      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth)
      expect(layout.boxes.every(Boolean)).toBe(true)

      const boxes = layout.boxes.filter((box): box is NonNullable<typeof box> => Boolean(box))
      for (let index = 0; index < boxes.length; index += 1) {
        for (let nextIndex = index + 1; nextIndex < boxes.length; nextIndex += 1) {
          const first = boxes[index]
          const second = boxes[nextIndex]
          const overlaps = first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top
          expect(overlaps, `header zones overlap at ${width}px`).toBe(false)
        }
      }
    }
  })
})
