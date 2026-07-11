# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: final-qa.spec.ts >> Vaccination Module Final QA Suite >> Perform complete vaccination QA flow
- Location: tests\final-qa.spec.ts:43:7

# Error details

```
TimeoutError: locator.click: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('[data-testid="vaccine-entry-smart-start-button"]')

```

# Test source

```ts
  150 |     await page.locator('button:has-text("Ev / Şehir İçi Parklar")').click();
  151 |     await page.locator('button:has-text("İleri")').click();
  152 | 
  153 |     // Wizard step 5: Kullanım Tercihi -> "Otomatik Takvim"
  154 |     console.log("Wizard Step 5: Select preference...");
  155 |     await page.locator('button:has-text("Otomatik Takvim")').click();
  156 | 
  157 |     // Complete setup
  158 |     console.log("Completing setup...");
  159 |     const submitBtn = page.locator('button:has-text("Planı Tamamla")');
  160 |     await expect(submitBtn).toBeEnabled();
  161 |     await submitBtn.click();
  162 |     
  163 |     // Wait for page refresh/wizard to close
  164 |     await expect(page.locator('text=Aşı Planı Kurulumu')).not.toBeVisible({ timeout: 20000 });
  165 | 
  166 |     // ─── Step 3: Database Verification ────────────────────────────────
  167 |     console.log("Verifying Database counts...");
  168 |     
  169 |     // Fetch pet row to verify update
  170 |     const ptRes = await fetch(`${supabaseUrl}/rest/v1/pets?id=eq.${testPetId}`, {
  171 |       headers: {
  172 |         'apikey': supabaseAnonKey,
  173 |         'Authorization': `Bearer ${sessionData.access_token}`
  174 |       }
  175 |     });
  176 |     const ptData = await ptRes.json();
  177 |     console.log("PET IN DB AFTER PATCH:", JSON.stringify(ptData, null, 2));
  178 | 
  179 |     // Wait a brief moment for database writes to propagate
  180 |     await page.waitForTimeout(3000);
  181 | 
  182 |     let generatedPlans: any[] = [];
  183 |     // Retry database query up to 5 times
  184 |     for (let attempt = 1; attempt <= 5; attempt++) {
  185 |       const plRes = await fetch(`${supabaseUrl}/rest/v1/plans?pet_id=eq.${testPetId}`, {
  186 |         headers: {
  187 |           'apikey': supabaseAnonKey,
  188 |           'Authorization': `Bearer ${sessionData.access_token}`
  189 |         }
  190 |       });
  191 |       generatedPlans = await plRes.json();
  192 |       if (generatedPlans && generatedPlans.length > 0) {
  193 |         break;
  194 |       }
  195 |       console.log(`Plans not found in DB yet, retrying in 2s (Attempt ${attempt}/5)...`);
  196 |       await page.waitForTimeout(2000);
  197 |     }
  198 | 
  199 |     console.log(`Generated ${generatedPlans?.length} plans.`);
  200 |     expect(generatedPlans && generatedPlans.length).toBeGreaterThan(0);
  201 | 
  202 |     // Fetch vaccine_records_v2
  203 |     const vrRes = await fetch(`${supabaseUrl}/rest/v1/vaccine_records_v2?pet_id=eq.${testPetId}`, {
  204 |       headers: {
  205 |         'apikey': supabaseAnonKey,
  206 |         'Authorization': `Bearer ${sessionData.access_token}`
  207 |       }
  208 |     });
  209 |     const vrData = await vrRes.json();
  210 |     const recordCount = vrData.length;
  211 |     console.log("vaccine_records_v2 count (expected 0):", recordCount);
  212 |     expect(recordCount).toBe(0);
  213 | 
  214 |     // Fetch notifications
  215 |     const ntRes = await fetch(`${supabaseUrl}/rest/v1/notifications?pet_id=eq.${testPetId}`, {
  216 |       headers: {
  217 |         'apikey': supabaseAnonKey,
  218 |         'Authorization': `Bearer ${sessionData.access_token}`
  219 |       }
  220 |     });
  221 |     const ntData = await ntRes.json();
  222 |     const notifCount = ntData.length;
  223 |     console.log(`Generated ${notifCount} notifications. (Expected ${generatedPlans!.length * 5})`);
  224 |     expect(notifCount).toBe(generatedPlans!.length * 5);
  225 | 
  226 |     // ─── Step 4: Duplicate Run Control ─────────────────────────────────
  227 |     console.log("Re-triggering setup wizard to test duplicate safety...");
  228 |     await page.goto(`http://localhost:3000/owner/pets/${testPetId}/vaccines`);
  229 |     await page.waitForLoadState('networkidle');
  230 | 
  231 |     // Click "Planı Yeniden Düzenle" or similar setup edit triggers.
  232 |     const editPlanBtn = page.locator('text=Planı Yeniden Düzenle');
  233 |     if (await editPlanBtn.isVisible()) {
  234 |       await editPlanBtn.click();
  235 |     } else {
  236 |       await page.locator('button:has-text("Planı Güncelle")').first().click().catch(() => {});
  237 |     }
  238 | 
  239 |     // Since setupProfile already exists, we will just delete setupProfile to simulate another complete setup run
  240 |     const delRes = await fetch(`${supabaseUrl}/rest/v1/vaccine_setup_profiles?pet_id=eq.${testPetId}`, {
  241 |       method: 'DELETE',
  242 |       headers: {
  243 |         'apikey': supabaseAnonKey,
  244 |         'Authorization': `Bearer ${sessionData.access_token}`
  245 |       }
  246 |     });
  247 |     console.log("DELETE RESPONSE:", delRes.status, await delRes.text());
  248 |     await page.goto(`http://localhost:3000/owner/pets/${testPetId}/vaccines`);
  249 |     await page.waitForLoadState('networkidle');
