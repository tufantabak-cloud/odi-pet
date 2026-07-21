import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config({ path: '.env.local' });

// Parazit katalog owner akışı e2e (mobil viewport, gerçek runtime).
// Geçici bir kullanıcı + köpek pet oluşturur, kayıt sayfasında protokol seçince
// gerçek katalog ürünlerinin (Bravecto vb.) listelendiğini ve ürün seçilince
// koruma süresinin otomatik dolduğunu doğrular. HER ŞEYİ temizler.
// Kimlik doğrulama kurulamazsa testler zarifçe atlanır.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const host = supabaseUrl ? new URL(supabaseUrl).hostname : '';
const projectRef = host.split('.')[0];
const cookiePrefix = host.includes('127.0.0.1') || host.includes('localhost')
  ? 'sb-127-auth-token'
  : `sb-${projectRef}-auth-token`;

const canRun = !!(supabaseUrl && supabaseServiceKey && supabaseAnonKey);
const adminClient = canRun ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } }) : null;

test.describe('Parasite Catalog — Owner Flow E2E (mobile)', () => {
  let userId = '';
  let petId = '';
  let sessionData: any = null;
  let ready = false;

  test.beforeAll(async () => {
    if (!canRun || !adminClient) return;
    try {
      const email = `e2e-owner-${Date.now()}@odipet-e2e.com`;
      const { data: created, error: cErr } = await adminClient.auth.admin.createUser({
        email, password: 'password123', email_confirm: true,
      });
      if (cErr || !created?.user) return;
      userId = created.user.id;

      // Köpek pet + sahiplik (varsayılan owner rolü yeterli — rol değişimi gerekmez)
      const { data: pet, error: petErr } = await adminClient.from('pets').insert({
        owner_id: userId, name: `E2E Kopek ${crypto.randomUUID().slice(0, 6)}`,
        species: 'dog', gender: 'male', birth_date: '2024-01-01',
      }).select('id').single();
      if (petErr || !pet) return;
      petId = pet.id;
      await adminClient.from('pet_owners').insert({ pet_id: petId, profile_id: userId });

      const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: supabaseAnonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      });
      if (!authRes.ok) return;
      sessionData = await authRes.json();
      ready = true;
    } catch {
      ready = false;
    }
  });

  test.afterAll(async () => {
    if (!adminClient) return;
    if (petId) {
      try { await adminClient.from('parasite_records').delete().eq('pet_id', petId); } catch {}
      try { await adminClient.from('pet_parasite_preferences').delete().eq('pet_id', petId); } catch {}
      try { await adminClient.from('plans').delete().eq('pet_id', petId); } catch {}
      try { await adminClient.from('pet_owners').delete().eq('pet_id', petId); } catch {}
      try { await adminClient.from('pets').delete().eq('id', petId); } catch {}
    }
    if (userId) {
      try { await adminClient.from('profiles').delete().eq('id', userId); } catch {}
      try { await adminClient.auth.admin.deleteUser(userId); } catch {}
    }
  });

  async function injectSession(page: any, context: any) {
    await page.goto('/login');
    await context.addCookies([{
      name: `${cookiePrefix}.0`,
      value: `base64-${Buffer.from(JSON.stringify(sessionData)).toString('base64')}`,
      domain: 'localhost', path: '/',
      expires: Math.floor(Date.now() / 1000) + 3600,
      secure: false, sameSite: 'Lax' as const,
    }]);
  }

  test('Mobil kayıt sayfası: protokol → katalog ürünü → süre auto-fill', async ({ page, context }) => {
    test.skip(!ready, 'Kimlik doğrulama kurulamadı — atlandı.');

    await page.setViewportSize({ width: 375, height: 812 });
    await injectSession(page, context);

    await page.goto(`/owner/pets/${petId}/parasite`);
    await page.waitForLoadState('networkidle');

    // Protokol seçimi görünür olmalı
    const protocolSelect = page.locator('select').first();
    await expect(protocolSelect).toBeVisible({ timeout: 15000 });

    // "Köpek Dış Parazit" protokolünü seç
    await protocolSelect.selectOption({ label: 'Köpek Dış Parazit' });
    await page.waitForTimeout(1200);

    // "Kullanılan Ürün" bölümü belirmeli
    await expect(page.getByText('Kullanılan Ürün', { exact: false })).toBeVisible();

    // Katalog dropdown'ında gerçek SKU (Bravecto) listelenmeli
    const productSelect = page.locator('#product-select');
    await expect(productSelect).toBeVisible();
    const bravectoOption = productSelect.locator('option', { hasText: 'Bravecto' }).first();
    await expect(bravectoOption).toHaveCount(1);

    // Bir Bravecto (84 gün) ürünü seç → koruma süresi 84'e dolmalı
    const optionValue = await bravectoOption.getAttribute('value');
    await productSelect.selectOption(optionValue!);
    await page.waitForTimeout(600);

    const durationInput = page.locator('#duration-input');
    await expect(durationInput).toHaveValue('84');

    // Mobil: yatay taşma olmamalı
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  test('Mobil kayıt sayfası: "Listede Yok" serbest giriş alanları açılır', async ({ page, context }) => {
    test.skip(!ready, 'Kimlik doğrulama kurulamadı — atlandı.');

    await page.setViewportSize({ width: 375, height: 812 });
    await injectSession(page, context);
    await page.goto(`/owner/pets/${petId}/parasite`);
    await page.waitForLoadState('networkidle');

    await page.locator('select').first().selectOption({ label: 'Köpek Dış Parazit' });
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Listede Yok' }).click();
    await page.waitForTimeout(300);

    // Serbest marka/ürün alanları görünür olmalı
    await expect(page.locator('#brand-input')).toBeVisible();
    await expect(page.locator('#product-input')).toBeVisible();
  });
});
