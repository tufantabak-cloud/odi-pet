import { test, expect, type Page } from '@playwright/test';

test.use({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/605.1.15 Playwright',
});

async function waitForSplash(page: Page) {
  try {
    const splash = page.locator('[aria-label="Açılış ekranını geç"]');
    for (let i = 0; i < 30; i++) {
      if (await splash.count() > 0) {
        await splash.click({ force: true }).catch(() => {});
        await splash.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
        break;
      }
      await page.waitForTimeout(100);
    }
  } catch (e) {}
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("odi_splash_seen", "true");
    } catch (e) {}
  });
});

test('Odi.Pet Auth & Onboarding Flow - Full Lifecycle', async ({ page }) => {
  page.on('console', msg => {
    console.log(`[Browser ${msg.type()}] ${msg.text()}`);
  });
  test.setTimeout(120000);
  const email = `e2e_test_${Date.now()}@gmail.com`;
  const password = 'StrongPassword123!';
  const petName = `Pati_${Date.now().toString().slice(-4)}`;

  // 1. Kayıt Olma (Register)
  console.log('Starting Register Flow...');
  await page.goto('/register?nosplash=true');
  await waitForSplash(page);
  
  await page.getByTestId('register-name-input').fill('E2E Test User');
  await page.getByTestId('register-email-input').fill(email);
  const nextBtn = page.getByTestId('register-next-button');
  if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nextBtn.click();
  } else {
    await page.getByTestId('register-email-input').press('Enter');
  }
  await page.waitForTimeout(500);
  
  await page.waitForSelector('#password', { state: 'visible', timeout: 5000 });
  await waitForSplash(page);
  await page.fill('#password', password);
  await page.fill('#confirmPassword', password);
  await page.locator('#terms').check({ force: true });
  await page.getByTestId('register-submit-button').click({ force: true });
  await expect(page.locator('text=Aramıza Hoş Geldiniz!')).toBeVisible({ timeout: 10000 });

  // Kayıt sonrası otomatik oturumu simüle etmek için çerezleri temizleyip sıfırdan login olalım
  console.log('Clearing cookies to test clean Login Flow...');
  await page.context().clearCookies();

  // 2. Giriş Yapma (Login)
  console.log('Starting Login Flow...');
  await page.goto('/login?nosplash=true');
  await waitForSplash(page);
  
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]', { force: true });
  
  // İlk defa giriş yaptığı için dashboard'a yönlendirilmeli
  await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 15000 });
  await expect(page.locator('h2:has-text("Hoş Geldiniz!"), h2:has-text("Ajanda"), h2:has-text("Petlerim"), a:has-text("İlk Dostumu Ekle")').first()).toBeVisible({ timeout: 10000 });

  // Onboarding Wizard / İlk Dostumu Ekle adımına tıkla
  await page.click('a:has-text("İlk Dostumu Ekle"), button:has-text("Başla 🐾"), button:has-text("Devam Et")');
  
  // 3. İlk Evcil Hayvan Ekleme (Onboarding - Hızlı Kayıt)
  console.log('Starting Pet Onboarding...');
  await expect(page).toHaveURL(/\/owner\/pets\/add/, { timeout: 15000 });

  // Adım 1: Tür Seçimi (Kedi)
  await page.click('button:has-text("Kedi"), button[aria-label*="Kedi"]', { force: true });
  await page.waitForTimeout(1000);

  // Adım 2: Temel Bilgiler Formu
  const nameInput = page.locator('#pet-name-input, #name, input[placeholder*="Boncuk"]').first();
  await expect(nameInput).toBeVisible({ timeout: 10000 });
  await nameInput.fill(petName);

  const breedInput = page.locator('[data-testid="pet-breed-select"], #pet-breed-combobox').first();
  if (await breedInput.isVisible()) {
    await breedInput.fill('British Shorthair');
    const breedOpt = page.locator('button:has-text("British Shorthair")').first();
    if (await breedOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
      await breedOpt.click();
    }
  }

  const genderBtn = page.locator('label:has-text("Erkek")').first();
  if (await genderBtn.isVisible()) await genderBtn.click();

  const birthDateInput = page.locator('[data-testid="pet-birthdate-input"], #pet-birthdate-input, input[type="date"]').first();
  if (await birthDateInput.isVisible()) await birthDateInput.fill('2023-05-15');

  // Devam et
  const nextStepBtn = page.locator('button:has-text("Devam Et"), button[data-testid="pet-save-button"]').first();
  if (await nextStepBtn.isVisible()) {
    await nextStepBtn.click();
    await page.waitForTimeout(600);
  }

  // Adım 3: Devam veya Profil Oluştur
  const finishBtn = page.locator('button:has-text("Profili Oluştur"), button:has-text("Devam Et"), button[data-testid="pet-profile-create-button"]').first();
  if (await finishBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await finishBtn.click();
    await page.waitForTimeout(600);
  }

  // Adım 4: Acil Durum Ağı (Atla)
  const skipBtn = page.locator('[data-testid="emergency-contact-skip-button"], button:has-text("Daha Sonra Ekle"), a:has-text("Daha Sonra Ekle"), button:has-text("Atla"), button:has-text("Bildirim Açmadan")').first();
  if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await skipBtn.click({ force: true });
  }

  // Başarıyla eklenip başarı ekranına veya dashboard'a yönlendirildi mi?
  await expect(page).toHaveURL(/\/owner\/pets\/add\/success|\/owner\/dashboard/, { timeout: 15000 });

  // 4. Çıkış Yapma (Logout)
  console.log('Starting Logout Flow...');
  await page.goto('/owner/profile?nosplash=true');
  await waitForSplash(page);
  const logoutBtn = page.locator('button:has-text("Hesaptan Çıkış Yap")');
  await expect(logoutBtn).toBeVisible({ timeout: 10000 });
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Hesaptan Çıkış Yap'));
    if (btn && btn.form) {
      btn.form.requestSubmit();
    } else if (btn) {
      btn.click();
    }
  });
  await expect(page).toHaveURL(/\/login/, { timeout: 15000 });

  // 5. Şifremi Unuttum (Forgot Password)
  console.log('Starting Password Reset Request...');
  await page.goto('/reset-password?nosplash=true');
  await waitForSplash(page);
  await page.fill('#email', email);
  await page.click('button[type="submit"]');
  try {
    await expect(page.locator('text=Sıfırlama bağlantısı gönderildi')).toBeVisible({ timeout: 10000 });
    console.log('Password reset request successful!');
  } catch (e) {
    const errorText = await page.locator('[role="alert"]').innerText().catch(() => 'No alert found');
    const pageHtml = await page.locator('.card-base').innerHTML().catch(() => 'No card-base html');
    console.error('Password reset failed on page. Error shown:', errorText);
    console.error('Form HTML structure at failure:\n', pageHtml);
    throw e;
  }
});
