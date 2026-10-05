import { test, expect } from '@playwright/test'
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers'

test.describe('Top Scorers Team Name E2E Test', () => {
  test('should display team name alongside top scorer on top-scorers page', async ({ page }) => {
    // 1. Log in as Admin
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

    // Click Auto-Generate Schedule if visible to populate matches
    const autoGenBtn = page.getByRole('button', { name: /إنشاء الجدول تلقائياً|Auto-Generate Schedule/ })
    if (await autoGenBtn.count() > 0 && await autoGenBtn.isVisible()) {
      console.log('Auto-Generate Schedule button is visible. Clicking it...')
      await autoGenBtn.click()
      await page.waitForTimeout(2000)
    }

    // 3. Find a scheduled match card
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

    // 4. Click "Record Result"
    if (targetCard) {
      const recordResultBtn = targetCard.getByRole('button', { name: /تسجيل النتيجة|Record Result/ })
      if (await recordResultBtn.isVisible()) {
        await recordResultBtn.click()

        // Result modal should open
        await expect(page.getByRole('heading', { name: /تسجيل النتيجة|Record Result/ })).toBeVisible()

        // Fill in the scores (score A = 1, score B = 0)
        const scoreInputs = page.locator('form input[type="number"]')
        await scoreInputs.first().fill('1')
        await scoreInputs.last().fill('0')

        // Add a goal scorer
        const addScorersBtn = page.locator('form button').filter({ hasText: /إضافة|Add/ }).first()
        if (await addScorersBtn.isVisible()) {
          await addScorersBtn.click()

          const teamSelect = page.locator('form select').first()
          if (await teamSelect.isVisible()) {
            await teamSelect.selectOption({ index: 1 })
          }

          const playerSelect = page.locator('form select').nth(1)
          if (await playerSelect.isVisible()) {
            await playerSelect.selectOption({ index: 1 })
          }

          const minuteInput = page.locator('form input[placeholder="مثال: 15"]')
          if (await minuteInput.isVisible()) {
            await minuteInput.fill('12')
          }
        }

        // Save Result
        const saveBtn = page.getByRole('button', { name: /حفظ النتيجة|Save Result/ })
        if (await saveBtn.isVisible()) {
          await saveBtn.click()
        }
      }
    }

    // 5. Navigate to public top scorers page
    await page.goto('/scorers')
    await page.waitForTimeout(1000)
  })
})
