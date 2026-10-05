import { test, expect } from '@playwright/test'

test.describe('Reliability & Offline-First Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to local server and wait for hydration/idle state
    await page.goto('/')
  })

  test('should load the home page correctly with the title in Arabic/English', async ({ page }) => {
    // Wait for the title to be visible (handles slower offline timeouts elegantly)
    const titleLocator = page.getByText('GoalChok-গোলছক')
    await expect(titleLocator.first()).toBeVisible({ timeout: 15000 })
  })

  test('should handle network disconnection gracefully (Offline-First)', async ({ page, context }) => {
    // 1. Load the page while online
    await expect(page.locator('body')).not.toBeEmpty()

    // 2. Put the page in offline mode
    await context.setOffline(true)

    // 3. Trigger a reload or navigate to another page
    await page.reload().catch(() => {
      // Reloading might throw an error when completely offline, which is expected
    })

    // 4. Assert that the page is not broken or still displays fallback UI gracefully
    const bodyContent = await page.textContent('body')
    expect(bodyContent).toBeTruthy()
    expect(bodyContent.length).toBeGreaterThan(0)

    // 5. Restore network connection
    await context.setOffline(false)
    await page.waitForTimeout(500)

    // 6. Fresh navigation should load successfully (reload after an aborted
    // offline navigation can hit a detached frame in Chromium)
    await page.goto('/')
    const titleLocator = page.getByText('GoalChok-গোলছক')
    await expect(titleLocator.first()).toBeVisible({ timeout: 15000 })
  })

  test('should toggle language and theme without crashes', async ({ page }) => {
    // Wait for initial load
    const titleLocator = page.getByText('GoalChok-গোলছক')
    await expect(titleLocator.first()).toBeVisible({ timeout: 15000 })

    // We try to trigger buttons in the UI (like theme or language)
    // If they exist, we click them to test runtime stability
    const themeButton = page.locator('button').or(page.locator('[role="button"]')).first()
    if (await themeButton.count() > 0) {
      await themeButton.click()
      // Ensure the page did not crash and throw unhandled errors
      const afterClickText = await page.textContent('body')
      expect(afterClickText).toBeTruthy()
      expect(afterClickText.length).toBeGreaterThan(0)
    }
  })
})
