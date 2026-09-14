import { test, expect, Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const EMAIL = process.env.TEST_EMAIL || 'owner@test.com'
const PASSWORD = process.env.TEST_PASSWORD || 'password123'
const CANONICAL_PET_ID = process.env.TEST_PET_ID || '00000000-0000-4000-8000-000000000042'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function doLogin(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('PLAYWRIGHT_TEST', 'true')
  })
  await page.goto('/login?nosplash=true')

  // Check if already logged in
  if (page.url().includes('/owner/') || page.url().includes('/admin')) {
    return
  }

  const emailInput = page.locator('input[name="email"]')
  await emailInput.waitFor({ state: 'visible', timeout: 15000 })
  await emailInput.fill(EMAIL)
  await page.fill('input[name="password"]', PASSWORD)
  await page.click('button[type="submit"]', { force: true })
  await page.waitForURL(/\/admin|\/(owner|clinic|sitter|trainer|groomer|hotel)\//, { timeout: 20000 })
}

async function navigateToSummary(page: Page) {
  const summaryView = page.locator('[data-testid="smart-scan-summary-view"]')
  for (let i = 0; i < 15; i++) {
    const isSummary = await summaryView.isVisible().catch(() => false)
    if (isSummary) return
    const clicked = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="skip-page-btn"]') as HTMLButtonElement | null
      if (btn) {
        btn.click()
        return true
      }
      return false
    })
    if (clicked) {
      await page.waitForTimeout(400)
    } else {
      await page.waitForTimeout(300)
    }
  }
  await summaryView.waitFor({ state: 'visible', timeout: 10000 })
}

