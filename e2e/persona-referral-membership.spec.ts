import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { qualifyReferral } from '../src/lib/referral/qualifyReferral';
import { dismissBlockingOverlays } from './helpers/dismiss-modals';

// Load local environment files if present
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const TEST_PASSWORD = 'OdiPetTest123!';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'OdiPetLocalAdminE2E-2026!';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'e2e-admin@odipet.local';

function getLocalSupabaseAdmin(): SupabaseClient {
  let apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiUrl || !serviceKey) {
    try {
      const isWindows = process.platform === 'win32';
      const statusCommand = isWindows ? process.env.ComSpec! : 'npx';
      const statusArgs = isWindows
        ? ['/d', '/s', '/c', 'npx.cmd --yes supabase status -o json']
        : ['--yes', 'supabase', 'status', '-o', 'json'];

      const status = spawnSync(statusCommand, statusArgs, { encoding: 'utf8' });
      if (status.status === 0 && status.stdout) {
        const parsed = JSON.parse(status.stdout);
        apiUrl = parsed.API_URL;
        serviceKey = parsed.SERVICE_ROLE_KEY;
      }
    } catch {}
  }

  if (!apiUrl || !serviceKey) {
    apiUrl = 'http://127.0.0.1:54321';
    serviceKey = 'dummy-service-key';
  }

  process.env.NEXT_PUBLIC_SUPABASE_URL = apiUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;

  return createClient(apiUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function ensureLocalUser(
  admin: SupabaseClient,
  { email, password, firstName, lastName, role }: { email: string; password: string; firstName: string; lastName: string; role: string }
) {
  const { data: listData } = await admin.auth.admin.listUsers({ perPage: 100 });
  let user = listData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

  if (user) {
    await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });
    if (error || !data.user) throw error || new Error(`Failed to create user ${email}`);
    user = data.user;
  }

  const referralCode = `ODI-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  await admin.from('profiles').upsert({
    id: user.id,
    email,
    first_name: firstName,
    last_name: lastName,
    role,
    referral_code: referralCode,
  });

  await admin.from('user_subscriptions').upsert(
    {
      profile_id: user.id,
      plan: 'free',
      status: 'active',
    },
    { onConflict: 'profile_id' }
  );

  return user;
}

async function loginUser(page: Page, email: string, pass: string) {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('odi_splash_seen', 'true');
    } catch {}
  });

  await page.goto('/login?nosplash=true', { waitUntil: 'domcontentloaded' });
  await dismissBlockingOverlays(page);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(pass);
  await page.click('button[type="submit"]', { force: true });
  await expect(page).toHaveURL(/\/owner\/|\/admin(?:\/|$)/, { timeout: 30_000 });
}

test.describe('persona-referral-membership E2E Lifecycle', () => {
  test('Full referral lifecycle, qualification, UI, DB SSOT and idempotency verification', async ({ browser }) => {
    test.setTimeout(180_000);

    const adminSupabase = getLocalSupabaseAdmin();
    const timestamp = Date.now();

    const userAEmail = `persona_ref_a_${timestamp}@odipet.test`;
    const userBEmail = `persona_ref_b_${timestamp}@odipet.test`;

    console.log(`[Setup] Creating test users: A=${userAEmail}, B=${userBEmail}`);

    // Ensure Admin exists
    await ensureLocalUser(adminSupabase, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      firstName: 'E2E',
      lastName: 'Admin',
      role: 'admin',
    });

    // Ensure User A (Referrer)
    const userA = await ensureLocalUser(adminSupabase, {
      email: userAEmail,
      password: TEST_PASSWORD,
      firstName: 'Ece',
      lastName: 'Referrer',
      role: 'owner',
    });

    // Ensure User B (Referred)
    const userB = await ensureLocalUser(adminSupabase, {
      email: userBEmail,
      password: TEST_PASSWORD,
      firstName: 'Mert',
      lastName: 'Referred',
      role: 'owner',
    });

    // Verify initial clean state: User A has no pre-existing referrals or credits
    await adminSupabase.from('referrals').delete().or(`referrer_id.eq.${userA.id},referred_id.eq.${userA.id},referrer_id.eq.${userB.id},referred_id.eq.${userB.id}`);
    await adminSupabase.from('membership_credits').delete().or(`profile_id.eq.${userA.id},profile_id.eq.${userB.id}`);

    // Create 3 isolated browser contexts
    const referrerContext = await browser.newContext();
    const referredContext = await browser.newContext();
    const adminContext = await browser.newContext();

    const referrerPage = await referrerContext.newPage();
    const referredPage = await referredContext.newPage();
    const adminPage = await adminContext.newPage();

    try {
      // ─────────────────────────────────────────────────────────────
      // 1. REFERRER BAŞLANGIÇ DURUMU (User A)
      // ─────────────────────────────────────────────────────────────
      console.log('[Step 1] Verifying User A initial referral state...');
      await loginUser(referrerPage, userAEmail, TEST_PASSWORD);

      await referrerPage.goto('/owner/referral?nosplash=true');
      await dismissBlockingOverlays(referrerPage);

      const initialTotal = await referrerPage.getByTestId('referral-total-count').textContent();
      const initialQualified = await referrerPage.getByTestId('referral-qualified-count').textContent();
      const initialEarned = await referrerPage.getByTestId('referral-earned-days').textContent();

      expect(initialTotal?.trim()).toBe('0');
      expect(initialQualified?.trim()).toBe('0');
      expect(initialEarned?.trim()).toBe('+0 Gün');

      const referralCodeEl = referrerPage.getByTestId('referral-code');
      await expect(referralCodeEl).toBeVisible();
      const referralCode = (await referralCodeEl.textContent())?.trim();

      expect(referralCode).toBeTruthy();
      expect(referralCode).toMatch(/^ODI-[A-Z0-9]+$/);
      console.log(`[Step 1] User A referral code: ${referralCode}`);

      // ─────────────────────────────────────────────────────────────
      // 2. REFERRAL OLUŞTUR (User B -> POST /api/referral/use)
      // ─────────────────────────────────────────────────────────────
      console.log('[Step 2] User B logging in and applying referral code...');
      await loginUser(referredPage, userBEmail, TEST_PASSWORD);
      await referredPage.waitForLoadState('domcontentloaded');
      await referredPage.waitForTimeout(1000);

      // User B applies User A's referral code via the canonical endpoint
      const useResult = await referredPage.evaluate(async (code) => {
        const res = await fetch('/api/referral/use', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referralCode: code }),
        });
        return res.json();
      }, referralCode);

      expect(useResult.success).toBe(true);

      // Verify referral row created in DB with status = pending
      const { data: initialRefRow } = await adminSupabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', userA.id)
        .eq('referred_id', userB.id)
        .single();

      expect(initialRefRow).toBeTruthy();
      expect(initialRefRow.referrer_id).toBe(userA.id);
      expect(initialRefRow.referred_id).toBe(userB.id);
      expect(initialRefRow.status).toBe('pending');
      expect(initialRefRow.qualified_at).toBeNull();
      const referralId = initialRefRow.id;
      console.log(`[Step 2] Referral pending created in DB: ${referralId}`);

      // ─────────────────────────────────────────────────────────────
      // 3. NEGATIVE QUALIFICATION TEST (Health Record Eksikken)
      // ─────────────────────────────────────────────────────────────
      console.log('[Step 3] Running negative qualification test without health record...');
      // User B currently has: Account = true, Email = true, Pet = false, Health = false
      const negResult1 = await qualifyReferral(referralId);
      expect(negResult1.isQualified).toBe(false);
      expect(negResult1.checklist.hasPet).toBe(false);
      expect(negResult1.checklist.hasHealthRecordWithin14Days).toBe(false);

      // Add pet for User B via canonical API
      await referredPage.waitForLoadState('domcontentloaded');
      const petCreateRes = await referredPage.evaluate(async () => {
        const fd = new FormData();
        fd.append('name', 'Pati E2E');
        fd.append('species', 'cat');
        fd.append('breed', 'British Shorthair');
        fd.append('birth_date', '2023-01-01');
        fd.append('gender', 'male');
        fd.append('is_neutered', 'true');
        fd.append('city', 'İstanbul');
        fd.append('district', 'Kadıköy');

        const res = await fetch('/api/pets', { method: 'POST', body: fd });
        return res.json();
      });

      expect(petCreateRes.success).toBe(true);
      const petId = petCreateRes.pet.id;
      console.log(`[Step 3] User B pet created: ${petId}`);

      // Re-check qualification: Has Pet = true, but Health Record = false
      const negResult2 = await qualifyReferral(referralId);
      expect(negResult2.checklist.hasPet).toBe(true);
      expect(negResult2.checklist.hasHealthRecordWithin14Days).toBe(false);
      expect(negResult2.isQualified).toBe(false);

      // Confirm DB status remains 'pending' and 0 credits granted
      const { data: pendingRefCheck } = await adminSupabase.from('referrals').select('status').eq('id', referralId).single();
      expect(pendingRefCheck?.status).toBe('pending');

      const { count: zeroCreditsA } = await adminSupabase
        .from('membership_credits')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', userA.id)
        .eq('reason', 'REFERRAL_REWARD');
      expect(zeroCreditsA ?? 0).toBe(0);
      console.log('[Step 3] Negative qualification verified: 0 credits granted while health record missing.');

      // ─────────────────────────────────────────────────────────────
      // 4. QUALIFICATION KOŞULUNU TAMAMLA (Health Record Ekle)
      // ─────────────────────────────────────────────────────────────
      console.log('[Step 4] Adding canonical health record (weight log) for pet...');
      // Insert canonical weight log within 14 days
      const { error: weightError } = await adminSupabase.from('weight_logs').insert({
        pet_id: petId,
        weight_kg: 4.5,
        measured_at: new Date().toISOString(),
      });
      expect(weightError).toBeNull();

      // Trigger qualification now that all 4 conditions are met
      const qualResult = await qualifyReferral(referralId);
      expect(qualResult.checklist.accountCreated).toBe(true);
      expect(qualResult.checklist.emailVerified).toBe(true);
      expect(qualResult.checklist.hasPet).toBe(true);
      expect(qualResult.checklist.hasHealthRecordWithin14Days).toBe(true);
      expect(qualResult.isQualified).toBe(true);
      console.log('[Step 4] Qualification successfully passed all 4 conditions.');

      // ─────────────────────────────────────────────────────────────
      // 5. QUALIFICATION SONRASI DB SSOT DOĞRULAMASI
      // ─────────────────────────────────────────────────────────────
      console.log('[Step 5] Verifying DB SSOT records after qualification...');
      const { data: qualRefRow } = await adminSupabase.from('referrals').select('*').eq('id', referralId).single();
      expect(qualRefRow?.status).toBe('qualified');
      expect(qualRefRow?.qualified_at).not.toBeNull();
      expect(qualRefRow?.reward_days).toBe(30);

      // Verify User A membership_credits
      const { data: creditsA } = await adminSupabase
        .from('membership_credits')
        .select('*')
        .eq('profile_id', userA.id)
        .eq('reason', 'REFERRAL_REWARD');

      expect(creditsA).toHaveLength(1);
      expect(creditsA![0].credit_days).toBe(30);
      expect(creditsA![0].idempotency_key).toBe(`referral:${referralId}:referrer`);

      // Verify User B membership_credits
      const { data: creditsB } = await adminSupabase
        .from('membership_credits')
        .select('*')
        .eq('profile_id', userB.id)
        .eq('reason', 'REFERRAL_REWARD');

      expect(creditsB).toHaveLength(1);
      expect(creditsB![0].credit_days).toBe(30);
      expect(creditsB![0].idempotency_key).toBe(`referral:${referralId}:referee`);
      console.log('[Step 5] DB SSOT confirmed: Exactly 1 credit for Referrer (+30) and 1 for Referee (+30).');

      // ─────────────────────────────────────────────────────────────
      // 6. REFERRER UI DOĞRULAMASI (/owner/referral)
      // ─────────────────────────────────────────────────────────────
      console.log('[Step 6] Refreshing and verifying User A /owner/referral UI...');
      await referrerPage.reload();
      await dismissBlockingOverlays(referrerPage);

      await expect(referrerPage.getByTestId('referral-total-count')).toHaveText('1');
      await expect(referrerPage.getByTestId('referral-qualified-count')).toHaveText('1');
      await expect(referrerPage.getByTestId('referral-earned-days')).toHaveText('+30 Gün');

      // Verify invite item in list
      const inviteItem = referrerPage.getByTestId('referral-invite-item').first();
      await expect(inviteItem).toBeVisible();
      await expect(inviteItem.getByTestId('referral-invite-status')).toHaveText(/Ödüllendirildi/);
      console.log('[Step 6] User A /owner/referral UI verified (1 total, 1 qualified, +30 days).');

      // ─────────────────────────────────────────────────────────────
      // 7. ADMIN UI DOĞRULAMASI (/admin/memberships)
      // ─────────────────────────────────────────────────────────────
      console.log('[Step 7] Logging in as Admin and verifying /admin/memberships UI...');
      await loginUser(adminPage, ADMIN_EMAIL, ADMIN_PASSWORD);

      await adminPage.goto('/admin/memberships?nosplash=true', { waitUntil: 'domcontentloaded' });
      await dismissBlockingOverlays(adminPage);

      // Search for User A in user detail table
      const searchInput = adminPage.locator('input[placeholder*="İsim, soyisim veya e-posta"]');
      await searchInput.fill(userAEmail);
      await adminPage.waitForTimeout(500);

      // Verify row invites cell displays 1 / 1
      const userInvitesCell = adminPage.getByTestId(`user-invites-${userA.id}`);
      await expect(userInvitesCell).toBeVisible({ timeout: 10_000 });
      await expect(userInvitesCell).toHaveText(/1\s*\/\s*1/);

      // Click row to open "Kullanıcı Detay & Aksiyon Merkezi"
      await adminPage.getByTestId(`select-user-btn-${userA.id}`).click();

      // Verify "Davetler / Kazandırdığı Üyeler" card stats
      await expect(adminPage.getByTestId('admin-referrals-total')).toHaveText('1');
      await expect(adminPage.getByTestId('admin-referrals-qualified')).toHaveText('1');
      await expect(adminPage.getByTestId('admin-referrals-pending')).toHaveText('0');

      // Verify listed referred user
      const adminReferralItem = adminPage.getByTestId('admin-referral-item').first();
      await expect(adminReferralItem).toBeVisible();
      await expect(adminReferralItem).toContainText('Mert Referred');
      await expect(adminReferralItem.getByTestId('admin-referral-item-status')).toHaveText(/Kabul Edildi/);
      console.log('[Step 7] Admin /admin/memberships UI verified (1 total, 1 accepted, 0 pending, Mert Referred).');

      // ─────────────────────────────────────────────────────────────
      // 8. CROSS-PANEL CONSISTENCY MATRIX ASSERTION
      // ─────────────────────────────────────────────────────────────
      console.log('[Step 8] Verifying cross-panel consistency matrix...');
      const uiUserTotal = await referrerPage.getByTestId('referral-total-count').textContent();
      const uiUserQualified = await referrerPage.getByTestId('referral-qualified-count').textContent();
      const uiUserEarned = await referrerPage.getByTestId('referral-earned-days').textContent();
      const uiAdminTotal = await adminPage.getByTestId('admin-referrals-total').textContent();
      const uiAdminQualified = await adminPage.getByTestId('admin-referrals-qualified').textContent();
      const uiAdminPending = await adminPage.getByTestId('admin-referrals-pending').textContent();

      const { count: dbQualifiedCount } = await adminSupabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', userA.id)
        .eq('status', 'qualified');

      const { count: dbReferrerRewardCount } = await adminSupabase
        .from('membership_credits')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', userA.id)
        .eq('reason', 'REFERRAL_REWARD');

      const { count: dbReferredRewardCount } = await adminSupabase
        .from('membership_credits')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', userB.id)
        .eq('reason', 'REFERRAL_REWARD');

      const consistencyMatrix = {
        userATotal: Number(uiUserTotal?.trim()),
        userAQualified: Number(uiUserQualified?.trim()),
        userAEarned: uiUserEarned?.trim(),
        adminTotal: Number(uiAdminTotal?.trim()),
        adminAccepted: Number(uiAdminQualified?.trim()),
        adminPending: Number(uiAdminPending?.trim()),
        dbQualifiedReferrals: dbQualifiedCount,
        dbReferrerCredits: dbReferrerRewardCount,
        dbReferredCredits: dbReferredRewardCount,
      };

      console.log('[Step 8] Matrix:', JSON.stringify(consistencyMatrix));

      expect(consistencyMatrix.userATotal).toBe(1);
      expect(consistencyMatrix.userAQualified).toBe(1);
      expect(consistencyMatrix.userAEarned).toBe('+30 Gün');
      expect(consistencyMatrix.adminTotal).toBe(1);
      expect(consistencyMatrix.adminAccepted).toBe(1);
      expect(consistencyMatrix.adminPending).toBe(0);
      expect(consistencyMatrix.dbQualifiedReferrals).toBe(1);
      expect(consistencyMatrix.dbReferrerCredits).toBe(1);
      expect(consistencyMatrix.dbReferredCredits).toBe(1);
      console.log('[Step 8] Cross-panel consistency: PASS');

      // ─────────────────────────────────────────────────────────────
      // 9. DUPLICATE / IDEMPOTENCY RE-TRIGGER TEST
      // ─────────────────────────────────────────────────────────────
      console.log('[Step 9] Re-triggering qualification lifecycle to prove duplicate prevention...');

      // Re-trigger 1: qualifyReferral directly
      const repeatQualResult = await qualifyReferral(referralId);
      expect(repeatQualResult.isQualified).toBe(true);

      // Re-trigger 2: POST /api/referral/use by User B again
      await referredPage.evaluate(async (code) => {
        return fetch('/api/referral/use', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referralCode: code }),
        }).then(r => r.json());
      }, referralCode);

      // Verify DB: Still EXACTLY 1 credit for User A and User B
      const { data: duplicateCreditsA } = await adminSupabase
        .from('membership_credits')
        .select('*')
        .eq('profile_id', userA.id)
        .eq('reason', 'REFERRAL_REWARD');

      expect(duplicateCreditsA).toHaveLength(1);

      const { data: duplicateCreditsB } = await adminSupabase
        .from('membership_credits')
        .select('*')
        .eq('profile_id', userB.id)
        .eq('reason', 'REFERRAL_REWARD');

      expect(duplicateCreditsB).toHaveLength(1);

      const { count: duplicateReferralsCount } = await adminSupabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', userA.id);

      expect(duplicateReferralsCount).toBe(1);

      // Re-verify Referrer UI: Remains 1, 1, +30 Gün
      await referrerPage.reload({ waitUntil: 'domcontentloaded' });
      await dismissBlockingOverlays(referrerPage);
      await expect(referrerPage.getByTestId('referral-total-count')).toHaveText('1');
      await expect(referrerPage.getByTestId('referral-qualified-count')).toHaveText('1');
      await expect(referrerPage.getByTestId('referral-earned-days')).toHaveText('+30 Gün');

      // Re-verify Admin UI: Remains 1, 1, 0
      await adminPage.reload({ waitUntil: 'domcontentloaded' });
      await dismissBlockingOverlays(adminPage);
      await adminPage.locator('input[placeholder*="İsim, soyisim veya e-posta"]').fill(userAEmail);
      await adminPage.waitForTimeout(500);
      await adminPage.getByTestId(`select-user-btn-${userA.id}`).click();

      await expect(adminPage.getByTestId('admin-referrals-total')).toHaveText('1');
      await expect(adminPage.getByTestId('admin-referrals-qualified')).toHaveText('1');
      await expect(adminPage.getByTestId('admin-referrals-pending')).toHaveText('0');

      console.log('[Step 9] Idempotency & Duplicate Reward Prevention: PASS');
      console.log('─────────────────────────────────────────────────────────────');
      console.log('PASS — persona-referral-membership');
      console.log('qualifyReferral regression: PASS');
      console.log('referral SSOT: PASS');
      console.log('user/admin consistency: PASS');
      console.log('idempotency: PASS');
      console.log('negative qualification: PASS');
      console.log('─────────────────────────────────────────────────────────────');
    } finally {
      // Cleanup contexts
      await referrerContext.close().catch(() => {});
      await referredContext.close().catch(() => {});
      await adminContext.close().catch(() => {});

      // Cleanup test data from DB
      try {
        await adminSupabase.from('referrals').delete().or(`referrer_id.eq.${userA.id},referred_id.eq.${userA.id},referrer_id.eq.${userB.id},referred_id.eq.${userB.id}`);
        await adminSupabase.from('membership_credits').delete().or(`profile_id.eq.${userA.id},profile_id.eq.${userB.id}`);
        await adminSupabase.from('pets').delete().eq('owner_id', userB.id);
        await adminSupabase.from('profiles').delete().or(`id.eq.${userA.id},id.eq.${userB.id}`);
        await adminSupabase.auth.admin.deleteUser(userA.id);
        await adminSupabase.auth.admin.deleteUser(userB.id);
      } catch (cleanupErr) {
        console.warn('[Cleanup] Error during teardown:', cleanupErr);
      }
    }
  });
});
