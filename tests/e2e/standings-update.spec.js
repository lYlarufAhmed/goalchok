import { test, expect } from '@playwright/test'

test.describe('Standings Auto-Update Reproduction Test', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Navigate to home and configure local storage for English
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('goalchok-app-settings', JSON.stringify({
        state: { theme: 'dark', language: 'en' },
        version: 0
      }))
    })
  })

  test('should automatically update standings table after match result is recorded', async ({ page }) => {
    // 1. Go to public standings page first to capture team group assignments
    await page.goto('/standings')
    await expect(page.getByRole('heading', { name: 'Group Standings' })).toBeVisible()

    // Query and log the groups of all teams from the standings page so we can match them
    const teamGroups = {}
    const groups = ['A', 'B', 'C']
    for (const g of groups) {
      await page.getByRole('button', { name: `Group ${g}` }).click()
      await page.waitForTimeout(500)
      const teamNamesInGroup = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('tbody tr')).map(row => {
          const cell = row.querySelector('td:nth-child(2)')
          return cell ? cell.textContent.trim() : ''
        }).filter(Boolean)
      })
      console.log(`Teams in Group ${g} standings:`, teamNamesInGroup)
      teamNamesInGroup.forEach(name => {
        teamGroups[name] = g
      })
    }
    console.log('Detected team group assignments:', teamGroups)

    // 2. Log in as Admin
    await page.goto('/admin/login')
    await expect(page.locator('h1').filter({ hasText: /لوحة التحكم|Admin Panel/ })).toBeVisible()
    
    const pinInput = page.locator('input[type="password"]')
    await pinInput.fill('7391')
    await page.locator('button[type="submit"]').click()

    // Verify successful login
    await expect(page.getByText(/لوحة تحكم بطولة GoalChok-গোলছক|GoalChok-গোলছক tournament control panel/)).toBeVisible()

    // 3. Navigate to Matches Admin Page to find a scheduled match where both teams belong to the same group
    await page.goto('/admin/matches')
    await expect(page.getByRole('heading', { name: /إدارة المباريات|Match Management/ })).toBeVisible()

    // Click Auto-Generate Schedule if visible
    const autoGenBtn = page.getByRole('button', { name: /إنشاء الجدول تلقائياً|Auto-Generate Schedule/ })
    if (await autoGenBtn.count() > 0 && await autoGenBtn.isVisible()) {
      console.log('Auto-Generate Schedule button is visible. Clicking it...')
      await autoGenBtn.click()
      await page.waitForTimeout(2000)
    }

    // Let's find the first card that is Scheduled and has both teams in the same group
    const cards = page.locator('.glass-card')
    const count = await cards.count()
    let targetCard = null
    let team1Name = ''
    let team2Name = ''
    let matchGroup = ''

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i)
      const statusText = await card.locator('span').first().textContent()
      if (statusText.includes('مجدولة') || statusText.includes('Scheduled')) {
        const pElements = card.locator('p')
        const t1 = await pElements.nth(0).textContent()
        const t2 = await pElements.nth(1).textContent()
        const t1Clean = t1 ? t1.trim() : ''
        const t2Clean = t2 ? t2.trim() : ''
        
        if (t1Clean && t2Clean && t1Clean !== '—' && t2Clean !== '—') {
          const g1 = teamGroups[t1Clean]
          const g2 = teamGroups[t2Clean]
          if (g1 && g2 && g1 === g2) {
            targetCard = card
            team1Name = t1Clean
            team2Name = t2Clean
            matchGroup = g1 // The actual group they belong to!
            break
          }
        }
      }
    }

    if (!targetCard) {
      throw new Error('Could not find a scheduled match between two teams in the same group.')
    }

    console.log(`Found target match: Group ${matchGroup}, ${team1Name} vs ${team2Name}`)

    // 4. Go to public standings page to capture initial stats for these teams
    await page.goto('/standings')
    await expect(page.getByRole('heading', { name: 'Group Standings' })).toBeVisible()

    // Click on the appropriate group tab
    const groupTabBtn = page.getByRole('button', { name: `Group ${matchGroup}` })
    await groupTabBtn.click()
    await page.waitForTimeout(1000)

    // Capture initial stats for team1 and team2 from the standings page
    const initialStats = await page.evaluate((names) => {
      const rows = Array.from(document.querySelectorAll('tbody tr'))
      const stats = {}
      rows.forEach(row => {
        const nameCell = row.querySelector('td:nth-child(2)')
        const name = nameCell ? nameCell.textContent.trim() : ''
        if (names.includes(name)) {
          const cells = Array.from(row.querySelectorAll('td'))
          stats[name] = {
            played: Number(cells[2]?.textContent.trim() || '0'),
            won: Number(cells[3]?.textContent.trim() || '0'),
            drawn: Number(cells[4]?.textContent.trim() || '0'),
            lost: Number(cells[5]?.textContent.trim() || '0'),
            gd: Number(cells[6]?.textContent.trim().replace('+', '') || '0'),
            pts: Number(cells[7]?.textContent.trim() || '0'),
          }
        }
      })
      return stats
    }, [team1Name, team2Name])

    console.log('Initial stats:', initialStats)

    // Ensure we actually found both teams in the standings table
    if (!initialStats[team1Name] || !initialStats[team2Name]) {
      throw new Error(`Could not find both teams in Group ${matchGroup} standings table before match result.`)
    }

    // 5. Return to Matches Admin Page to record result
    await page.goto('/admin/matches')
    await expect(page.getByRole('heading', { name: /إدارة المباريات|Match Management/ })).toBeVisible()

    // Re-locate the specific target card by team names
    const matchCard = page.locator('.glass-card').filter({
      hasText: team1Name
    }).filter({
      hasText: team2Name
    }).first()

    await expect(matchCard).toBeVisible()

    // Click "Record Result" on that card
    const recordResultBtn = matchCard.getByRole('button', { name: /تسجيل النتيجة|Record Result/ })
    await recordResultBtn.click()

    // Result modal should open
    await expect(page.getByRole('heading', { name: /تسجيل النتيجة|Record Result/ })).toBeVisible()

    // Fill score A = 4, score B = 2
    const scoreInputs = page.locator('form input[type="number"]')
    await expect(scoreInputs).toHaveCount(2)
    
    await scoreInputs.first().fill('4')
    await scoreInputs.last().fill('2')

    // Click "Save Result" to submit
    await page.getByRole('button', { name: /حفظ النتيجة|Save Result/ }).click()

    // Wait for modal to close and match status to become "Completed"
    await expect(page.getByRole('heading', { name: /تسجيل النتيجة|Record Result/ }).not.toBeVisible())
    await expect(matchCard.locator('span', { hasText: /منتهية|Completed/ })).toBeVisible()
    await expect(matchCard.locator('span', { hasText: '4 - 2' })).toBeVisible()

    // 6. Navigate back to standings to verify auto-update
    await page.goto('/standings')
    await expect(page.getByRole('heading', { name: 'Group Standings' })).toBeVisible()

    // Click on the appropriate group tab
    const groupTabBtnAfter = page.getByRole('button', { name: `Group ${matchGroup}` })
    await groupTabBtnAfter.click()
    await page.waitForTimeout(1000)

    // Get updated stats for the two teams
    const updatedStats = await page.evaluate((names) => {
      const rows = Array.from(document.querySelectorAll('tbody tr'))
      const stats = {}
      rows.forEach(row => {
        const nameCell = row.querySelector('td:nth-child(2)')
        const name = nameCell ? nameCell.textContent.trim() : ''
        if (names.includes(name)) {
          const cells = Array.from(row.querySelectorAll('td'))
          stats[name] = {
            played: Number(cells[2]?.textContent.trim() || '0'),
            won: Number(cells[3]?.textContent.trim() || '0'),
            drawn: Number(cells[4]?.textContent.trim() || '0'),
            lost: Number(cells[5]?.textContent.trim() || '0'),
            gd: Number(cells[6]?.textContent.trim().replace('+', '') || '0'),
            pts: Number(cells[7]?.textContent.trim() || '0'),
          }
        }
      })
      return stats
    }, [team1Name, team2Name])

    console.log('Updated stats:', updatedStats)

    const t1Initial = initialStats[team1Name]
    const t1Updated = updatedStats[team1Name]

    const t2Initial = initialStats[team2Name]
    const t2Updated = updatedStats[team2Name]

    // Verify stats update
    expect(t1Updated).toBeDefined()
    expect(t2Updated).toBeDefined()

    expect(t1Updated.played).toBe(t1Initial.played + 1)
    expect(t1Updated.won).toBe(t1Initial.won + 1)
    expect(t1Updated.gd).toBe(t1Initial.gd + 2)
    expect(t1Updated.pts).toBe(t1Initial.pts + 3)

    expect(t2Updated.played).toBe(t2Initial.played + 1)
    expect(t2Updated.lost).toBe(t2Initial.lost + 1)
    expect(t2Updated.gd).toBe(t2Initial.gd - 2)
    expect(t2Updated.pts).toBe(t2Initial.pts)
  })
})