test.describe('Smart Passport Scan — Confirmation Step True Browser E2E & Responsive Gate', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000)
    // Intercept extract API for deterministic OCR simulation
    await page.route('**/api/smart-scan/extract', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          confidence: 0.88,
          data: {
            name: 'Karamel',
            species: 'dog',
            breed: 'Sokak Köpeği',
            color: 'Gri', // OCR read 'Gri'
            birth_date: '2022-03-15',
            microchip_no: '990000012345678',
            passport_no: 'TR-34-987654',
          },
        }),
      })
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 1. CRITICAL FLOW: OCR -> Confirmation -> Select Color from SSOT Dropdown -> Save -> Confirm -> Real Commit -> DB Persistence & Navigation
  // ─────────────────────────────────────────────────────────────
  test('CRITICAL FLOW: OCR -> Confirmation -> Select Color from SSOT Dropdown -> Save -> Confirm -> Real Commit -> DB Persistence & Navigation', async ({ page }) => {
    // 0. Await session creation
    const sessionPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/smart-scan/session') && resp.request().method() === 'POST',
      { timeout: 20000 }
    )

    await doLogin(page)
    await page.goto('/owner/pets/scan')
    await page.waitForLoadState('domcontentloaded')

    const sessionResp = await sessionPromise
    expect(sessionResp.status()).toBe(200)
    const sessionJson = await sessionResp.json()
    const sessionId = sessionJson.sessionId
    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/)

    // Verify session was created in DB and status is 'active'
    const { data: dbSessionInit } = await supabaseAdmin
      .from('smart_scan_sessions')
      .select('id, status')
      .eq('id', sessionId)
      .single()
    expect(dbSessionInit).not.toBeNull()
    expect(dbSessionInit!.status).toBe('active')

    // Fast forward to confirmation step
    await navigateToSummary(page)

    // 2. Verify Confirmation (Summary) View opened
    const summaryView = page.locator('[data-testid="smart-scan-summary-view"]')
    await expect(summaryView).toBeVisible({ timeout: 8000 })
    await expect(page.locator('[data-testid="summary-card-pet"]')).toBeVisible()
    await expect(page.locator('[data-testid="summary-card-owner"]')).toBeVisible()
    await expect(page.locator('[data-testid="summary-card-vet"]')).toBeVisible()

    // 3. Trigger Inline Edit on Pet Card
    const editPetBtn = page.locator('[data-testid="edit-pet-summary-btn"]')
    await expect(editPetBtn).toBeVisible()
    await editPetBtn.click()

    // Verify Pet card is in edit mode while Owner and Vet remain in view mode
    const petForm = page.locator('[data-testid="manual-form-page_5"]')
    await expect(petForm).toBeVisible()
    await expect(page.locator('[data-testid="edit-owner-summary-btn"]')).toBeVisible()
    await expect(page.locator('[data-testid="edit-vet-summary-btn"]')).toBeVisible()

    // 4. Verify Quick Color Chips are completely removed and native SSOT <select> is present
    const colorSelect = page.locator('select[data-testid="input-pet-color"]')
    await expect(colorSelect).toBeVisible()
    await expect(page.locator('[data-testid^="quick-color-"]')).toHaveCount(0)

    // 5. Test species-aware color options (Dog vs Cat)
    await page.locator('[data-testid="species-toggle-dog"]').click()
    const dogColorOptions = await colorSelect.locator('option').allInnerTexts()
    expect(dogColorOptions).toContain('Kahverengi')
    expect(dogColorOptions).toContain('Altın Sarısı')

    await page.locator('[data-testid="species-toggle-cat"]').click()
    const catColorOptions = await colorSelect.locator('option').allInnerTexts()
    expect(catColorOptions).toContain('Tekir')
    expect(catColorOptions).toContain('Calico')

    // Switch back to Dog and select canonical color 'Kahverengi'
    await page.locator('[data-testid="species-toggle-dog"]').click()
    await colorSelect.selectOption('Kahverengi')

    // Fill required fields
    await page.locator('[data-testid="input-pet-name"]').fill('Karamel')
    const breedInput = page.locator('[data-testid="input-pet-breed"]')
    await breedInput.fill('Golden Retriever')

    // 6. Save Inline Edit
    const saveBtn = page.locator('[data-testid="save-manual-entry-btn"]')
    await saveBtn.click()

    // Verify view mode returned with edited breed and color
    await expect(summaryView).toContainText('Golden Retriever')
    await expect(summaryView).toContainText('Karamel')
    await expect(summaryView).toContainText('Kahverengi')

    // 7. Real Commit to backend (NO MOCK - tests real DB persistence)
    const commitResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/smart-scan/commit') && resp.request().method() === 'POST',
      { timeout: 20000 }
    )

    const commitBtn = page.locator('[data-testid="commit-btn"]')
    await expect(commitBtn).toBeVisible()
    await commitBtn.click()

    const commitResp = await commitResponsePromise
    expect(commitResp.status()).toBe(200)
    const commitJson = await commitResp.json()
    expect(commitJson.success).toBe(true)
    expect(commitJson.petId).toMatch(/^[0-9a-f-]{36}$/)

    // 8. DATABASE PERSISTENCE PROOF:
    // Session state transitioned to 'completed' and linked to petId
    const { data: dbSession, error: sessionDbError } = await supabaseAdmin
      .from('smart_scan_sessions')
      .select('id, status, pet_id')
      .eq('id', sessionId)
      .single()
    expect(sessionDbError).toBeNull()
    expect(dbSession).not.toBeNull()
    expect(dbSession!.status).toBe('completed')
    expect(dbSession!.pet_id).toBe(commitJson.petId)

    // Pet record exists in DB with overridden color 'Kahverengi'
    const { data: dbPet, error: petDbError } = await supabaseAdmin
      .from('pets')
      .select('id, name, species, breed, color')
      .eq('id', commitJson.petId)
      .single()
    expect(petDbError).toBeNull()
    expect(dbPet).not.toBeNull()
    expect(dbPet!.name).toBe('Karamel')
    expect(dbPet!.species).toBe('dog')
    expect(dbPet!.breed).toBe('Golden Retriever')
    expect(dbPet!.color).toBe('Kahverengi')

    // 9. Verify redirect to newly created pet profile
    await page.waitForURL(new RegExp(`/owner/pets/${commitJson.petId}`), { timeout: 15000 })
  })

  // ─────────────────────────────────────────────────────────────
  // 1B. NO-EDIT COMMIT FLOW: OCR -> Confirmation -> Direct Confirm -> Real Commit -> Navigation
  // ─────────────────────────────────────────────────────────────
  test('NO-EDIT COMMIT FLOW: OCR Extracted Data -> Confirmation -> Direct Confirm -> Real Commit -> Navigation', async ({ page }) => {
    // 0. Await session creation
    const sessionPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/smart-scan/session') && resp.request().method() === 'POST',
      { timeout: 20000 }
    )

    await doLogin(page)
    await page.goto('/owner/pets/scan')
    await page.waitForLoadState('domcontentloaded')

    const sessionResp = await sessionPromise
    expect(sessionResp.status()).toBe(200)
    const sessionJson = await sessionResp.json()
    const sessionId = sessionJson.sessionId
    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/)

    // Advance to Page 5 (Pet Details)
    // Page 0 (cover) -> skip to 1 (page_4) -> skip to 2 (page_5)
    for (let i = 0; i < 2; i++) {
      await page.click('[data-testid="skip-page-btn"]')
      await page.waitForTimeout(300)
    }

    // Upload tiny image to simulate OCR on Page 5
    const TINY_PNG = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    await page.setInputFiles('input[type="file"]', {
      name: 'passport_p5.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    })

    // Instant confirmation card for page_5 should appear
    await expect(page.locator('[data-testid="instant-confirmation-page_5"]')).toBeVisible({ timeout: 10000 })

    // Advance to summary
    await page.click('[data-testid="next-step-btn"]') // Go to page 6
    await page.waitForTimeout(300)
    await page.click('[data-testid="skip-page-btn"]') // Go to page 7
    await page.waitForTimeout(300)
    await page.click('[data-testid="skip-page-btn"]') // Go to summary

    const summaryView = page.locator('[data-testid="smart-scan-summary-view"]')
    await expect(summaryView).toBeVisible({ timeout: 8000 })

    // Verify OCR data is displayed directly in view mode
    await expect(summaryView).toContainText('Karamel')
    await expect(summaryView).toContainText('Sokak Köpeği')
    await expect(summaryView).toContainText('Gri')

    // Direct confirm without any user edit (tests pure OCR pass-through)
    const commitResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/smart-scan/commit') && resp.request().method() === 'POST',
      { timeout: 20000 }
    )

    const commitBtn = page.locator('[data-testid="commit-btn"]')
    await expect(commitBtn).toBeVisible()
    await commitBtn.click()

    const commitResp = await commitResponsePromise
    expect(commitResp.status()).toBe(200)
    const commitJson = await commitResp.json()
    expect(commitJson.success).toBe(true)
    expect(commitJson.petId).toMatch(/^[0-9a-f-]{36}$/)

    // DATABASE PERSISTENCE PROOF:
    // Session state transitioned to 'completed' and linked to petId
    const { data: dbSession, error: sessionDbError } = await supabaseAdmin
      .from('smart_scan_sessions')
      .select('id, status, pet_id')
      .eq('id', sessionId)
      .single()
    expect(sessionDbError).toBeNull()
    expect(dbSession).not.toBeNull()
    expect(dbSession!.status).toBe('completed')
    expect(dbSession!.pet_id).toBe(commitJson.petId)

    // Pet record exists in DB with exact OCR color 'Gri'
    const { data: dbPet, error: petDbError } = await supabaseAdmin
      .from('pets')
      .select('id, name, species, breed, color')
      .eq('id', commitJson.petId)
      .single()
    expect(petDbError).toBeNull()
    expect(dbPet).not.toBeNull()
    expect(dbPet!.name).toBe('Karamel')
    expect(dbPet!.species).toBe('dog')
    expect(dbPet!.breed).toBe('Sokak Köpeği')
    expect(dbPet!.color).toBe('Gri')

    await page.waitForURL(new RegExp(`/owner/pets/${commitJson.petId}`), { timeout: 15000 })
  })

  // ─────────────────────────────────────────────────────────────
  // 2. API ERROR & RETRY SCENARIO
  // ─────────────────────────────────────────────────────────────
  test('API ERROR & RETRY: Shows visible error card on 500 and recovers on retry', async ({ page }) => {
    let attempt = 0

    await page.route('**/api/smart-scan/commit', async (route) => {
      attempt++
      if (attempt === 1) {
        // First attempt fails with 500
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Veritabanı bağlantı hatası. Lütfen tekrar deneyin.',
          }),
        })
      } else {
        // Second attempt succeeds
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            petId: CANONICAL_PET_ID,
          }),
        })
      }
    })

    await doLogin(page)
    await page.goto('/owner/pets/scan')
    await page.waitForLoadState('domcontentloaded')

    // Navigate to summary
    await navigateToSummary(page)

    // Fill valid pet fields before submitting
    const editPetBtn = page.locator('[data-testid="edit-pet-summary-btn"]')
    await editPetBtn.click()
    await page.locator('[data-testid="input-pet-name"]').fill('Karamel')
    await page.locator('[data-testid="species-toggle-dog"]').click()
    await page.locator('[data-testid="input-pet-breed"]').fill('Golden Retriever')
    await page.locator('[data-testid="save-manual-entry-btn"]').click()

    // Attempt 1: Click confirm
    const commitBtn = page.locator('[data-testid="commit-btn"]')
    await commitBtn.click()

    // Verify summary error card appears with retry button
    const errorCard = page.locator('[data-testid="confirmation-error-card"], [data-testid="summary-error-card"]')
    await expect(errorCard).toBeVisible()
    await expect(errorCard).toContainText('Veritabanı bağlantı hatası')

    const retryBtn = page.locator('[data-testid="retry-commit-btn"]')
    await expect(retryBtn).toBeVisible()

    // Attempt 2: Click retry
    await retryBtn.click()

    // Verify recovery and successful redirect
    await page.waitForURL(`**/owner/pets/${CANONICAL_PET_ID}`, { timeout: 10000 })
    expect(attempt).toBe(2)
  })

  // ─────────────────────────────────────────────────────────────
  // 3. REAL RESPONSIVE VERIFICATION (320px, 375px, 390px, 430px)
  // ─────────────────────────────────────────────────────────────
  const VIEWPORTS = [
    { name: '320x800 (Compact Mobile)', width: 320, height: 800 },
    { name: '375x812 (Standard iPhone SE/Mini)', width: 375, height: 812 },
    { name: '390x844 (iPhone 13/14/15)', width: 390, height: 844 },
    { name: '430x932 (iPhone Pro Max / Plus)', width: 430, height: 932 },
  ]

  for (const vp of VIEWPORTS) {
    test(`RESPONSIVE GATE: Viewport ${vp.name} verified for layout, overflow, and usability`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })

      await doLogin(page)
      await page.goto('/owner/pets/scan')
      await page.waitForLoadState('domcontentloaded')

      // Navigate to summary view
      await navigateToSummary(page)

      const summaryView = page.locator('[data-testid="smart-scan-summary-view"]')
      await expect(summaryView).toBeVisible({ timeout: 8000 })

      // A. Check Horizontal Overflow (Must be 0px overflow)
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth
      })
      expect(hasHorizontalOverflow, `Horizontal overflow detected at ${vp.width}px`).toBe(false)

      // B. Cards fit viewport width
      const cardBoxes = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('[data-testid^="summary-card-"]'))
        return cards.map(c => {
          const rect = c.getBoundingClientRect()
          return { right: rect.right, width: rect.width }
        })
      })
      for (const card of cardBoxes) {
        expect(card.right).toBeLessThanOrEqual(vp.width + 1)
      }

      // Capture real device viewport screenshot for visual QA
      await page.screenshot({ path: `test-results/screenshot-${vp.width}.png` })

      // C. Submit button is visible and usable
      const commitBtn = page.locator('[data-testid="commit-btn"]')
      await expect(commitBtn).toBeVisible()
      const commitBox = await commitBtn.boundingBox()
      expect(commitBox).not.toBeNull()
      expect(commitBox!.width).toBeGreaterThan(180)

      // D. Edit controls usable
      const editPetBtn = page.locator('[data-testid="edit-pet-summary-btn"]')
      await expect(editPetBtn).toBeVisible()
      await editPetBtn.click()

      // Verify native color select is rendered and visible without breaking layout
      await expect(page.locator('select[data-testid="input-pet-color"]')).toBeVisible()

      // Form inside 320px..430px must not cause horizontal scroll
      const hasOverflowInEdit = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth
      })
      expect(hasOverflowInEdit, `Horizontal overflow in edit mode at ${vp.width}px`).toBe(false)

      // Cancel edit and verify clean return
      const cancelBtn = page.locator('[data-testid="cancel-manual-entry-btn"], [data-testid="cancel-edit-btn"]')
      await expect(cancelBtn).toBeVisible()
      await cancelBtn.click()
      await expect(summaryView).toBeVisible()
    })
  }
})
