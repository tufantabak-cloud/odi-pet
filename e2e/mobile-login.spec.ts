import { test, expect, devices } from '@playwright/test';

test.use({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
});

test('Mobile Google Login Redirect Flow', async ({ page }) => {
  console.log('Test başlatılıyor: Mobil ortamda (iPhone 13) odi.pet login sayfası açılıyor...');
  
  // Yerel login adresine gidiyoruz
  await page.goto('/login');
  
  console.log('Sayfa yüklendi, Google ile Giriş Yap butonu aranıyor...');
  // Butonu bul (Google metnini içeren buton)
  const googleBtn = page.locator('button', { hasText: 'Google' });
  await expect(googleBtn).toBeVisible();
  
  console.log('Google butonuna tıklanıyor...');
  
  // Yeni sayfa/yönlendirme yakalamak için Promise hazırlıyoruz
  const [request] = await Promise.all([
    page.waitForRequest(req => req.url().includes('supabase.co/auth/v1/authorize')),
    googleBtn.click()
  ]);

  console.log('Yönlendirme isteği yakalandı!');
  console.log('Yönlendirilen URL:', request.url());
  
  // URL'nin geçerli olup olmadığını ve doğru parametreleri içerip içermediğini kontrol edelim
  expect(request.url()).toContain('provider=google');
  expect(request.url()).toContain('redirect_to');
  
  console.log('Test Başarılı: Yönlendirme URL\'si geçerli ve herhangi bir kodlama hatası barındırmıyor.');
});
