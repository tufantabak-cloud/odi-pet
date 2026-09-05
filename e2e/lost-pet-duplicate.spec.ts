import { expect, type Page, type APIRequestContext } from '@playwright/test';
import { test } from './fixtures';

const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;
const PET_ID = process.env.TEST_PET_ID;

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

test.describe('Lost Pet Duplicate Prevention API Test', () => {
  test('API should return 200 for first report and 400 for duplicate', async ({ page }) => {
    test.setTimeout(30000); // Allow extra time

    // Login via browser to establish session cookies
    await login(page);

    // If PET_ID is not explicitly provided in environment, create a temporary pet dynamically
    let targetPetId = PET_ID;
    let createdDynamicPet = false;
    if (!targetPetId) {
      const petResponse = await page.evaluate(async (name) => {
        const fd = new FormData();
        fd.append('name', name);
        fd.append('species', 'dog');
        fd.append('breed', 'Golden Retriever');
        fd.append('birth_date', '2023-01-01');
        fd.append('gender', 'male');
        fd.append('is_neutered', 'false');
        fd.append('weight', '12.0');
        fd.append('city', 'İzmir');
        fd.append('district', 'Karşıyaka');
        const res = await fetch('/api/pets', { method: 'POST', body: fd });
        return res.json();
      }, `TempDup_${Date.now().toString().slice(-4)}`);

      if (petResponse.success && petResponse.pet?.id) {
        targetPetId = petResponse.pet.id;
        createdDynamicPet = true;
      }
    }

    if (!targetPetId) {
      throw new Error('Target pet could not be determined for duplicate test.');
    }

    // Run the API requests directly in the browser using fetch
    const result = await page.evaluate(async (petId) => {
      // Step 0: Clean up
      await fetch(`/api/pets/${petId}/lost`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'found' })
      });

      // Step 1: Create a new lost report (First Request)
      const res1 = await fetch(`/api/pets/${petId}/lost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          last_seen_location: 'E2E Test Location',
          contact_phone: '05555555555'
        })
      });
      const status1 = res1.status;
      const body1 = await res1.json().catch(() => ({}));

      // Step 2: Try to create another one immediately (Second Request)
      const res2 = await fetch(`/api/pets/${petId}/lost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          last_seen_location: 'E2E Duplicate Attempt',
          contact_phone: '05555555555'
        })
      });
      const status2 = res2.status;
      const body2 = await res2.json().catch(() => ({}));

      // Step 3: Cleanup again
      await fetch(`/api/pets/${petId}/lost`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'found' })
      });

      return { status1, body1, status2, body2 };
    }, targetPetId);

    expect(result.status1).toBe(200);
    expect(result.body1.success).toBe(true);
    
    expect(result.status2).toBe(400);
    expect(result.body2.error).toBe('Bu pet için zaten aktif bir kayıp ilanı var');

    if (createdDynamicPet && targetPetId) {
      await page.evaluate(async (petId) => {
        await fetch(`/api/pets/${petId}`, { method: 'DELETE' });
      }, targetPetId);
    }
  });
});
