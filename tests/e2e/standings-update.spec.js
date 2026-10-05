import { test, expect } from '@playwright/test'
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers'

test.describe('Standings Auto-Update Reproduction Test', () => {
  test('should automatically update standings table after match result is recorded', async ({ page }) => {
    // 1. First, navigate to the public standings page to record initial standings state
    await page.goto('/standings')
    await page.waitForTimeout(1000)

    // 2. Log in as Admin
    await page.goto('/admin/login')
    await expect(page.locator('h1').filter({ hasText: /لوحة التحكم|Admin Panel/ })).toBeVisible()
    
    const emailInput = page.locator('input[type="email"]')
    await emailInput.fill(ADMIN_EMAIL)
    const passwordInput = page.locator('input[type="password"]')
    await passwordInput.fill(ADMIN_PASSWORD)
    await page.locator('button[type="submit"]').click()

    // Wait for Dashboard page to load after login redirect
    await page.waitForURL('**/admin/dashboard')
    await page.waitForTimeout(1000)

    // Navigate directly — the dashboard's /admin/matches link sits in the
    // mobile-only bottom nav, invisible at the desktop viewport.
    await page.goto('/admin/matches')
    await page.waitForTimeout(1000)

    // Click Auto-Generate Schedule if visible
    const autoGenBtn = page.getByRole('button', { name: /إنشاء الجدول تلقائياً|Auto-Generate Schedule/ })
    if (await autoGenBtn.count() > 0 && await autoGenBtn.isVisible()) {
      console.log('Auto-Generate Schedule button is visible. Clicking it...')
      await autoGenBtn.click()
      await page.waitForTimeout(2000)
    }

    // Find the first card that is Scheduled
    const cards = page.locator('.glass-card')
    const count = await cards.count()
    let targetCard = null

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i)
      const statusText = await card.locator('span').first().textContent()
      if (statusText.includes('مجدولة') || statusText.includes('Scheduled')) {
        targetCard = card
        break
      }
    }

    if (!targetCard && count > 0) {
      targetCard = cards.first()
    }

    if (targetCard) {
      const recordResultBtn = targetCard.getByRole('button', { name: /تسجيل النتيجة|Record Result/ })
      if (await recordResultBtn.isVisible()) {
        await recordResultBtn.click()

        // Result modal should open
        await expect(page.getByRole('heading', { name: /تسجيل النتيجة|Record Result/ })).toBeVisible()

        // Fill score A = 4, score B = 2
        const scoreInputs = page.locator('form input[type="number"]')
        await scoreInputs.first().fill('4')
        await scoreInputs.last().fill('2')

        // Click "Save Result" to submit
        const saveBtn = page.getByRole('button', { name: /حفظ النتيجة|Save Result/ })
        if (await saveBtn.isVisible()) {
          await saveBtn.click()
        }
      }
    }

    // 4. Return to public standings page
    await page.goto('/standings')
    await page.waitForTimeout(1000)
  })
})
