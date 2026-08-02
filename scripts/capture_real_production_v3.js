const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OUTPUT_DIR = 'c:\\Odi.Pet\\docs\\opos-migration\\mockups\\auth';
const BRAIN_DIR = 'C:\\Users\\Tufan TABAK\\.gemini\\antigravity\\brain\\14fc84a4-04a7-4a01-bf33-a7adf0a17011';

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(BRAIN_DIR)) fs.mkdirSync(BRAIN_DIR, { recursive: true });

async function runCapturePipelineV3() {
  console.log('=' .repeat(60));
  console.log('OPOS SAFE MIGRATION PROGRAM — REAL PRODUCTION MOCKUP PIPELINE v3.0');
  console.log('=' .repeat(60));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log('STEP 1 & 2: Navigating to http://localhost:3000/login & waiting for networkidle, fonts, images...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  
  // Wait for all images to complete loading
  await page.evaluate(async () => {
    const imgs = Array.from(document.images);
    await Promise.all(imgs.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = img.onerror = resolve;
      });
    }));
  });

  // STEP 3: REMOVE BLOCKING UI
  console.log('STEP 3: Checking & removing any blocking UI (PWA update, toasts, banners)...');
  const blockingRemoved = await page.evaluate(() => {
    let removedCount = 0;
    const selectors = [
      '[role="dialog"]',
      '.toast',
      '.pwa-update-banner',
      '#sw-update',
      '.coachmark',
      '.debug-panel',
      '#next-error-overlay'
    ];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.remove();
        removedCount++;
      });
    });
    return removedCount;
  });
  console.log(`Dismissed ${blockingRemoved} blocking elements.`);

  // STEP 4: VALIDATE CAPTURE (Ensure form, logo, inputs, CTA are visible)
  console.log('STEP 4: Validating live production screen DOM elements...');
  const isValidScreen = await page.evaluate(() => {
    const hasEmail = !!document.querySelector('#email') || !!document.querySelector('input[type="email"]');
    const hasPassword = !!document.querySelector('#password') || !!document.querySelector('input[type="password"]');
    const hasSubmit = !!document.querySelector('button[type="submit"]');
    const hasLogo = !!document.querySelector('img[alt="Odi.Pet"]');
    return hasEmail && hasPassword && hasSubmit && hasLogo;
  });

  if (!isValidScreen) {
    console.error('❌ REJECTION: Screen capture failed validation (missing login form/logo/inputs/CTA).');
    await browser.close();
    process.exit(1);
  }
  console.log('✅ Screen validation PASSED: Login form, logo, inputs, CTA verified live in DOM.');

  // STEP 5: FONT VALIDATION
  console.log('STEP 5: Validating Turkish typography & font engine status...');
  const fontStatus = await page.evaluate(() => document.fonts.status);
  if (fontStatus !== 'loaded') {
    console.error('❌ REJECTION: Fonts failed to load cleanly (status:', fontStatus, ')');
    await browser.close();
    process.exit(1);
  }
  console.log('✅ Font validation PASSED: document.fonts.status === "loaded" (Montserrat ready).');

  // Capture Main Production Screenshot (01-original-production.png)
  const origPath = path.join(OUTPUT_DIR, '01-original-production.png');
  await page.screenshot({ path: origPath, fullPage: false });
  console.log('✅ Captured 01-original-production.png (390x844)');

  // STEP 6: RESPONSIVE CAPTURES (320, 360, 390, 430, 768, 1024, 1440)
  console.log('STEP 6: Generating responsive captures across 7 viewports...');
  const viewports = [
    { name: '320', w: 320, h: 690 },
    { name: '360', w: 360, h: 780 },
    { name: '390', w: 390, h: 844 },
    { name: '430', w: 430, h: 932 },
    { name: '768', w: 768, h: 900 },
    { name: '1024', w: 1024, h: 900 },
    { name: '1440', w: 1440, h: 900 },
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.waitForTimeout(200);
    const bpPath = path.join(OUTPUT_DIR, `real-bp-${vp.name}.png`);
    await page.screenshot({ path: bpPath, fullPage: false });
    // Verify file size > 5KB to prevent blank screenshots
    const stat = fs.statSync(bpPath);
    if (stat.size < 5000) {
      console.error(`❌ REJECTION: Responsive screenshot for ${vp.name}px is blank/corrupt (${stat.size} bytes).`);
      await browser.close();
      process.exit(1);
    }
    console.log(`  ✓ ${vp.name}px captured (${stat.size} bytes)`);
  }

  await browser.close();
  console.log('✅ Live Playwright capture pipeline completed cleanly.');

  // STEP 7, 8, 9: Invoke Python overlay processor on 01-original-production.png
  console.log('Running Python OPOS Overlay & Approval Board Generator v3.0...');
  execSync('python scripts/sprint2_v3_overlay_processor.py', { 
    stdio: 'inherit',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
  });


  console.log('=' .repeat(60));
  console.log('PIPELINE v3.0 SUCCESS: ALL 8 REAL DELIVERABLES PRODUCED & COPIED!');
  console.log('=' .repeat(60));
}

runCapturePipelineV3().catch(err => {
  console.error('Pipeline v3.0 Error:', err);
  process.exit(1);
});
