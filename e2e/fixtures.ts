import { test as baseTest, expect } from '@playwright/test';

export const test = baseTest.extend({
  page: async ({ page }, use) => {
    // Contract 3: Canonical E2E Overlay / Permission State
    await page.addInitScript(() => {
      try {
        window.sessionStorage.setItem('odi_splash_seen', 'true');
        window.localStorage.setItem('odi_permission_onboarding_completed', 'true');
        window.localStorage.setItem('onboarding_disabled', 'true');
      } catch (e) {}
    });
    await use(page);
  }
});
export { expect };
