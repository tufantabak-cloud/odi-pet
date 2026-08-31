import { expect, type Page, type APIRequestContext } from '@playwright/test';
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

  console.log('Registering a new user...');
  await page.goto('/register');
  await waitForSplash(page);
  
  await page.fill('#name', 'E2E Audit User');
  await page.fill('#reg-email', email);
  await page.click('button:has-text("İleri")');
  
  await page.waitForSelector('#password', { state: 'visible', timeout: 8000 });
  await page.fill('#password', password);
  await page.fill('#confirmPassword', password);
  await page.check('#terms');
  
  await page.click('button[type="submit"]:has-text("Kayıt Ol ve Başla")');
  await expect(page.locator('text=Aramıza Hoş Geldiniz!')).toBeVisible({ timeout: 15000 });

  // Clear cookies and login
  console.log('Logging in...');
  await page.context().clearCookies();
  await page.goto('/login');
  await waitForSplash(page);
  
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for dashboard or pets/add
  await page.waitForURL(url => url.pathname.includes('/owner/dashboard') || url.pathname.includes('/owner/pets/add'), { timeout: 30000 });
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
      await page.click('button:has-text("Başla 🐾")');
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
  const catBtn = page.locator('button:has-text("Kedi")').first();
  if (await catBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await catBtn.click();
    await page.waitForTimeout(600);
  }

  const nameInput = page.locator('#pet-name-input, #name, input[placeholder*="Boncuk"]').first();
  await expect(nameInput).toBeVisible({ timeout: 10000 });
  await nameInput.fill(petName);

  const breedInput = page.locator('[data-testid="pet-breed-select"], #pet-breed-combobox').first();
  if (await breedInput.isVisible()) {
    await breedInput.fill('British Shorthair');
    const breedOption = page.locator('button:has-text("British Shorthair")').first();
    if (await breedOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await breedOption.click();
    }
  }

  const genderLabel = page.locator('label:has-text("Erkek")').first();
  if (await genderLabel.isVisible()) {
    await genderLabel.click();
  }

  const dateInput = page.locator('#pet-birthdate-input, input[type="date"]').first();
  if (await dateInput.isVisible()) {
    await dateInput.fill('2025-01-01');
  }

  const nextStepBtn = page.locator('button:has-text("Devam Et")').first();
  if (await nextStepBtn.isVisible()) {
    await nextStepBtn.click();
    await page.waitForTimeout(600);
  }

  // If there is Step 3 / 4, click proceed
  const finishCreateBtn = page.locator('button:has-text("Profili Oluştur"), button:has-text("Devam Et"), button:has-text("Tamamla")').first();
  if (await finishCreateBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await finishCreateBtn.click();
    await page.waitForTimeout(600);
  }

  const skipBtn = page.locator('button:has-text("Atla"), button:has-text("Bildirim Açmadan")').first();
  if (await skipBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await skipBtn.click();
  }

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
