const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const artDir = 'C:\\Users\\Tufan TABAK\\.gemini\\antigravity\\brain\\9c2d153e-9ccd-4871-bc18-acac390cdb90';
const realPetUuid = '11b747b8-b719-4fe3-a782-7cd4cad70bc7'; // Real pet: Odi (Owner: tufan.tabak@gmail.com)

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const targetUrl = `http://localhost:3000/owner/pets/${realPetUuid}/nutrition`;
  console.log('Navigating directly to real pet nutrition URL:', targetUrl);

  const response = await page.goto(targetUrl, { waitUntil: 'networkidle' });
  const status = response ? response.status() : 0;
  const currentUrl = page.url();

  console.log(`HTTP Status: ${status}`);
  console.log(`Current URL: ${currentUrl}`);

  if (currentUrl.includes('/login')) {
    console.error('ERROR: Still redirected to login!');
    process.exit(1);
  }

  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('=== REAL PET NUTRITION PAGE LOADED SUCCESSFULLY ===');
  console.log('Snippet:', pageText.slice(0, 180).replace(/\n/g, ' '));

  const viewports = [
    { width: 320, height: 667, name: 'nutrition-320x667.png' },
    { width: 390, height: 844, name: 'nutrition-390x844.png' },
    { width: 430, height: 932, name: 'nutrition-430x932.png' }
  ];

  const results = [];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(1000);

    const localPath = path.join(process.cwd(), vp.name);
    const artPath = path.join(artDir, vp.name);

    await page.screenshot({ path: localPath, fullPage: false });
    fs.copyFileSync(localPath, artPath);

    const stat = fs.statSync(artPath);
    results.push({
      name: vp.name,
      width: vp.width,
      height: vp.height,
      httpStatus: status,
      redirectedToLogin: false,
      artPath,
      sizeBytes: stat.size,
      sizeKB: (stat.size / 1024).toFixed(2) + ' KB'
    });
  }

  console.log('=== AUTHENTICATED REAL PET UUID SCREENSHOT METADATA ===');
  console.dir(results, { depth: null });

  await browser.close();
}

run().catch(err => {
  console.error('Error capturing authenticated screenshots:', err);
  process.exit(1);
});
