import type { Page } from '@playwright/test';

/**
 * Sayfa üzerinde beliren ve etkileşimi engelleyen gerçek kullanıcı diyaloglarını
 * (İzin Yönetimi modalı, Driver.js tanıtım turu) kanonik butonlarına tıklayarak kapatır.
 * Hiçbir global bayrak veya force: true hilesi kullanmaz; gerçek kullanıcı aksiyonunu simüle eder.
 */
export async function dismissBlockingOverlays(page: Page): Promise<void> {
  // 1. İzin Yönetimi Modalı (PermissionOnboarding - "Şimdi Değil" veya "Kapat" butonu)
  try {
    const dismissBtn = page.locator('button:has-text("Şimdi Değil"), button[aria-label="Kapat"]').first();
    if (await dismissBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dismissBtn.click();
      // Backdrop'un DOM'dan kalkmasını bekle
      await page.locator('.fixed.inset-0.z-50.bg-black\\/50').first().waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    }
  } catch {}

  // 2. Driver.js Tanıtım Turu (SpotlightTour - "Turu Atla" veya popover kapat butonu)
  try {
    const skipTourBtn = page.locator('.skip-tour-btn, button:has-text("Turu Atla"), .driver-popover-close-btn').first();
    if (await skipTourBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await skipTourBtn.click();
      // Overlay SVG'nin DOM'dan kalkmasını bekle
      await page.locator('.driver-overlay').first().waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
    }
  } catch {}
}
