import { test, expect } from '@playwright/test'
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers'

test.describe('Polymorphic Match & Result Modals E2E Test', () => {
  test('should test match creation and result modal with penalty shootout selection in headed mode', async ({ page }) => {
    // 1. Navigate to admin login page and log in
    await page.goto('/admin/login')
    await page.waitForTimeout(500)

    const emailInput = page.locator('input[type="email"]')
    await emailInput.fill(ADMIN_EMAIL)
    const passwordInput = page.locator('input[type="password"]')
    await passwordInput.fill(ADMIN_PASSWORD)
    await page.locator('button[type="submit"]').click()

    // Wait for Dashboard page to load after login redirect
    await page.waitForURL('**/admin/dashboard')
    await page.waitForTimeout(1000)

    // 2. Navigate to Group Matches Admin page
    await page.goto('/admin/matches')
    await page.waitForTimeout(1500)

    // 3. Open unified MatchFormModal ("إضافة مباراة" / "Add Match")
    const addMatchBtn = page.getByRole('button', { name: /إضافة مباراة|Add Match/ })
    if (await addMatchBtn.isVisible()) {
      await addMatchBtn.click()
      await page.waitForTimeout(1500)

      // Verify MatchFormModal is visible
      await expect(page.locator('form')).toBeVisible()

      // Close modal via the X button inside the modal overlay
      await page.locator('div.fixed.inset-0.z-50 button:has(svg.lucide-x)').first().click()
      await page.waitForTimeout(800)
    }

    // 4. Test ResultFormModal on Group Stage Match
    const matchCards = page.locator('.glass-card')
    const count = await matchCards.count()

    if (count > 0) {
      const firstCard = matchCards.first()
      const recordBtn = firstCard.getByRole('button', { name: /تسجيل النتيجة|تعديل النتيجة|Record Result|Edit Result/ })
      if (await recordBtn.isVisible()) {
        await recordBtn.click()
        await page.waitForTimeout(1500)

        // Result form modal should open
        const modalHeading = page.getByRole('heading', { name: /تسجيل النتيجة|تعديل النتيجة|إنهاء المباراة|Record Result|Edit Result|End Match/ })
        await expect(modalHeading).toBeVisible()

        // Close modal via the X button inside the modal overlay
        await page.locator('div.fixed.inset-0.z-50 button:has(svg.lucide-x)').first().click()
        await page.waitForTimeout(800)
      }
    }

    // 5. Navigate to Knockout Admin page
    await page.goto('/admin/knockout')
    await page.waitForTimeout(1500)

    // Check for knockout match card
    const koCards = page.locator('.glass-card')
    const koCount = await koCards.count()

    if (koCount > 0) {
      const koCard = koCards.first()
      const koRecordBtn = koCard.getByRole('button', { name: /تسجيل النتيجة|تعديل النتيجة|Record Result|Edit Result/ })
      if (await koRecordBtn.isVisible()) {
        await koRecordBtn.click()
        await page.waitForTimeout(1500)

        // ResultFormModal with isKnockout=true should open
        const scoreInputs = page.locator('form input[type="number"]')
        if (await scoreInputs.count() >= 2) {
          // Fill tied scores (e.g. 1 - 1)
          await scoreInputs.first().fill('1')
          await scoreInputs.last().fill('1')
          await page.waitForTimeout(1500)

          // Verify Penalty Winner section appears
          const penaltyHeading = page.getByText(/الفائز بركلات الترجيح|Penalty Winner/)
          await expect(penaltyHeading).toBeVisible()
          await page.waitForTimeout(2000)

          // Select first team as penalty winner
          const teamCards = page.locator('button').filter({ has: page.locator('img') })
          if (await teamCards.count() >= 2) {
            await teamCards.first().click()
            await page.waitForTimeout(1500)
          }

          // Close modal via the X button inside the modal overlay
          await page.locator('div.fixed.inset-0.z-50 button:has(svg.lucide-x)').first().click()
          await page.waitForTimeout(800)
        }
      }
    }

    await page.waitForTimeout(1500)
  })
})
