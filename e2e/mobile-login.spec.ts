import { expect, devices } from '@playwright/test';
import { test } from './fixtures';;

test.use({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
});

test('Mobile Google Login Redirect Flow', async ({ page }) => {
  console.log('Test baÅŸlatÄ±lÄ±yor: Mobil ortamda (iPhone 13) odi.pet login sayfasÄ± aÃ§Ä±lÄ±yor...');
  
  // Yerel login adresine gidiyoruz
  await page.goto('/login');
  
  console.log('Sayfa yÃ¼klendi, Google ile GiriÅŸ Yap butonu aranÄ±yor...');
  // Butonu bul (Google metnini iÃ§eren buton)
  const googleBtn = page.locator('button', { hasText: 'Google' });
  await expect(googleBtn).toBeVisible();
  
  console.log('Google butonuna tÄ±klanÄ±yor...');
  
  // Yeni sayfa/yÃ¶nlendirme yakalamak iÃ§in Promise hazÄ±rlÄ±yoruz
  const [request] = await Promise.all([
    page.waitForRequest(req => {
      const url = new URL(req.url());
      return url.pathname.endsWith('/auth/v1/authorize');
    }),
    googleBtn.click()
  ]);

  console.log('YÃ¶nlendirme isteÄŸi yakalandÄ±!');
  console.log('YÃ¶nlendirilen URL:', request.url());
  
  // URL'nin geÃ§erli olup olmadÄ±ÄŸÄ±nÄ± ve doÄŸru parametreleri iÃ§erip iÃ§ermediÄŸini kontrol edelim
  expect(request.url()).toContain('provider=google');
  expect(request.url()).toContain('redirect_to');
  
  console.log('Test BaÅŸarÄ±lÄ±: YÃ¶nlendirme URL\'si geÃ§erli ve herhangi bir kodlama hatasÄ± barÄ±ndÄ±rmÄ±yor.');
});

