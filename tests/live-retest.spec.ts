import { test, expect } from '@playwright/test';
import * as path from 'path';

test('Verify Sprint 4.1 Onboarding Choices Flow', async ({ page, context }) => {
  // Set viewport for mobile emulation
  await page.setViewportSize({ width: 375, height: 812 });

  console.log("Logging in via Supabase Token...");
  const supabaseUrl = 'https://soautcxgiqhxiaxrubxv.supabase.co';
  const supabaseAnonKey = 'sb_publishable_ypojkLLZ3o4WUI1COXAXdw_mb2kXNJP';
  
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'ux_test_odipet@odipet.com',
      password: 'odi9191'
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Supabase Auth API failed: ${errText}`);
  }

  const sessionData = await res.json();
  await page.goto('http://localhost:3000/login');
  
  const sessionStr = JSON.stringify(sessionData);
  const base64Session = Buffer.from(sessionStr).toString('base64');
  const cookieValue = `base64-${base64Session}`;

  const chunks: string[] = [];
  for (let i = 0; i < cookieValue.length; i += 4000) {
    chunks.push(cookieValue.slice(i, i + 4000));
  }

  const expiry = sessionData.expires_at ? sessionData.expires_at : Math.floor(Date.now() / 1000) + 3600;
  const cookiesToSet = chunks.map((chunk, index) => ({
    name: `sb-soautcxgiqhxiaxrubxv-auth-token.${index}`,
    value: chunk,
    domain: 'localhost',
    path: '/',
    expires: expiry,
    secure: false,
    sameSite: 'Lax' as const
  }));

  await context.addCookies(cookiesToSet);

  await page.evaluate((data) => {
    localStorage.setItem('sb-soautcxgiqhxiaxrubxv-auth-token', JSON.stringify(data));
  }, sessionData);

  // ─── 1. Yeni ve Boş Pet Oluştur (Aşısız/Takvimsiz) ─────────────────
  console.log("Creating blank pet for testing...");
  const fd = new FormData();
  fd.append('name', 'Retesto');
  fd.append('species', 'dog');
  fd.append('breed', 'Poodle');
  fd.append('gender', 'female');
  // birth_date'i null bırakarak aşı takvimi oluşmasını engelliyoruz

  const petRes = await fetch(`${supabaseUrl}/rest/v1/pets`, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${sessionData.access_token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      owner_id: sessionData.user.id,
      name: 'Retesto',
      species: 'dog',
      breed: 'Poodle',
      gender: 'female',
      birth_date: null
    })
  });

  if (!petRes.ok) {
    throw new Error(`Failed to create test pet: ${await petRes.text()}`);
  }

  const petData = await petRes.json();
  const testPetId = petData[0].id;
  console.log("Test pet created with ID:", testPetId);

  // pet_owners tablosuna owner olarak ekle
  await fetch(`${supabaseUrl}/rest/v1/pet_owners`, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${sessionData.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pet_id: testPetId,
      profile_id: sessionData.user.id,
      role: 'owner'
    })
  });

  try {
    // ─── 2. Aşı Karnesi Sayfasına Git ──────────────────────────────────
    console.log("Visiting vaccines page...");
    await page.goto(`http://localhost:3000/owner/pets/${testPetId}/vaccines`);
    await page.waitForLoadState('networkidle');

    // TEST 1: Yönlendirme Ekranı (Entry Screen) Görünüyor mu?
    console.log("TEST 1: Verifying entry screen is visible...");
    const entryScreen = page.locator('[data-testid="vaccine-entry-screen"]');
    await expect(entryScreen).toBeVisible({ timeout: 10000 });

    // TEST 5: API Hata Simülasyonu
    console.log("TEST 5: Simulating API failure on choice selection...");
    await page.route('**/api/pets/**/vaccine-setup-profile', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Veritabanı bağlantı hatası oluştu.' })
      });
    });

    // "Bana plan oluştur" butonuna tıkla (hata vermeli ve wizard açılmamalı)
    const smartBtn = page.locator('[data-testid="vaccine-entry-smart-start-button"]');
    await smartBtn.click();
    await page.waitForTimeout(1000);

    const errorBanner = page.locator('text=Veritabanı bağlantı hatası oluştu.');
    await expect(errorBanner).toBeVisible();
    const wizardModal = page.locator('text=Aşı Planı Kurulumu');
    await expect(wizardModal).not.toBeVisible();

    // Rotayı sıfırla (başarılı simülasyon)
    await page.unroute('**/api/pets/**/vaccine-setup-profile');

    // TEST 2: "Bana plan oluştur" -> Wizard açılır
    console.log("TEST 2: Verifying 'Bana plan oluştur' opens wizard...");
    await smartBtn.click();
    await expect(page.locator('text=Adım 1: Doğum Tarihi')).toBeVisible({ timeout: 10000 });

    // Sayfayı tekrar yükleyip diğer seçenekleri test et
    await fetch(`${supabaseUrl}/rest/v1/vaccine_setup_profiles?pet_id=eq.${testPetId}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${sessionData.access_token}`
      }
    });
    await page.goto(`http://localhost:3000/owner/pets/${testPetId}/vaccines`);
    await page.waitForLoadState('networkidle');

    // TEST 3: "Karneyi tara" -> Scanner açılır
    console.log("TEST 3: Verifying 'Karneyi tara' opens scanner...");
    const scanBtn = page.locator('[data-testid="vaccine-entry-historical-import-button"]');
    await scanBtn.click();
    await expect(page.locator('text=Akıllı Tarama').first()).toBeVisible({ timeout: 10000 });

    // Sayfayı tekrar yükleyip son seçeneği test et
    await fetch(`${supabaseUrl}/rest/v1/vaccine_setup_profiles?pet_id=eq.${testPetId}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${sessionData.access_token}`
      }
    });
    await page.goto(`http://localhost:3000/owner/pets/${testPetId}/vaccines`);
    await page.waitForLoadState('networkidle');

    // TEST 4: "Kendim ekleyeceğim" -> Manuel form açılır
    console.log("TEST 4: Verifying 'Kendim ekleyeceğim' opens manual form...");
    const freshBtn = page.locator('[data-testid="vaccine-entry-fresh-start-button"]');
    await freshBtn.click();
    await expect(page.locator('text=Aşı Kaydı Ekle')).toBeVisible({ timeout: 10000 });

    console.log("ALL SPRINT 4.1 RETESTS COMPLETED SUCCESSFULLY!");

  } finally {
    // ─── 3. Temizlik (Retest Petini Sil) ─────────────────────────────────
    console.log("Cleaning up test pet...");
    await fetch(`${supabaseUrl}/rest/v1/pets?id=eq.${testPetId}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${sessionData.access_token}`
      }
    });
  }
});
