import { expect, type Page } from '@playwright/test';
import { test } from './fixtures';

const EMAIL = process.env.TEST_EMAIL || 'e2e-owner@odipet.local'
const PASSWORD = process.env.TEST_PASSWORD || 'Password123!'

async function waitForSplash(page: Page) {
  try {
    const splash = page.locator('[aria-label="AÃ§Ä±lÄ±ÅŸ ekranÄ±nÄ± geÃ§"]');
    if (await splash.count() > 0) {
      await splash.click({ force: true }).catch(() => {});
      await splash.waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
    }
  } catch (e) {}
}

async function login(page: Page) {
  if (!EMAIL || !PASSWORD) {
    test.skip(true, 'TEST_EMAIL / TEST_PASSWORD not set.')
    return
  }

  await page.goto('/login?nosplash=true')
  await page.waitForSelector('input[name="email"]', { timeout: 10000 })
  await page.fill('input[name="email"]', EMAIL)
  await page.fill('input[name="password"]', PASSWORD)
  await page.click('button[type="submit"]', { force: true })
  await expect(page).toHaveURL(
    /\/admin|\/(owner|clinic|sitter|trainer|groomer|hotel)\//,
    { timeout: 20_000 },
  )
}

test.describe('Auth Flow', () => {
  test('Login page renders correctly', async ({ page }) => {
    await page.goto('/login?nosplash=true')
    await waitForSplash(page)
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('Shows error for wrong credentials', async ({ page }) => {
    await page.goto('/login?nosplash=true')
    await waitForSplash(page)
    await page.fill('input[name="email"]', 'wrong@example.com')
    await page.fill('input[name="password"]', 'badpassword')
    await page.click('button[type="submit"]', { force: true })
    await expect(
      page.locator('[role="alert"], .error, [data-testid="login-error"]').first(),
    ).toBeVisible({ timeout: 8_000 })
  })

  test('Authenticated user is redirected away from /login', async ({
    page,
  }) => {
    await login(page)
    await page.goto('/login?nosplash=true')
    await waitForSplash(page)
    await expect(page).toHaveURL(
      /\/admin|\/(owner|clinic|sitter|trainer|groomer|hotel)\//,
      { timeout: 10_000 },
    )
  })
})

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('Dashboard loads and shows pet cards or empty state', async ({ page }) => {
    await page.goto('/owner/dashboard?nosplash=true')
    await waitForSplash(page)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Petlerim', { exact: true })).toBeVisible()
    await expect(page.getByText('Moka E2E', { exact: true })).toBeVisible()
  })
})

test.describe('Pets Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('Pet shortcut returns to dashboard and exposes the seeded pet', async ({
    page,
  }) => {
    await page.goto('/owner/pets?nosplash=true')
    await expect(page).toHaveURL('/owner/dashboard')
    await expect(page.getByText('Moka E2E', { exact: true })).toBeVisible()
  })
})

