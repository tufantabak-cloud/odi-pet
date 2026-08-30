import { expect, type Page } from '@playwright/test';
import { test } from './fixtures';

import { LOCAL_E2E_EMAIL, LOCAL_E2E_PASSWORD } from '../scripts/seed-local-e2e-fixtures.mjs'

const email = process.env.TEST_OWNER_EMAIL || LOCAL_E2E_EMAIL
const password = process.env.TEST_OWNER_PASSWORD || LOCAL_E2E_PASSWORD

async function login(page: Page) {
  if (!email || !password) {
    throw new Error('LOCAL_E2E_CREDENTIALS_MISSING')
  }

  await page.goto('/login')
  await page.getByTestId('login-email-input').fill(email)
  await page.getByTestId('login-password-input').fill(password)
  await page.getByRole('button', { name: 'GiriÅŸ Yap', exact: true }).click()
  await expect(page).toHaveURL(/\/owner\//, { timeout: 15_000 })
}

test.describe('Abonelik ve Ã¶deme gÃ¼venli akÄ±ÅŸÄ±', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/owner/profile/subscription')
    await page.waitForLoadState('networkidle')
  })

  test('gerÃ§ek olmayan kart veya fatura gÃ¶stermeden gÃ¼venli durumu aÃ§Ä±klar', async ({
    page,
  }) => {
    await expect(
      page.getByRole('heading', { name: 'Abonelik ve Ã–deme' })
    ).toBeVisible()
    await expect(page.getByText('Odi Free').first()).toBeVisible()
    await expect(
      page.getByText('Kart bilgilerin Odi tarafÄ±ndan tutulmaz.')
    ).toBeVisible()
    await expect(page.getByText('4242')).toHaveCount(0)
    await expect(page.getByText(/INV-2026/)).toHaveCount(0)
    await expect(page.locator('[data-nextjs-dialog]')).toHaveCount(0)
  })

  test('Ã¶deme ayarÄ± yoksa butonlarÄ± yanÄ±ltÄ±cÄ± baÅŸarÄ± yerine kapalÄ± tutar', async ({
    page,
  }) => {
    const disabledButtons = page.getByRole('button', {
      name: 'Ã–deme ayarÄ± bekleniyor',
    })

    await expect(disabledButtons).toHaveCount(2)
    await expect(disabledButtons.first()).toBeDisabled()
    await expect(page.getByText(/Ã‡ok yakÄ±nda/i)).toHaveCount(0)
  })

  test('mobil gÃ¶rÃ¼nÃ¼mde yatay taÅŸma veya hata katmanÄ± oluÅŸturmaz', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.reload()
    await page.waitForLoadState('networkidle')

    const layout = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      contentWidth: document.documentElement.scrollWidth,
      hasOverlay: Boolean(document.querySelector('[data-nextjs-dialog]')),
      textLength: document.body.innerText.trim().length,
    }))

    expect(layout.textLength).toBeGreaterThan(100)
    expect(layout.hasOverlay).toBe(false)
    expect(layout.contentWidth).toBeLessThanOrEqual(layout.viewportWidth)
  })
})

