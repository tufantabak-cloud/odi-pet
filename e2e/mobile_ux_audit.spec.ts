import { expect } from '@playwright/test';
import { test } from './fixtures';
import * as fs from 'fs';
import * as path from 'path';

test.setTimeout(120000); // 2 minutes timeout

test.use({
  viewport: { width: 375, height: 812 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
});

async function waitForSplash(page: any) {
  try {
    await page.waitForSelector('img[alt="Splash 1"]', { state: 'detached', timeout: 8000 });
  } catch (e) {}
}

test('Mobile UX Audit - Dashboard', async ({ page }) => {
  const email = `audit_${Date.now()}@gmail.com`;
  const password = 'AuditPassword123!';
  const petName = `Pati_${Date.now().toString().slice(-4)}`;

  const results: any = {
    viewportMeta: null,
    pwaManifestLink: null,
    appleTouchIconLink: null,
    horizontalScrollDetected: false,
    bodyWidth: 0,
    pageTitle: '',
    smallTouchTargets: [] as any[],
  };

  console.log('Logging in with Canonical SSOT...');
  await page.goto('/login');
  await waitForSplash(page);
  
  await page.getByTestId('login-email-input').fill(process.env.TEST_EMAIL || 'e2e-owner@odipet.local');
  await page.getByTestId('login-password-input').fill(process.env.TEST_PASSWORD || 'OdiPetLocalE2E-2026!');
  await page.getByRole('button', { name: 'GiriÅŸ Yap', exact: true }).click();

  // Canonical Overlay Dismissal handled here for determinism
  await page.waitForLoadState('networkidle');
  const overlayDismiss = page.locator('button:has-text("Kapat"), button[aria-label="Kapat"], [data-testid="onboarding-dismiss"]');
  if (await overlayDismiss.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await overlayDismiss.first().click({ force: true });
  }

  // Wait for dashboard
  await page.waitForURL(url => url.pathname.includes('/owner/dashboard'), { timeout: 30000 });
  console.log('Logged in, current URL:', page.url());
  
  // Handle spotlight tour if present
  const devamEtBtn = page.locator('button:has-text("Devam Et")');
  try {
    if (await devamEtBtn.isVisible({ timeout: 5000 })) {
      console.log('Spotlight tour found, completing it...');
      await devamEtBtn.click();
      await page.waitForTimeout(600);
      await page.click('button:has-text("Devam Et")');
      await page.waitForTimeout(600);
      await page.click('button:has-text("BaÅŸla ğŸ¾")');
    } else {
      console.log('Spotlight tour not visible.');
    }
  } catch (e) {
    console.log('Spotlight tour not found or skipped.');
  }

  // Go to pets/add to add a pet
  console.log('Navigating to /owner/pets/add...');
  await page.goto('/owner/pets/add');
  await page.waitForLoadState('networkidle');

  console.log('Adding a pet...');
  await page.click('button:has-text("Kedi")');
  await page.waitForTimeout(1000);

  await expect(page.locator('#name')).toBeVisible();
  await page.fill('#name', petName);
  await page.getByTestId('pet-breed-select').fill('British Shorthair');
  await page.getByRole('button', { name: 'British Shorthair', exact: true }).click();
  await page.click('label:has-text("â™‚ Erkek")');
  await page.fill('input[type="date"]', '2025-01-01');
  await page.click('button:has-text("Devam Et â†’")');
  await page.waitForTimeout(1000);

  await page.click('button:has-text("Profili OluÅŸtur")');
  await page.waitForTimeout(1000);
  await page.click('button:has-text("Atla â†’")');

  await expect(page).toHaveURL(/\/owner\/pets\/add\/success/, { timeout: 15000 });
  console.log('Pet successfully created!');

  // Now, navigate to Dashboard to run UX Audit on active dashboard
  console.log('Navigating back to Dashboard...');
  await page.goto('/owner/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  console.log('Analyzing layout and metadata...');
  results.pageTitle = await page.title();

  // 1. Viewport Meta Tag check
  results.viewportMeta = await page.evaluate(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    return meta ? meta.getAttribute('content') : null;
  });

  // 2. PWA Manifest link check
  results.pwaManifestLink = await page.evaluate(() => {
    const link = document.querySelector('link[rel="manifest"]');
    return link ? link.getAttribute('href') : null;
  });

  results.appleTouchIconLink = await page.evaluate(() => {
    const link = document.querySelector('link[rel="apple-touch-icon"]');
    return link ? link.getAttribute('href') : null;
  });

  // 3. Horizontal Scroll Detection / Page width overflow
  const layout = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const docScrollWidth = document.documentElement.scrollWidth;
    const bodyWidth = document.body.offsetWidth;
    const overflowXElements: string[] = [];

    document.querySelectorAll('*').forEach((el: any) => {
      const rect = el.getBoundingClientRect();
      if (rect.right > docWidth || rect.left < 0) {
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && rect.width > 0) {
          overflowXElements.push(`${el.tagName.toLowerCase()}.${el.className.split(' ').slice(0, 3).join('.')}`);
        }
      }
    });

    return {
      docWidth,
      docScrollWidth,
      bodyWidth,
      hasScroll: docScrollWidth > docWidth,
      overflowXElements: overflowXElements.slice(0, 8),
    };
  });

  results.horizontalScrollDetected = layout.hasScroll;
  results.bodyWidth = layout.bodyWidth;
  results.overflowXElements = layout.overflowXElements;

  // 4. Touch Targets Analysis (Buttons, links, and input elements < 44px)
  results.smallTouchTargets = await page.evaluate(() => {
    const interactiveElements = Array.from(document.querySelectorAll('a, button, input, select, textarea, [role="button"]'));
    const smallTargets: any[] = [];

    interactiveElements.forEach((el: any) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);

      if (rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden') {
        const isTooSmall = rect.width < 44 || rect.height < 44;
        if (isTooSmall) {
          smallTargets.push({
            tag: el.tagName.toLowerCase(),
            id: el.id || '',
            text: (el.innerText || el.value || '').trim().slice(0, 30),
            className: el.className.split(' ').slice(0, 2).join(' '),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            padding: style.padding,
            margin: style.margin,
          });
        }
      }
    });

    return smallTargets;
  });

  // Take screenshot
  const screenshotPath = path.join('C:/Users/Tufan TABAK/.gemini/antigravity/brain/b5c138b2-f8cd-4061-a245-58874928482e', 'mobile_dashboard.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved to ${screenshotPath}`);

  // Write results to JSON file
  const resultsPath = path.join('C:/Users/Tufan TABAK/.gemini/antigravity/brain/b5c138b2-f8cd-4061-a245-58874928482e', 'mobile_ux_results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`Results saved to ${resultsPath}`);
});

