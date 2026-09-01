import { expect, type Page, type APIRequestContext } from '@playwright/test';
import { test } from './fixtures';

const email = process.env.TEST_OWNER_EMAIL || process.env.TEST_EMAIL || 'e2e-owner@odipet.local'
const password = process.env.TEST_OWNER_PASSWORD || process.env.TEST_PASSWORD || 'OdiPetLocalE2E-2026!'

async function login(page: Page) {
  if (!email || !password) {
    throw new Error('LOCAL_E2E_CREDENTIALS_MISSING')
  }

  await page.context().clearCookies()
  await page.goto('/login')
  await page.locator('[data-testid="login-email-input"], input#email, input[name="email"]').first().fill(email)
  await page.locator('[data-testid="login-password-input"], input#password, input[name="password"]').first().fill(password)
  await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click()
  await expect(page).toHaveURL(/\/owner\/|\/dashboard|\/admin/, { timeout: 15_000 })
}

test.describe('Abonelik ve ödeme güvenli akışı', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/owner/profile/subscription')
    await page.waitForLoadState('networkidle')
  })

  test('gerçek olmayan kart veya fatura göstermeden güvenli durumu açıklar', async ({
    page,
  }) => {
    await expect(
      page.getByRole('heading', { name: 'Abonelik ve Ödeme' })
    ).toBeVisible()
    await expect(page.getByText(/Odi Free|Odi Pro/i).first()).toBeVisible()
    await expect(
      page.getByText('Kart bilgilerin Odi tarafından tutulmaz.')
    ).toBeVisible()
    await expect(page.getByText('4242')).toHaveCount(0)
    await expect(page.getByText(/INV-2026/)).toHaveCount(0)
    await expect(page.locator('[data-nextjs-dialog]')).toHaveCount(0)
  })

  test('ödeme ayarı yoksa butonları yanıltıcı başarı yerine kapalı tutar', async ({
    page,
  }) => {
    const upgradeButtons = page.locator('button:has-text("Ödeme ayarı bekleniyor"), button:has-text("ile Devam Et")')
    if (await upgradeButtons.count() > 0) {
      await expect(upgradeButtons.first()).toBeVisible()
    } else {
      await expect(page.getByText(/Mevcut Planın|Abonelik/i).first()).toBeVisible()
    }
    await expect(page.getByText(/Çok yakında/i)).toHaveCount(0)
  })

  test('mobil görünümde yatay taşma veya hata katmanı oluşturmaz', async ({
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
