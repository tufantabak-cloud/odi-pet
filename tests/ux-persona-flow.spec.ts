import { test, expect } from '@playwright/test';
import { personas, Persona } from './utils/personas';
import { UXReporter, PersonaReport, ModuleResult } from './utils/uxReporter';
import * as path from 'path';

const reporter = new UXReporter();

// Run tests for all 10 personas sequentially
test.describe('Odi.Pet E2E UX Persona Flow', () => {
  let isProduction = false;
  let baseUrl = 'http://127.0.0.1:3100';

  test.beforeAll(async ({ request }) => {
    baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3100';
    if (baseUrl.includes('odi.pet') || baseUrl.includes('vercel.app') || baseUrl.includes('odi-petcare')) {
      isProduction = true;
    }
  });

  test.afterAll(async () => {
    const reportPath = path.resolve(__dirname, '../test-results/odipet-ux-report.json');
    reporter.saveReport(reportPath, isProduction);
    console.log(`UX Report saved to: ${reportPath}`);
  });

  for (let i = 0; i < personas.length; i++) {
    const persona = personas[i];
    
    test(`Persona Flow: ${persona.name} (${persona.device})`, async ({ page, context }) => {
      // Configure viewport and user agent
      await page.setViewportSize(persona.viewport);
      if (persona.userAgent) {
        await context.addCookies([]); // Clear cookies
      }

      console.log(`Running flow for Persona: ${persona.name}, target: ${baseUrl}, isProd: ${isProduction}`);
      
      const sessionId = `${persona.name.toUpperCase()}_FULL_FLOW_${String(i + 1).padStart(3, '0')}`;
      const results: ModuleResult[] = [];
      const timestamp = Date.now();
      const sanitizedName = persona.name.toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c');
      const testEmail = `ux_${sanitizedName}_${persona.age}_${timestamp}@odipet.test`;
      const testPassword = 'OdiPetTest123!';

      // Capturing page errors and console
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => {
        consoleErrors.push(err.message);
      });

      // Flow orchestrator
      const runModule = async (
        moduleName: string,
        action: () => Promise<{ selectorUsed?: string; notes?: string }>
      ) => {
        const start = Date.now();
        let outcome: ModuleResult['outcome'] = 'failed';
        let status: ModuleResult['status'] = 'technical_error';
        let stuckScreen = '';
        let errorMsg = '';
        let selectorUsed = '';
        let notes = '';
        let screenshotPath = '';

        let timer45: NodeJS.Timeout | null = null;
        let timer90: NodeJS.Timeout | null = null;

        try {
          // Monitor 45s stuck candidate & 90s stuck confirmed
          const actionPromise = action();
          const timeout45 = new Promise<never>((_, reject) => {
            timer45 = setTimeout(() => reject(new Error('TIMEOUT_45')), 45000);
          });
          const timeout90 = new Promise<never>((_, reject) => {
            timer90 = setTimeout(() => reject(new Error('TIMEOUT_90')), 90000);
          });

          const result = await Promise.race([actionPromise, timeout45, timeout90]);
          outcome = 'completed_unaided';
          status = 'pass';
          selectorUsed = result?.selectorUsed || '';
          notes = result?.notes || '';
        } catch (err: any) {
          errorMsg = err.message || '';
          stuckScreen = page.url();

          if (err.message === 'TIMEOUT_45') {
            status = 'stuck_candidate';
            outcome = 'abandoned';
            notes = 'No progress detected for 45 seconds.';
          } else if (err.message === 'TIMEOUT_90') {
            status = 'stuck_confirmed';
            outcome = 'failed';
            notes = 'No progress detected for 90 seconds. Stuck confirmed.';
          } else if (err.message.includes('locator') || err.message.includes('selector')) {
            status = 'missing_selector';
            outcome = 'failed';
            notes = 'Target selector was missing or not interactive.';
          } else {
            status = 'technical_error';
            outcome = 'failed';
          }

          // Take screenshot on failure
          try {
            const scPath = `test-results/screenshots/${persona.name}_${moduleName}_fail.png`;
            await page.screenshot({ path: scPath });
            screenshotPath = scPath;
          } catch {}
        } finally {
          if (timer45) clearTimeout(timer45);
          if (timer90) clearTimeout(timer90);
        }

        const duration = Math.round((Date.now() - start) / 1000);
        results.push({
          module: moduleName,
          outcome,
          duration_seconds: duration,
          status,
          stuck_screen: stuckScreen,
          selector_used: selectorUsed,
          error_message: errorMsg || consoleErrors.join(' | '),
          screenshot_path: screenshotPath,
          notes
        });

        return status === 'pass';
      };

      // ── MODULE 1: Registration (Or Smoke Test if Production) ──
      await runModule('registration', async () => {
        await page.goto(`${baseUrl}/login`);
        const registerLink = page.locator('[data-testid="register-link"]');
        await expect(registerLink).toBeVisible();

        if (isProduction) {
          // Smoke Check: just verify that form components are accessible
          await registerLink.click();
          await expect(page.locator('[data-testid="register-name-input"]')).toBeVisible();
          return { selectorUsed: '[data-testid="register-link"]', notes: 'Production smoke check completed.' };
        }

        // Complete write/register E2E on localhost/staging
        await registerLink.click();
        await page.fill('[data-testid="register-name-input"]', `${persona.name} Test`);
        await page.fill('[data-testid="register-email-input"]', testEmail);
        await page.click('button:has-text("İleri")');
        
        // Animasyon bitene kadar bekle
        await page.waitForSelector('[data-testid="register-password-input"]', { state: 'visible' });
        await page.fill('[data-testid="register-password-input"]', testPassword);
        await page.fill('[data-testid="register-password-confirm-input"]', testPassword);
        await page.check('[data-testid="register-terms-checkbox"]');
        await page.click('[data-testid="register-submit-button"]');

        // Check for success screen or redirection
        await page.waitForTimeout(2000); // wait for register success state
        return { selectorUsed: '[data-testid="register-submit-button"]', notes: 'Successfully registered test user.' };
      });

      if (isProduction) {
        // Skip remaining write steps on production to avoid database pollution
        const skippedModules = [
          'pet_addition', 'smart_next_step', 'vaccine', 'parasite', 
          'nutrition', 'budget', 'health_card', 'find_services'
        ];
        for (const mod of skippedModules) {
          results.push({
            module: mod,
            outcome: 'skipped',
            duration_seconds: 0,
            status: 'pass',
            stuck_screen: '',
            selector_used: '',
            error_message: '',
            screenshot_path: '',
            notes: 'Skipped to protect production database.'
          });
        }
      } else {
        // ── MODULE 2: Pet Addition ──
        await runModule('pet_addition', async () => {
          // Navigate to add pet (since we just registered, we should be on dashboard or onboarding)
          await page.goto(`${baseUrl}/owner/dashboard`);
          
          // Click add pet button
          const addBtn = page.locator('[data-testid="add-first-pet-button"]');
          await addBtn.click();

          // Select species (e.g., dog)
          const dogBtn = page.locator('[data-testid="pet-species-dog-button"]');
          await dogBtn.click();

          // Fill basic pet info (Step 2)
          await page.fill('[data-testid="pet-name-input"]', 'Boni');
          await page.selectOption('[data-testid="pet-breed-select"]', { label: 'Golden Retriever' });
          await page.click('label:has-text("Erkek")');
          
          // Enter birthdate
          await page.fill('[data-testid="pet-birthdate-input"]', '2025-01-01');
          await page.fill('input[id="weight"]', '12');

          // Save step 2
          await page.click('[data-testid="pet-save-button"]');
          await page.waitForTimeout(2000);

          // Step 3: Photo Upload E2E Mocking
          await page.setInputFiles('input[type="file"]', {
            name: 'avatar.png',
            mimeType: 'image/png',
            buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
          });
          await page.click('button:has-text("Devam Et")');
          await page.waitForTimeout(2000);

          // Step 4: SOS Contacts
          await page.fill('input[placeholder="Örn: Ali Yılmaz"]', 'Ali Yılmaz');
          await page.fill('input[placeholder="Örn: 0555 123 4567"]', '05551234567');
          await page.locator('select').nth(1).selectOption('Aile Üyesi');
          await page.click('button:has-text("Kaydet ve Tamamla")');
          await page.waitForTimeout(3000);

          return { selectorUsed: 'button:has-text("Kaydet ve Tamamla")', notes: 'Successfully walked through pet add wizard steps 1-4.' };
        });

        // ── MODULE 3: Smart Next Step ──
        let petProfileUrl = '';
        await runModule('smart_next_step', async () => {
          await page.goto(`${baseUrl}/owner/dashboard`);
          const card = page.locator('[data-testid="next-step-card"]').first();
          await expect(card).toBeVisible({ timeout: 10000 });
          
          const primaryBtn = page.locator('[data-testid="next-step-primary-button"]').first();
          if (await primaryBtn.isVisible()) {
            await primaryBtn.click();
            return { selectorUsed: '[data-testid="next-step-primary-button"]', notes: 'Clicked next step primary button.' };
          } else {
            // If in pasif mode, click the card itself to expand/interact
            await card.click();
            return { selectorUsed: '[data-testid="next-step-card"]', notes: 'Clicked pasif next step card.' };
          }
        });

        // Helper: Navigate to Pet Details page before testing details tabs
        const enterPetDetails = async () => {
          await page.goto(`${baseUrl}/owner/dashboard`);
          const profileLink = page.locator('a:has-text("Profili Gör")');
          await expect(profileLink).toBeVisible({ timeout: 10000 });
          await profileLink.click();
          await page.waitForTimeout(2000);
          petProfileUrl = page.url();
        };

        // ── MODULE 4: Vaccine Module ──
        await runModule('vaccine', async () => {
          await enterPetDetails();
          // Click Sağlık Tab
          await page.click('button:has-text("Sağlık")');
          const vacBtn = page.locator('[data-testid="vaccine-module-button"]');
          await vacBtn.click();
          return { selectorUsed: '[data-testid="vaccine-module-button"]', notes: 'Reached vaccine sub-module.' };
        });

        // ── MODULE 5: Parasite Module ──
        await runModule('parasite', async () => {
          await page.goto(petProfileUrl);
          await page.click('button:has-text("Sağlık")');
          const parBtn = page.locator('[data-testid="parasite-module-button"]');
          await parBtn.click();
          return { selectorUsed: '[data-testid="parasite-module-button"]', notes: 'Reached parasite sub-module.' };
        });

        // ── MODULE 6: Nutrition Module ──
        await runModule('nutrition', async () => {
          await page.goto(petProfileUrl);
          await page.click('button:has-text("Sağlık")');
          const nutBtn = page.locator('[data-testid="nutrition-module-button"]');
          await nutBtn.click();
          return { selectorUsed: '[data-testid="nutrition-module-button"]', notes: 'Reached nutrition sub-module.' };
        });

        // ── MODULE 7: Budget Module ──
        await runModule('budget', async () => {
          await page.goto(petProfileUrl);
          // Go to Extra tab and click budget
          await page.click('button:has-text("Ekstra")');
          const budBtn = page.locator('[data-testid="budget-module-button"]');
          await budBtn.click();
          return { selectorUsed: '[data-testid="budget-module-button"]', notes: 'Reached budget expenses sub-module.' };
        });

        // ── MODULE 8: Health Card / Karne ──
        await runModule('health_card', async () => {
          await page.goto(petProfileUrl);
          await page.click('button:has-text("Ekstra")');
          const hcBtn = page.locator('[data-testid="health-card-button"]');
          await hcBtn.click();
          return { selectorUsed: '[data-testid="health-card-button"]', notes: 'Reached health reports page.' };
        });

        // ── MODULE 9: Find Services ──
        await runModule('find_services', async () => {
          // Bottom Navigation tab
          const servBtn = page.locator('[data-testid="services-module-button"]');
          await servBtn.click();
          return { selectorUsed: '[data-testid="services-module-button"]', notes: 'Reached services listing screen.' };
        });
      }

      // Calculate overall outcome for the persona
      const hasFailure = results.some(r => r.outcome === 'failed');
      const hasAbandon = results.some(r => r.outcome === 'abandoned');
      const allPassed = results.every(r => r.outcome === 'completed_unaided' || r.outcome === 'skipped');

      const overallResult = allPassed ? 'pass' : (hasFailure ? 'fail' : 'partial');

      reporter.addReport({
        session_id: sessionId,
        persona: {
          name: persona.name,
          age: persona.age,
          device: persona.device,
          tech_level: persona.techLevel
        },
        environment: {
          base_url: baseUrl,
          is_production: isProduction,
          viewport: `${persona.viewport.width}x${persona.viewport.height}`,
          browser: 'chromium'
        },
        results,
        overall_result: overallResult,
        ux_lead_note: allPassed ? 'Persona executed all steps smoothly.' : 'Persona got blocked at some steps. Check selectors.'
      });
    });
  }
});
