import { test, expect } from '@playwright/test'

test.describe('Top Scorers Team Name E2E Test', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home and configure local storage for English
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('goalchok-app-settings', JSON.stringify({
        state: { theme: 'dark', language: 'en' },
        version: 0
      }))
    })
  })

  test('should display team name alongside top scorer on top-scorers page', async ({ page }) => {
    // 1. Log in as Admin
    await page.goto('/admin/login')
    await expect(page.locator('h1').filter({ hasText: /لوحة التحكم|Admin Panel/ })).toBeVisible()
    
    const pinInput = page.locator('input[type="password"]')
    await pinInput.fill('7391')
    await page.locator('button[type="submit"]').click()

    // Verify successful login
    await expect(page.getByText(/لوحة تحكم بطولة GoalChok-গোলছক|GoalChok-গোলছক tournament control panel/)).toBeVisible()

    // 2. Navigate to Matches Admin Page to find or generate matches
    await page.goto('/admin/matches')
    await expect(page.getByRole('heading', { name: /إدارة المباريات|Match Management/ })).toBeVisible()

    // Click Auto-Generate Schedule if visible to populate matches
    const autoGenBtn = page.getByRole('button', { name: /إنشاء الجدول تلقائياً|Auto-Generate Schedule/ })
    if (await autoGenBtn.count() > 0 && await autoGenBtn.isVisible()) {
      console.log('Auto-Generate Schedule button is visible. Clicking it...')
      await autoGenBtn.click()
      await page.waitForTimeout(2000)
    }

    // 3. Find first scheduled match card
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

    if (!targetCard) {
      throw new Error('Could not find a scheduled match.')
    }

    // 4. Click "Record Result"
    const recordResultBtn = targetCard.getByRole('button', { name: /تسجيل النتيجة|Record Result/ })
    await recordResultBtn.click()

    // Result modal should open
    await expect(page.getByRole('heading', { name: /تسجيل النتيجة|Record Result/ })).toBeVisible()

    // Fill in the scores (score A = 1, score B = 0)
    const scoreInputs = page.locator('form input[type="number"]')
    await expect(scoreInputs).toHaveCount(2)
    await scoreInputs.first().fill('1')
    await scoreInputs.last().fill('0')

    // 5. Add a goal scorer
    // Click "إضافة" (Add) under "الهدافون" (Scorers) inside the form modal
    const addScorersBtn = page.locator('form button').filter({ hasText: /إضافة|Add/ }).first()
    await addScorersBtn.click()

    // Choose the team
    const teamSelect = page.locator('form select').first()
    const teamNameOption = await teamSelect.locator('option').nth(1).textContent()
    const cleanTeamName = teamNameOption ? teamNameOption.trim() : ''
    await teamSelect.selectOption({ index: 1 })

    // Choose the player
    const playerSelect = page.locator('form select').nth(1)
    await page.waitForTimeout(500) // Wait for players list to populate
    const playerNameOption = await playerSelect.locator('option').nth(1).textContent()
    const cleanPlayerName = playerNameOption ? playerNameOption.trim() : ''
    await playerSelect.selectOption({ index: 1 })

    // Fill minute
    const minuteInput = page.locator('form input[placeholder="مثال: 15"]')
    await minuteInput.fill('12')

    console.log(`E2E Test: Selected Scorer: "${cleanPlayerName}" for Team: "${cleanTeamName}"`)

    // Click save/submit result
    await page.locator('button[type="submit"]').click()

    // Wait for modal to close
    await expect(page.getByRole('heading', { name: 'تسجيل النتيجة' })).not.toBeVisible()

    // 6. Navigate to the top scorers page and verify player and team name are displayed
    await page.goto('/top-scorers')
    await expect(page.getByText('Top Scorers')).toBeVisible()

    // Assert both the scorer name and the team name are rendered on the page
    await expect(page.getByText(cleanPlayerName)).toBeVisible()
    await expect(page.getByText(cleanTeamName)).toBeVisible()
  })
})
