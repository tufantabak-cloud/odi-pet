import { test, expect } from '@playwright/test';

test.describe('Feature Registry & Admin Certification E2E', () => {
  test('should enforce route protection and redirect unauthenticated users to login', async ({ page }) => {
    // Attempt to navigate to Admin features page without auth session
    await page.goto('/admin/features');

    // Verify middleware redirects unauthenticated request to login page
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('body')).toContainText(/Giriş|login/i);
  });
});
