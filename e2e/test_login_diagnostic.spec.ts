import { expect } from '@playwright/test';
import { test } from './fixtures';

test('Diagnostic Login', async ({ page }) => {
  const EMAIL = process.env.TEST_EMAIL;
  const PASSWORD = process.env.TEST_PASSWORD;

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('/login');

  // Wait for splash screen to disappear
  try {
    await page.waitForSelector('img[alt="Splash 1"]', { state: 'detached', timeout: 5000 });
  } catch (e) {}

  console.log('Current URL before submit:', page.url());
  await page.fill('input[name="email"]', EMAIL || '');
  await page.fill('input[name="password"]', PASSWORD || '');
  
  // Take screenshot before submit
  await page.screenshot({ path: 'test-results/before_submit.png' });

  console.log('Clicking submit...');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(8000);

  console.log('Current URL after submit:', page.url());
  
  // Take screenshot after submit
  await page.screenshot({ path: 'test-results/after_submit.png' });

  const bodyHTML = await page.content();
  console.log('PAGE HTML BODY SNIPPET:', bodyHTML.slice(0, 1000));
  
  // Extract visible error texts
  const errorTexts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.text-error, .bg-error\\/10, [role="alert"], p, span'))
      .map(el => (el.textContent || '').trim())
      .filter(text => text.toLowerCase().includes('hata') || text.toLowerCase().includes('geÃ§ersiz') || text.toLowerCase().includes('error') || text.toLowerCase().includes('ÅŸifre') || text.length > 20)
      .slice(0, 10);
  });
  console.log('Detected error or status texts:', errorTexts);
});

