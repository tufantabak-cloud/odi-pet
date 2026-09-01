import { expect, type Page, type APIRequestContext } from '@playwright/test';
import { test } from './fixtures';

const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

async function login(page: Page) {
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

test.describe('Lost Pet E2E Lifecycle Flow', () => {
  let petId: string;

  test('should create, verify, and resolve a lost pet report', async ({ page }) => {
    test.setTimeout(45000);

    // 1. Login
    await login(page);

    // 2. Create a temporary test pet via API within browser to prevent UI onboarding friction
    const tempPetName = `TempLost_${Math.floor(Math.random() * 9000) + 1000}`;
    const petResponse = await page.evaluate(async (name) => {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('species', 'dog');
      fd.append('breed', 'Golden Retriever');
      fd.append('birth_date', '2025-01-01');
      fd.append('gender', 'male');
      fd.append('is_neutered', 'false');
      fd.append('weight', '15');
      fd.append('city', 'İzmir');
      fd.append('district', 'Karşıyaka');

      const res = await fetch('/api/pets', {
        method: 'POST',
        body: fd
      });
      return res.json();
    }, tempPetName);

    expect(petResponse.success).toBe(true);
    petId = petResponse.pet.id;

    // 3. Navigate to Pet Detail Page
    await page.goto(`/owner/pets/${petId}`);
    await expect(page.locator(`h1:has-text("${tempPetName}")`).first()).toBeVisible();

    // 4. Open SOS Modal and click Lost Pet Report
    const sosButton = page.locator('button[aria-label="Acil SOS"]');
    await expect(sosButton).toBeVisible();
    await sosButton.click();

    const lostReportBtn = page.locator('button:has-text("Kayıp İlanı Ver")');
    await expect(lostReportBtn).toBeVisible();
    await lostReportBtn.click();

    // Step 1 of Wizard: Contact Phone
    const phoneInput = page.locator('input[type="tel"]');
    await expect(phoneInput).toBeVisible();
    await phoneInput.fill('05554443322');

    const nextBtn = page.locator('.rounded-modal button:has-text("Devam Et"), .fixed.z-\\[9999\\] button:has-text("Devam Et"), button:has-text("Devam Et")').first();
    await nextBtn.click();

    // Step 2 of Wizard: Location Details
    // Select city/district and add description
    await page.selectOption('select:near(label:has-text("İl"))', { label: 'İzmir' });
    await page.selectOption('select:near(label:has-text("İlçe"))', { label: 'Karşıyaka' });

    const addrTextarea = page.locator('textarea[placeholder*="Mahalle, sokak"]');
    await addrTextarea.fill('Bostanlı Sahil Yakınları');

    const submitBtn = page.locator('button:has-text("İlanı Yayınla")');
    await submitBtn.click();

    // Verify lost report is created by opening SOS modal again and seeing the active banner
    await page.goto(`/owner/pets/${petId}`);
    await expect(sosButton).toBeVisible();
    await sosButton.click();
    await expect(page.locator('text=KAYIP İLANI AKTİF')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Bostanlı Sahil Yakınları')).toBeVisible();
    
    // Close SOS Modal
    await page.locator('[data-testid="sos-modal-close"], .rounded-modal button:has-text("Kapat")').first().click();

    // 5. Navigate to Dashboard to verify the FloatingLostPets card is active and shows the new report
    await page.goto('/owner/dashboard');
    
    const floatingBtn = page.locator('button[aria-label="Kayıp İlanları"]');
    await expect(floatingBtn).toBeVisible();
    await floatingBtn.click();

    // Verify pet name and location are visible inside the modal
    await expect(page.locator(`p.text-text-primary:has-text("${tempPetName}")`)).toBeVisible();
    await expect(page.locator('text=Bostanlı Sahil Yakınları').first()).toBeVisible();
    
    // Close the floating lost pet list
    await page.locator('[data-testid="floating-lost-pets-close"], .rounded-sheet button:has-text("Kapat")').first().click();

    // 6. Go back to Pet Detail page and mark as Found via SOS Modal
    await page.goto(`/owner/pets/${petId}`);
    await expect(sosButton).toBeVisible();
    await sosButton.click();

    const foundButton = page.locator('button:has-text("Bulundu İşaretle")');
    await expect(foundButton).toBeVisible();
    
    // Mock the browser confirm dialog to automatically click OK
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Dostunuz bulundu mu?');
      await dialog.accept();
    });

    await foundButton.click();

    // Open SOS Modal again to verify status is cleared
    await page.goto(`/owner/pets/${petId}`);
    await expect(sosButton).toBeVisible();
    await sosButton.click();
    await expect(page.locator('text=KAYIP İLANI AKTİF')).not.toBeVisible({ timeout: 10000 });
    
    // Close SOS Modal
    await page.getByRole('button', { name: 'Kapat', exact: true }).click();

    // Cleanup: Delete the temp pet
    await page.evaluate(async (id) => {
      await fetch(`/api/pets/${id}`, { method: 'DELETE' });
    }, petId);
  });
});
