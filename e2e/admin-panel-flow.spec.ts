import { test, expect, type Page } from '@playwright/test';

const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

async function loginAsAdmin(page: Page) {
  if (!EMAIL || !PASSWORD) {
    test.skip(true, 'TEST_EMAIL / TEST_PASSWORD not set.');
    return;
  }
  await page.goto('/login');
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin|\/owner\//, { timeout: 15_000 });
}

test.describe('Dynamic Admin Panel E2E flow', () => {

  test('1. Role & Permission Check: Unauthorized redirect to login/dashboard', async ({ page, context }) => {
    // Clear cookies to simulate unauthenticated user
    await context.clearCookies();

    // Try navigating to admin route
    await page.goto('/admin');
    
    // Unauthenticated user should be redirected to login page
    await expect(page).toHaveURL(/\/login\?reason=(admin_required|session_expired)/);
  });

  test('2. Data Sync: Added pet displays immediately in Admin Pet list', async ({ page }) => {
    await loginAsAdmin(page);

    // Create a temporary pet
    const tempPetName = `SyncPet_${Math.floor(Math.random() * 9000) + 1000}`;
    const petResponse = await page.evaluate(async (name) => {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('species', 'Kedi');
      fd.append('breed', 'British Shorthair');
      fd.append('birth_date', '2025-01-01');
      fd.append('gender', 'female');
      fd.append('is_neutered', 'true');
      fd.append('weight', '4.2');
      fd.append('city', 'İstanbul');
      fd.append('district', 'Kadıköy');

      const res = await fetch('/api/pets', {
        method: 'POST',
        body: fd
      });
      return res.json();
    }, tempPetName);

    expect(petResponse.success).toBe(true);
    const petId = petResponse.pet.id;

    // Navigate to Admin Pet Management
    await page.goto('/admin/pets');
    
    // Verify the newly added pet is synced and listed
    await expect(page.locator(`text=${tempPetName}`)).toBeVisible();

    // Cleanup: Delete the pet
    await page.evaluate(async (id) => {
      await fetch(`/api/pets/${id}`, { method: 'DELETE' });
    }, petId);
  });

  test('3. User Detail View & Role/Status Management', async ({ page }) => {
    await loginAsAdmin(page);

    // Get current user profile ID by searching via admin API (search is case-insensitive, but we can match manually)
    const searchRes = await page.evaluate(async (email) => {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(email)}`);
      const data = await res.json();
      return data.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())?.id || null;
    }, EMAIL || 'tufan.tabak@gmail.com');

    expect(searchRes).not.toBeNull();

    // Go to user detail page in admin console
    await page.goto(`/admin/users/${searchRes}`);
    
    // Check that user detail cards (Subscription, Events, Role) are rendered
    await expect(page.locator('text=Kullanıcılar').first()).toBeVisible();
    await expect(page.locator('text=🔑 Rol Değiştir')).toBeVisible();

    // Verify option components exist in the Role Selector Form
    await expect(page.locator('label[for="role-option-owner"]')).toBeVisible();
  });

  test('4. Logout Process: Admin Console logout redirects correctly', async ({ page }) => {
    await loginAsAdmin(page);

    // Go to admin panel
    await page.goto('/admin');
    
    // Trigger logout form submit button
    const logoutBtn = page.locator('button:has-text("Çıkış Yap")').first();
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Verify user is logged out and redirected back to login screen
    await expect(page).toHaveURL(/\/login/);
  });

});
