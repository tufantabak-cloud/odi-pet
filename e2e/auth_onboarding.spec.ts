import { test, expect, type Page } from '@playwright/test';

test.use({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
});



async function waitForSplash(page: Page) {
  try {
    // Wait for the splash screen images to be detached from the DOM
    await page.waitForSelector('img[alt="Splash 1"]', { state: 'detached', timeout: 8000 });
    await page.waitForSelector('img[alt="Splash 2"]', { state: 'detached', timeout: 8000 });
  } catch (e) {
    // Already gone or did not load
  }
}

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
  await page.goto('/register');
  await waitForSplash(page);
  
  await page.fill('#name', 'E2E Test User');
  await page.fill('#reg-email', email);
  await page.click('button:has-text("İleri")');
  
  await page.waitForSelector('#password', { state: 'visible', timeout: 5000 });
  await page.fill('#password', password);
  await page.fill('#confirmPassword', password);
  await page.check('#terms');
  
  await page.click('button[type="submit"]:has-text("Kayıt Ol ve Başla")');
  await expect(page.locator('text=Aramıza Hoş Geldiniz!')).toBeVisible({ timeout: 10000 });

  // Kayıt sonrası otomatik oturumu simüle etmek için çerezleri temizleyip sıfırdan login olalım
  console.log('Clearing cookies to test clean Login Flow...');
  await page.context().clearCookies();

  // 2. Giriş Yapma (Login)
  console.log('Starting Login Flow...');
  await page.goto('/login');
  await waitForSplash(page);
  
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  
  // İlk defa giriş yaptığı için dashboard'a yönlendirilmeli ve onboarding/spotlight turu açılmalı
  await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 15000 });
  await expect(page.locator('text=Anasayfa Paneli')).toBeVisible({ timeout: 10000 });

  // Onboarding Wizard adımlarını geç (SpotlightTour: Devam Et -> Devam Et -> Başla)
  await page.click('button:has-text("Devam Et")');
  await page.waitForTimeout(600);
  await page.click('button:has-text("Devam Et")');
  await page.waitForTimeout(600);
  await page.click('button:has-text("Başla 🐾")');
  
  // 3. İlk Evcil Hayvan Ekleme (Onboarding - Hızlı Kayıt)
  console.log('Starting Pet Onboarding...');
  await expect(page).toHaveURL(/\/owner\/pets\/add/, { timeout: 15000 });

  // Adım 1: Tür Seçimi (Kedi)
  await page.click('button:has-text("Kedi")');
  await page.waitForTimeout(1000);

  // Adım 2: Temel Bilgiler Formu
  await expect(page.locator('#name')).toBeVisible();
  await page.fill('#name', petName);
  await page.selectOption('#breed', 'British Shorthair');
  await page.click('label:has-text("♂ Erkek")');
  await page.fill('input[type="date"]', '2025-01-01');

  // Devam et
  await page.click('button:has-text("Devam Et →")');
  await page.waitForTimeout(1000);

  // Adım 3: Profil Fotoğrafı Ekle
  await page.click('button:has-text("Profili Oluştur")');
  await page.waitForTimeout(1000);

  // Adım 4: Acil Durum Ağı (Atla)
  await page.click('button:has-text("Atla →")');

  // Başarıyla eklenip başarı ekranına yönlendirildi mi?
  await expect(page).toHaveURL(/\/owner\/pets\/add\/success/, { timeout: 15000 });

  // 4. Çıkış Yapma (Logout)
  console.log('Starting Logout Flow...');
  await page.goto('/owner/profile');
  await waitForSplash(page);
  await page.waitForLoadState('networkidle');
  await page.click('button:has-text("Hesaptan Çıkış Yap")', { force: true });
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

  // 5. Şifremi Unuttum (Forgot Password)
  console.log('Starting Password Reset Request...');
  await page.goto('/reset-password');
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
