import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test('User Request Flow Login Check', async ({ page }) => {
  try {
    await page.goto('http://localhost:3000/login');
    await page.waitForTimeout(2000);
    
    const emailInput = page.locator('[data-testid="login-email-input"]');
    const passInput = page.locator('[data-testid="login-password-input"]');
    const loginBtn = page.locator('[data-testid="login-submit-button"]');

    await emailInput.fill('test@odipet.com');
    await passInput.fill('123456');
    await loginBtn.click();
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'login_error_123456.png' });
    
    if (page.url().includes('login')) {
      await passInput.fill('password');
      await loginBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'login_error_password.png' });
    }
  } catch (e) {
    console.error(e);
  }
});