> 250 |     await page.locator('[data-testid="vaccine-entry-smart-start-button"]').click();
      |                                                                            ^ TimeoutError: locator.click: Timeout 10000ms exceeded.
  251 |     const dateInput2 = page.locator('input[type="date"]');
  252 |     await dateInput2.waitFor({ state: 'visible', timeout: 5000 });
  253 |     await page.locator('button:has-text("İleri")').click();
  254 |     await page.locator('button:has-text("Hiç aşı yapılmadı")').click();
  255 |     await page.locator('button:has-text("İleri")').click();
  256 |     await page.locator('button:has-text("Hiçbir belge yok")').click();
  257 |     await page.locator('button:has-text("İleri")').click();
  258 |     await page.locator('button:has-text("Ev / Şehir İçi Parklar")').click();
  259 |     await page.locator('button:has-text("İleri")').click();
  260 |     await page.locator('button:has-text("Otomatik Takvim")').click();
  261 |     await page.locator('button:has-text("Planı Tamamla")').click();
  262 |     await expect(page.locator('text=Aşı Planı Kurulumu')).not.toBeVisible({ timeout: 20000 });
  263 | 
  264 |     // Verify duplicate plans / notifications count
  265 |     const plRes2 = await fetch(`${supabaseUrl}/rest/v1/plans?pet_id=eq.${testPetId}`, {
  266 |       headers: {
  267 |         'apikey': supabaseAnonKey,
  268 |         'Authorization': `Bearer ${sessionData.access_token}`
  269 |       }
  270 |     });
  271 |     const plans2 = await plRes2.json();
  272 |     console.log(`After second run: ${plans2?.length} plans. (Expected duplicate prevention)`);
  273 |     expect(plans2?.length).toBe(generatedPlans?.length);
  274 | 
  275 |     // ─── Step 5: Click "Yaptırdım" ─────────────────────────────────────
  276 |     console.log("Clicking 'Yaptırdım' on scheduled vaccine...");
  277 |     await page.goto(`http://localhost:3000/owner/pets/${testPetId}/vaccines`);
  278 |     await page.waitForLoadState('networkidle');
  279 | 
  280 |     // Click "Yaptırdım" button
  281 |     const doneBtn = page.locator('button:has-text("Yaptırdım")').first();
  282 |     await doneBtn.click();
  283 | 
  284 |     // Check if form is auto-filled
  285 |     await expect(page.locator('input[value="MiloQA"]').first()).toBeDefined();
  286 |     
  287 |     // Save record
  288 |     await page.locator('button:has-text("Kaydet")').click();
  289 |     await page.waitForTimeout(1500);
  290 | 
  291 |     // DB checks for completed plan and vaccine_records_v2 insertion
  292 |     const vrRes2 = await fetch(`${supabaseUrl}/rest/v1/vaccine_records_v2?pet_id=eq.${testPetId}`, {
  293 |       headers: {
  294 |         'apikey': supabaseAnonKey,
  295 |         'Authorization': `Bearer ${sessionData.access_token}`
  296 |       }
  297 |     });
  298 |     const records2 = await vrRes2.json();
  299 |     console.log("Completed vaccine records in database:", records2?.length);
  300 |     expect(records2?.length).toBe(1);
  301 |     expect(records2?.[0].administered_at).not.toBeNull();
  302 | 
  303 |     // ─── Step 10: Verify “Uygulanma: Bilinmiyor” text is NOT present ─────
  304 |     const bodyText = await page.innerText('body');
  305 |     console.log("Verifying 'Uygulanma: Bilinmiyor' string is absent...");
  306 |     expect(bodyText).not.toContain("Uygulanma: Bilinmiyor");
  307 |   });
  308 | });
  309 | 
```