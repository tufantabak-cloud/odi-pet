import { expect, type Page } from '@playwright/test';
import { test } from './fixtures';

test.use({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/605.1.15 Playwright',
});

async function waitForSplash(page: Page) {
  try {
    const splash = page.locator('[aria-label="AÃ§Ä±lÄ±ÅŸ ekranÄ±nÄ± geÃ§"]');
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

import { setCanonicalState } from './helpers/e2e-utils';

test.beforeEach(async ({ page }) => {
  await setCanonicalState(page);
});

test('Odi.Pet Auth & Onboarding Flow - Full Lifecycle', async ({ page }) => {
  page.on('console', msg => {
    console.log(`[Browser ${msg.type()}] ${msg.text()}`);
  });
  test.setTimeout(120000);
  const email = `e2e_test_${Date.now()}@gmail.com`;
  const password = 'StrongPassword123!';
  const petName = `Pati_${Date.now().toString().slice(-4)}`;

  // 1. KayÄ±t Olma (Register)
  console.log('Starting Register Flow...');
  await page.goto('/register?nosplash=true');
  await waitForSplash(page);
  
  await page.getByTestId('register-name-input').fill('E2E Test User');
  await page.getByTestId('register-email-input').fill(email);
  await page.getByTestId('register-email-input').press('Enter');
  await page.waitForTimeout(500);
  
  await page.waitForSelector('#password', { state: 'visible', timeout: 5000 });
  await waitForSplash(page);
  await page.fill('#password', password);
  await page.fill('#confirmPassword', password);
  await page.locator('#terms').check({ force: true });
  await page.getByTestId('register-submit-button').click({ force: true });
  await expect(page.locator('text=AramÄ±za HoÅŸ Geldiniz!')).toBeVisible({ timeout: 10000 });

  // KayÄ±t sonrasÄ± otomatik oturumu simÃ¼le etmek iÃ§in Ã§erezleri temizleyip sÄ±fÄ±rdan login olalÄ±m
  console.log('Clearing cookies to test clean Login Flow...');
  await page.context().clearCookies();

  // 2. GiriÅŸ Yapma (Login)
  console.log('Starting Login Flow...');
  await page.goto('/login?nosplash=true');
  await waitForSplash(page);
  
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]', { force: true });
  
  // Ä°lk defa giriÅŸ yaptÄ±ÄŸÄ± iÃ§in dashboard'a yÃ¶nlendirilmeli
  await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 15000 });
  await expect(page.locator('h2:has-text("HoÅŸ Geldiniz!"), h2:has-text("Ajanda"), h2:has-text("Petlerim"), a:has-text("Ä°lk Dostumu Ekle")').first()).toBeVisible({ timeout: 10000 });

  // Onboarding Wizard / Ä°lk Dostumu Ekle adÄ±mÄ±na tÄ±kla
  await page.click('a:has-text("Ä°lk Dostumu Ekle"), button:has-text("BaÅŸla ğŸ¾"), button:has-text("Devam Et")');
  
  // 3. Ä°lk Evcil Hayvan Ekleme (Onboarding - HÄ±zlÄ± KayÄ±t)
  console.log('Starting Pet Onboarding...');
  await expect(page).toHaveURL(/\/owner\/pets\/add/, { timeout: 15000 });

  // AdÄ±m 1: TÃ¼r SeÃ§imi (Kedi)
  await page.click('button:has-text("Kedi"), button[aria-label*="Kedi"]', { force: true });
  await page.waitForTimeout(1000);

  // AdÄ±m 2: Temel Bilgiler Formu
  await expect(page.locator('#name')).toBeVisible();
  await page.fill('#name', petName);
  await page.click('button:has-text("British Shorthair")', { force: true });
  await page.click('label:has(input[value="male"]), label:has-text("Erkek")', { force: true });
  await page.fill('[data-testid="pet-birthdate-input"], input[type="date"]', '2023-05-15');
  await page.locator('[data-testid="pet-birthdate-input"]').dispatchEvent('change').catch(() => {});
  await page.click('button:has-text("4")', { force: true }).catch(() => {});

  // Devam et (AdÄ±m 2 -> AdÄ±m 3)
  await expect(page.getByTestId('pet-save-button')).toBeEnabled({ timeout: 5000 });
  await page.getByTestId('pet-save-button').click();
  await page.waitForTimeout(1000);

  // AdÄ±m 3: Profil FotoÄŸrafÄ± Ekle (Zorunlu)
  const fileInput = page.getByTestId('pet-photo-input');
  await fileInput.setInputFiles({
    name: 'test-pet.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('fake-image-bytes')
  });
  await page.waitForTimeout(500);
  await page.click('button[data-testid="pet-profile-create-button"], button:has-text("Profili OluÅŸtur")', { force: true });
  await page.waitForTimeout(1000);

  // AdÄ±m 4: Acil Durum AÄŸÄ± (Atla)
  const skipBtn = page.locator('[data-testid="emergency-contact-skip-button"], button:has-text("Daha Sonra Ekle"), a:has-text("Daha Sonra Ekle"), button:has-text("Atla")').first();
  await expect(skipBtn).toBeVisible({ timeout: 10000 });
  await skipBtn.click({ force: true });

  // BaÅŸarÄ±yla eklenip baÅŸarÄ± ekranÄ±na veya dashboard'a yÃ¶nlendirildi mi?
  await expect(page).toHaveURL(/\/owner\/pets\/add\/success|\/owner\/dashboard/, { timeout: 15000 });

  // 4. Ã‡Ä±kÄ±ÅŸ Yapma (Logout)
  console.log('Starting Logout Flow...');
  await page.goto('/owner/profile?nosplash=true');
  await waitForSplash(page);
  const logoutBtn = page.locator('button:has-text("Hesaptan Ã‡Ä±kÄ±ÅŸ Yap")');
  await expect(logoutBtn).toBeVisible({ timeout: 10000 });
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Hesaptan Ã‡Ä±kÄ±ÅŸ Yap'));
    if (btn && btn.form) {
      btn.form.requestSubmit();
    } else if (btn) {
      btn.click();
    }
  });
  await expect(page).toHaveURL(/\/login/, { timeout: 15000 });

  // 5. Åifremi Unuttum (Forgot Password)
  console.log('Starting Password Reset Request...');
  await page.goto('/reset-password?nosplash=true');
  await waitForSplash(page);
  await page.fill('#email', email);
  await page.click('button[type="submit"]');
  try {
    await expect(page.locator('text=SÄ±fÄ±rlama baÄŸlantÄ±sÄ± gÃ¶nderildi')).toBeVisible({ timeout: 10000 });
    console.log('Password reset request successful!');
  } catch (e) {
    const errorText = await page.locator('[role="alert"]').innerText().catch(() => 'No alert found');
    const pageHtml = await page.locator('.card-base').innerHTML().catch(() => 'No card-base html');
    console.error('Password reset failed on page. Error shown:', errorText);
    console.error('Form HTML structure at failure:\n', pageHtml);
    throw e;
  }
});

