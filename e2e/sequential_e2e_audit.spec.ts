import { test, expect, Page } from '@playwright/test';

const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

async function doLogin(page: Page) {
  await page.goto('/login');
  try {
    await page.waitForSelector('img[alt="Splash 1"]', { state: 'detached', timeout: 5000 });
  } catch (e) {}

  await page.fill('input[name="email"]', EMAIL || '');
  await page.fill('input[name="password"]', PASSWORD || '');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 15000 });
}

test.describe('E2E Audit of Odi.Pet Pages', () => {
  test.setTimeout(180 * 1000); // 3 minutes timeout

  test('E2E Walkthrough and Audit', async ({ page }) => {
    // Enable console and page error logs collection
    const consoleLogs: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    // 1. Login
    console.log('--- Logging in ---');
    await doLogin(page);

    // List of URLs to check and report
    const targets = [
      { name: 'Dashboard', url: '/owner/dashboard' },
      { name: 'Pets List', url: '/owner/pets' },
      { name: 'AI Vet', url: '/owner/ai-vet' },
      { name: 'Services', url: '/owner/services' },
      { name: 'Social', url: '/owner/social' },
      { name: 'Vets (Marketplace)', url: '/owner/vets' },
      { name: 'Notifications', url: '/owner/notifications' },
      { name: 'Profile', url: '/owner/profile' },
      { name: 'Admin Panel', url: '/admin' }
    ];

    const results: any[] = [];

    // Let's first extract the Pet IDs dynamically from /owner/pets
    console.log('--- Navigating to Pets List to extract dynamic Pet IDs ---');
    await page.goto('/owner/pets');
    await page.waitForTimeout(2000);
    
    // Find all links matching /owner/pets/[id]
    const petLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .map(a => a.getAttribute('href'))
        .filter(href => href && /^\/owner\/pets\/[0-9a-fA-F-]{36}$/.test(href)) as string[];
    });
    const uniquePetLinks = Array.from(new Set(petLinks));
    console.log('Found dynamic pet details links:', uniquePetLinks);

    let petId = '';
    if (uniquePetLinks.length > 0) {
      const match = uniquePetLinks[0].match(/\/owner\/pets\/([0-9a-fA-F-]{36})/);
      if (match) petId = match[1];
    }
    
    if (petId) {
      targets.push({ name: 'Pet Detail Page', url: `/owner/pets/${petId}` });
      targets.push({ name: 'Pet Journal', url: `/owner/pets/${petId}/journal` });
      targets.push({ name: 'Pet Nutrition', url: `/owner/pets/${petId}/nutrition` });
      targets.push({ name: 'Pet Treatments', url: `/owner/pets/${petId}/treatments` });
      targets.push({ name: 'Pet Care', url: `/owner/pets/${petId}/care` });
    } else {
      console.log('WARNING: No pets found in list, will use fallback / TEST_PET_ID if set');
      const testPetId = process.env.TEST_PET_ID;
      if (testPetId) {
        targets.push({ name: 'Pet Detail Page', url: `/owner/pets/${testPetId}` });
        targets.push({ name: 'Pet Journal', url: `/owner/pets/${testPetId}/journal` });
        targets.push({ name: 'Pet Nutrition', url: `/owner/pets/${testPetId}/nutrition` });
        targets.push({ name: 'Pet Treatments', url: `/owner/pets/${testPetId}/treatments` });
        targets.push({ name: 'Pet Care', url: `/owner/pets/${testPetId}/care` });
      }
    }

    // Now visit all targets sequentially
    for (const target of targets) {
      console.log(`Auditing target: ${target.name} (${target.url})`);
      
      // Clear logs from previous page
      consoleLogs.length = 0;
      pageErrors.length = 0;
      
      let status = 'SUCCESS';
      let errorDetails = '';
      let statusCode = 200;

      try {
        const response = await page.goto(target.url, { waitUntil: 'load', timeout: 15000 });
        if (response) {
          statusCode = response.status();
        }
        await page.waitForTimeout(2000); // Allow react hydration and fetch to complete
        
        // Take a screenshot of each page for proof
        const artifactDir = process.env.ARTIFACT_DIR || 'test-results';
        const screenshotPath = `${artifactDir}/${target.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
        try {
          await page.screenshot({ path: screenshotPath });
        } catch (e) {}

        // Basic check for error page indicator, empty screen, or crash
        const content = await page.content();
        const lowerContent = content.toLowerCase();
        
        if (statusCode >= 400) {
          status = 'ERROR';
          errorDetails = `HTTP error status ${statusCode}`;
        } else if (lowerContent.includes('something went wrong') || lowerContent.includes('bir hata oluştu') || lowerContent.includes('not found') || lowerContent.includes('bulunamadı')) {
          status = 'ERROR';
          errorDetails = `Page content contains error indicators.`;
        } else if (pageErrors.length > 0) {
          status = 'WARNING';
          errorDetails = `Javascript console errors: ${pageErrors.join(' | ')}`;
        }
      } catch (e: any) {
        status = 'ERROR';
        errorDetails = e.message;
      }

      results.push({
        name: target.name,
        url: target.url,
        status,
        statusCode,
        errorDetails,
        consoleErrors: [...pageErrors]
      });
    }

    console.log('RESULTS_OUTPUT_MARKER_START');
    console.log(JSON.stringify(results, null, 2));
    console.log('RESULTS_OUTPUT_MARKER_END');
  });

});
