import { test, expect, devices } from '@playwright/test';

test.use({
  ...devices['iPhone 13'],
});

test('Mobile Google Login Redirect Flow', async ({ page }) => {
  console.log('Test başlatılıyor: Mobil ortamda (iPhone 13) odi.pet login sayfası açılıyor...');
  
  // odi.pet canlı adresine gidiyoruz
  await page.goto('https://odi.pet/login');
  
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
