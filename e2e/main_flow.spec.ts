import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

/**
 * Login helper – reusable across all test files.
 * Skips if credentials are not set.
 */
async function login(page: Page) {
  if (!EMAIL || !PASSWORD) {
    test.skip(true, 'TEST_EMAIL / TEST_PASSWORD not set.');
    return;
  }
  await page.goto('/login');
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/owner\//, { timeout: 15_000 });
}

// ---------------------------------------------------------------------------
// Auth flow
// ---------------------------------------------------------------------------

test.describe('Auth Flow', () => {
  test('Login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Shows error for wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'badpassword');
    await page.click('button[type="submit"]');
    // Expect an error message to appear (could be a toast/alert or inline)
    await expect(
      page.locator('[role="alert"], .error, [data-testid="login-error"]').first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('Authenticated user is redirected away from /login', async ({ page }) => {
    await login(page);
    await page.goto('/login');
    // Should redirect back to dashboard
    await expect(page).toHaveURL(/\/owner\//, { timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Dashboard loads and shows pet cards or empty state', async ({ page }) => {
    await page.goto('/owner/dashboard');
    await page.waitForLoadState('networkidle');
    // Either pet cards or the "add first pet" CTA should be visible
    const hasPets = await page.locator('[data-testid="pet-card"]').count();
    const hasEmptyState = await page.locator('text=İlk Peti Ekle, text=Hayvan Ekle').count();
    expect(hasPets + hasEmptyState).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Pets
// ---------------------------------------------------------------------------

test.describe('Pets Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Pet list page is accessible', async ({ page }) => {
    await page.goto('/owner/pets');
    await page.waitForLoadState('networkidle');
    // Either see a pet list or the empty-state CTA
    await expect(
      page.locator('h1, h2').filter({ hasText: /Pet|Hayvan|Pati|Can Dost/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
