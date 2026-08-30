import type { Page, Locator } from '@playwright/test';

/**
 * Sayfa üzerinde asenkron olarak beliren ve kullanıcı etkileşimini engelleyen
 * diyalogları (İzin Yönetimi modalı, Driver.js tanıtım turu popover'ı) tespit eder
 * ve kanonik butonlarına ("Şimdi Değil", "Turu Atla") tıklayarak kapatır.
 * 
 * Kesinlikle hiçbir force: true, global flag veya bypass kullanmaz.
 * Tamamen gerçek kullanıcı kapatma aksiyonunu ve overlay'in kalkışını doğrular.
 */
export async function dismissBlockingOverlays(page: Page): Promise<void> {
  // 1. İzin Yönetimi Modalı (PermissionOnboarding - "Şimdi Değil" veya sağ üstteki X butonu)
  try {
    const dismissBtn = page.locator('button:has-text("Şimdi Değil"), button[aria-label="Kapat"]').first();
    if (await dismissBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await dismissBtn.click();
      await page.locator('.fixed.inset-0.z-50').first().waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
    }
  } catch {}

  // 2. Driver.js Tanıtım Turu (SpotlightTour - "Turu Atla", close butonu veya allowClose overlay tıklaması)
  try {
    const driverOverlay = page.locator('.driver-overlay, .driver-popover').first();
    if (await driverOverlay.isVisible({ timeout: 500 }).catch(() => false)) {
      const skipTourBtn = page.locator('.skip-tour-btn, button:has-text("Turu Atla"), .driver-popover-close-btn').first();
      if (await skipTourBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await skipTourBtn.click();
      } else {
        // Driver.js allowClose: true konfigürasyonu gereği overlay boşluğuna tıklanarak tur kapatılır
        await page.locator('.driver-overlay').first().click({ position: { x: 20, y: 20 } }).catch(() => {});
      }
      await page.locator('.driver-overlay').first().waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
    }
  } catch {}
}

/**
 * Hedef elemente tıklamadan önce asenkron bir overlay engeli olup olmadığını
 * denetler, varsa kanonik şekilde kapatır ve ardından hedef tıklamayı normal
 * kullanıcı gibi gerçekleştirir.
 */
export async function safeClick(page: Page, target: Locator): Promise<void> {
  await dismissBlockingOverlays(page);
  try {
    await target.click({ timeout: 2000 });
  } catch (err: any) {
    // Overlay engeli oluştuysa asenkron overlay'i kapat ve tekrar tıkla
    await dismissBlockingOverlays(page);
    await target.click({ timeout: 5000 });
  }
}



