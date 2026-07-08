import { test, expect } from '@playwright/test';

test('Log cookies after login', async ({ page, context }) => {
  const EMAIL = process.env.TEST_EMAIL || 'tufan.tabak@gmail.com';
  const PASSWORD = process.env.TEST_PASSWORD || 'att1472o';

  console.log(`Logging in to localhost using ${EMAIL}`);
  await page.goto('http://localhost:3001/login');
  
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  
  await page.click('button[type="submit"]');
  
  await page.waitForURL(/\/owner\/dashboard|owner\/pets/, { timeout: 15000 });
  console.log("Logged in successfully! Current URL:", page.url());

  const cookies = await context.cookies();
  console.log("COOKIES_OUTPUT_START");
  console.log(JSON.stringify(cookies, null, 2));
  console.log("COOKIES_OUTPUT_END");
});
