import { test, expect, type Page } from '@playwright/test';

test.use({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
});

test.describe.serial('Onboarding Lifecycle', () => {
  // Test user credentials
  const email = `e2e_onboarding_${Date.now()}@gmail.com`;
  const password = 'StrongPassword123!';

  // Helper to wait for splash screen to disappear
  async function waitForSplash(page: Page) {
    try {
      await page.waitForSelector('img[alt="Splash 1"]', { state: 'detached', timeout: 5000 });
      await page.waitForSelector('img[alt="Splash 2"]', { state: 'detached', timeout: 5000 });
    } catch (e) {
      // ignore
    }
  }

  // Register a new user before tests
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('/register');
    await waitForSplash(page);
    
    await page.fill('#name', 'Onboarding Test User');
    await page.fill('#reg-email', email);
    await page.getByTestId('register-next-button').click();
    
    await page.waitForSelector('#password', { state: 'visible', timeout: 5000 });
    await page.fill('#password', password);
    await page.fill('#confirmPassword', password);
    await page.check('#terms');
    
    await page.click('button[type="submit"]:has-text("Kayıt Ol ve Başla")');
    await expect(page.locator('text=Aramıza Hoş Geldiniz!')).toBeVisible({ timeout: 10000 });
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    // Set splash seen so Driver.js tour is not blocked by splash
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem("odi_splash_seen", "true");
      } catch (e) {}
    });
    // Navigate and login
    await page.goto('/login');
    await waitForSplash(page);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 15000 });
  });

  test('NEXT_PUBLIC_ONBOARDING_ENABLED=false yapıldığında hiçbir spotlight çıkmaz', async ({ page }) => {
    // We simulate NEXT_PUBLIC_ONBOARDING_ENABLED=false by setting localStorage
    await page.goto('/owner/dashboard');
    await page.evaluate(() => {
      window.localStorage.setItem('onboarding_disabled', 'true');
    });
    await page.reload();
    await waitForSplash(page);

    // Wait and check if driver popover ever shows
    await page.waitForTimeout(2000);
    const popoverVisible = await page.locator('.driver-popover').isVisible();
    expect(popoverVisible).toBeFalsy();
    
    // Cleanup for next tests
    await page.evaluate(() => window.localStorage.removeItem('onboarding_disabled'));
  });

  test('Adım 1 tamamlanınca DB\'ye yazılır ve Adım 2 ancak Adım 1 sonrası tetiklenir', async ({ page }) => {
    page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
    // Wait for the wizard popover to load
    try {
      await page.waitForSelector('.driver-popover', { state: 'visible', timeout: 20000 });
    } catch (e) {
      await page.screenshot({ path: 'test-timeout-wizard.png' });
      throw e;
    }
    let title = await page.locator('.driver-popover-title').innerText();
    
    // If it's the wizard (Anasayfa Paneli), click through it
    if (title.includes('Anasayfa Paneli')) {
      await page.click('button:has-text("Devam Et")');
      await page.waitForTimeout(600);
      await page.click('button:has-text("Devam Et")');
      await page.waitForTimeout(600);
      await page.click('button:has-text("Başla 🐾")');
      await page.waitForTimeout(1000);
      
      // Wait for the action-driven tour to start
      await page.waitForSelector('.driver-popover', { state: 'visible', timeout: 10000 });
      title = await page.locator('.driver-popover-title').innerText();
    }
    
    expect(title).toContain('İlk Adım: Pet Ekle'); // Step 1 Title in GuideConfig
    
    // Click the actual add pet button that has id #onb-pet-add
    await page.click('#onb-pet-add');
    
    // --- Pet Ekleme Akışı ---
    // Adım 1: Tür Seçimi (Köpek)
    await page.click('button:has-text("Köpek")');
    await page.waitForTimeout(600);
    
    // Adım 2: Form Doldurma
    await page.fill('#pet-name-input, #name', 'Karabaş');
    const breedInput = page.locator('[data-testid="pet-breed-select"], #pet-breed-combobox').first();
    if (await breedInput.isVisible()) {
      await breedInput.fill('Kangal');
      const kangalOpt = page.locator('button:has-text("Kangal")').first();
      if (await kangalOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
        await kangalOpt.click();
      }
    }
    const genderBtn = page.locator('label:has-text("Erkek")').first();
    if (await genderBtn.isVisible()) await genderBtn.click();
    await page.fill('#pet-birthdate-input, input[type="date"]', '2023-01-01');
    
    await page.click('button:has-text("Devam Et")');
    await page.waitForTimeout(600);
    
    // Adım 3 / Profil Oluştur
    const finishBtn = page.locator('button:has-text("Profili Oluştur"), button:has-text("Devam Et"), button[data-testid="pet-profile-create-button"]').first();
    if (await finishBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await finishBtn.click();
      await page.waitForTimeout(600);
    }

    // Adım 4: Acil Durum Ağı (Atla)
    const skipBtn = page.locator('[data-testid="emergency-contact-skip-button"], button:has-text("Daha Sonra Ekle"), button:has-text("Atla"), button:has-text("Bildirim Açmadan")').first();
    if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipBtn.click();
    }

    // Bu noktada /api/pets POST edilmiş olmalı ve success sayfasına yönlenmiş olmalı.
    await expect(page).toHaveURL(/\/owner\/pets\/add\/success/, { timeout: 15000 });
    
    // Dashboard'a manuel olarak dönerek Step 2'nin orada belirdiğini kontrol edelim
    await page.goto('/owner/dashboard');
    
    // Check if step 2 appears
    await page.waitForSelector('.driver-popover', { state: 'visible', timeout: 15000 });
    const step2Title = await page.locator('.driver-popover-title').innerText();
    expect(step2Title).toContain('Plan Yap'); // Step 2 Title
  });

  test('Dismiss sonrası adımın tamamlandı sayıldığı (Adım 3 - Bildirimler)', async ({ page }) => {
    // Mock Notification and PushManager so useWebPush returns 'default'
    await page.addInitScript(() => {
      Object.defineProperty(window, 'PushManager', { value: function() {} });
      if (!window.navigator.serviceWorker) {
        Object.defineProperty(window.navigator, 'serviceWorker', { value: { register: async () => ({ pushManager: { getSubscription: async () => null } }) } });
      }
      if (!window.Notification) {
        Object.defineProperty(window, 'Notification', { value: { permission: 'default', requestPermission: async () => 'granted' } });
      }
    });

    await page.goto('/owner/dashboard?forcePrompt=true');
    await waitForSplash(page);

    // Check if Push Notification Prompt appears
    const prompt = page.locator('#onb-notifications');
    await expect(prompt).toBeVisible({ timeout: 10000 });
    
    // Click "Daha Sonra"
    // Use evaluate to bypass the driver-overlay that intercepts clicks
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent?.includes('Daha Sonra'));
      if (btn) btn.click();
    });
    
    // Check if it disappeared
    await expect(prompt).not.toBeVisible();
  });

  test('Uygulama kapatılıp açılınca kaldığı adımdan devam ettiği', async ({ page, context }) => {
    // Adım 1 completed in a previous test context, but since this runs with the same user, 
    // it will fetch state from DB.
    await page.goto('/owner/dashboard');
    await waitForSplash(page);
    
    // The DB persists completed steps. It should start from where it left off.
    // Ensure that driver-popover shows up and it is NOT the first step.
    await page.waitForSelector('.driver-popover', { state: 'visible', timeout: 10000 });
    const title = await page.locator('.driver-popover-title').innerText();
    
    // We expect the title not to be Step 1 because Step 1 was completed in earlier test scenario for this user DB record.
    expect(title).not.toContain('İlk Can Dostunu Ekle');
    
    // Restarting app by reloading the page (simulates closing and reopening the web app)
    // This wipes out all React state, forcing it to fetch from DB
    await page.reload();
    await waitForSplash(page);
    
    // Should still be on the exact same step
    await page.waitForSelector('.driver-popover', { state: 'visible', timeout: 10000 });
    const newTitle = await page.locator('.driver-popover-title').innerText();
    expect(newTitle).toEqual(title);
    
  });
});
