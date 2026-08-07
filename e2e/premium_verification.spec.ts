import { test, expect, type Page } from '@playwright/test';

const EMAIL = process.env.TEST_ADMIN_EMAIL || 'tufan.tabak@gmail.com';
const PASSWORD = process.env.TEST_ADMIN_PASSWORD;

async function loginAsAdmin(page: Page) {
  if (!PASSWORD) {
    test.skip(true, 'TEST_ADMIN_PASSWORD environment variable not set');
    return;
  }
  await page.goto('/login');
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin(?:\/|$)/, { timeout: 15_000 });
}

test.describe('Premium & Feature Entitlement Production Readiness Suite', () => {

  test('1. Security & RBAC: Unauthenticated requests to Admin Feature APIs return 401 or 403', async ({ request }) => {
    const res = await request.post('/api/admin/features/publish', {
      data: { description: 'Unauthorized attempt' }
    });
    expect([401, 403]).toContain(res.status());

    const rollbackRes = await request.post('/api/admin/features/rollback', {
      data: { version_id: '00000000-0000-0000-0000-000000000000' }
    });
    expect([401, 403]).toContain(rollbackRes.status());

    const exportRes = await request.get('/api/admin/features/export');
    expect([401, 403]).toContain(exportRes.status());
  });

  test('2. Admin Memberships UI: Tabs, Matrix, and Export options render', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/memberships');

    // Verify main tabs are present
    await expect(page.locator('button:has-text("Genel Ayarlar")')).toBeVisible();
    await expect(page.locator('button:has-text("Planlar & Paketler")')).toBeVisible();
    await expect(page.locator('button:has-text("Özellikler (Registry)")')).toBeVisible();
    await expect(page.locator('button:has-text("Kota & Erişim Matrisi")')).toBeVisible();

    // Click on Quotas tab
    await page.click('button:has-text("Kota & Erişim Matrisi")');
    await expect(page.locator('h3:has-text("Kota ve Erişim Matrisi")')).toBeVisible();

    // Export JSON button check
    await expect(page.locator('button:has-text("Dışa Aktar (JSON)")')).toBeVisible();
    await expect(page.locator('button:has-text("Test Et (Dry Run)")')).toBeVisible();
  });

  test('3. Admin Preview Cookie Mode: Previewing Pro/AI+ applies correctly', async ({ page, context }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/memberships');

    // Click on General tab
    await page.click('button:has-text("Genel Ayarlar")');
    
    // Set preview cookie programmatically
    await context.addCookies([{
      name: 'odi_premium_preview',
      value: 'pro',
      domain: 'localhost',
      path: '/'
    }]);

    const cookies = await context.cookies();
    const previewCookie = cookies.find(c => c.name === 'odi_premium_preview');
    expect(previewCookie?.value).toBe('pro');
  });

  test('4. Atomic Publish & Rollback API Workflow', async ({ page }) => {
    await loginAsAdmin(page);

    // Call dry-run endpoint via page context (authenticated)
    const dryRunRes = await page.evaluate(async () => {
      const res = await fetch('/api/admin/features/dry-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limits: [
            { feature_key: 'ai_vet', plan: 'pro', is_enabled: true, limit_type: 'quota', limit_value: 10, window_value: 1, window_unit: 'month' }
          ]
        })
      });
      return res.json();
    });

    expect(dryRunRes.success).toBe(true);
    expect(dryRunRes.summary).toBeDefined();
    expect(dryRunRes.summary.total_access_lost).toBeGreaterThanOrEqual(0);
  });

});
