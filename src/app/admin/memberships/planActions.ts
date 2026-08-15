'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

// FORENSIC DÜZELTME (schema-drift sweep): bkz. MembershipService.ts'deki
// eşdeğer not — `premium_audit_logs`'un gerçek şeması `user_id NOT NULL,
// action_type NOT NULL, old_value, new_value, ip_address, created_at`
// (20260807013400_enterprise_premium_v3.sql, koşulsuz ilk CREATE TABLE).
// Bu dosyadaki 4 çağrı noktası `admin_id`/`action`/`target_profile_id`/
// `reason` (hiçbiri gerçek tabloda yok) kullanıyordu.
//
// ÖNEMLİ SINIRLAMA (kapsam dışı bırakıldı, düzeltilmedi): bu dosya
// 'use client' işaretli ve tarayıcıda, yalnızca oturum-bazlı (anon-key)
// Supabase client'ıyla çalışıyor. `premium_audit_logs` tablosu ise
// yalnızca `service_role`'e GRANT edilmiş (`GRANT SELECT, INSERT,
// UPDATE, DELETE ON public.premium_audit_logs TO service_role;`) ve
// `authenticated` rolü için hiçbir INSERT RLS politikası tanımlı değil.
// Bu, muhtemelen kasıtlı bir güvenlik sınırı (denetim kayıtlarının
// yalnızca sunucu tarafından yazılabilmesi). Sonuç: kolon adları
// düzeltilse bile bu insert GRANT seviyesinde reddedilmeye devam
// edecek. Bunu çözmek bu işlemi sunucu tarafına taşımayı (yeni bir API
// route/mimari kararı) gerektirir — bu, "minimal forensic düzeltme"
// kapsamının dışında bırakıldı ve ayrıca raporlandı. Burada yapılan
// tek şey: (a) gerçek şemaya doğru alan eşlemesi, (b) hatanın sessizce
// yutulması yerine loglanması — böylece ileride biri bu akışı sunucu
// tarafına taşırsa doğru veri şekli zaten hazır olur. Birincil işlemler
// (plan create/update/archive/duplicate) bu insert'in başarısından
// bağımsızdır ve etkilenmez.
export async function writeAuditLog(
  supabase: ReturnType<typeof createBrowserSupabaseClient>,
  actorId: string,
  action: string,
  reason: string,
  oldValue: unknown,
  newValue: unknown
) {
  const { error } = await supabase.from('premium_audit_logs').insert({
    user_id: actorId,
    action_type: action,
    old_value: oldValue ?? null,
    new_value: {
      ...(newValue && typeof newValue === 'object' ? newValue : {}),
      reason,
    },
  });
  if (error) {
    console.error(`[planActions] Audit log yazılamadı (${action}):`, error.message);
  }
}

export interface PlanFormData {
  id?: string;
  plan_key: string;
  plan_name: string;
  display_name: string;
  description: string;
  icon: string;
  accent_color: string;
  status: 'active' | 'draft' | 'archived' | 'disabled';
  price_monthly: number;
  price_yearly: number;
  currency: string;
  billing_cycle: 'monthly' | 'quarterly' | 'annual';
  trial_days: number;
  grace_days: number;
  visibility: 'public' | 'hidden' | 'draft';
  sort_order: number;
  stripe_product_id?: string;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
  iyzico_plan_code?: string;
  google_play_product_id?: string;
  apple_product_id?: string;
  upgrade_allowed: boolean;
  downgrade_allowed: boolean;
  bundle_keys?: string[];
}

export async function createPlanAction(data: PlanFormData) {
  const supabase = createBrowserSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Yetkisiz işlem: Oturum açılmamış.');
  }

  // Validations
  if (!data.plan_key || !data.plan_key.trim()) {
    throw new Error('Plan anahtarı (Internal Key) zorunludur.');
  }
  if (data.price_monthly < 0 || data.price_yearly < 0) {
    throw new Error('Fiyatlar 0 veya pozitif sayı olmalıdır.');
  }

  // Check duplicate key
  const { data: existing } = await supabase
    .from('subscription_plans')
    .select('id')
    .eq('plan_key', data.plan_key.trim())
    .maybeSingle();

  if (existing) {
    throw new Error(`"${data.plan_key}" anahtarı ile kayıtlı başka bir plan zaten mevcut.`);
  }

  // 1. Insert plan
  const { data: createdPlan, error: insertError } = await supabase
    .from('subscription_plans')
    .insert({
      plan_key: data.plan_key.trim(),
      plan_name: data.plan_name || data.display_name,
      display_name: data.display_name || data.plan_name,
      description: data.description || '',
      icon: data.icon || '⭐',
      accent_color: data.accent_color || 'purple',
      plan_type: 'consumer',
      status: data.status || 'active',
      price_monthly: data.price_monthly,
      price_yearly: data.price_yearly,
      currency: data.currency || 'TRY',
      billing_cycle: data.billing_cycle || 'monthly',
      trial_days: data.trial_days || 0,
      grace_days: data.grace_days || 7,
      visibility: data.visibility || 'public',
      sort_order: data.sort_order || 100,
      stripe_product_id: data.stripe_product_id || null,
      stripe_price_id_monthly: data.stripe_price_id_monthly || null,
      stripe_price_id_yearly: data.stripe_price_id_yearly || null,
      iyzico_plan_code: data.iyzico_plan_code || null,
      google_play_product_id: data.google_play_product_id || null,
      apple_product_id: data.apple_product_id || null,
      upgrade_allowed: data.upgrade_allowed !== false,
      downgrade_allowed: data.downgrade_allowed !== false,
      is_active: data.status === 'active',
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Plan oluşturma hatası: ${insertError.message}`);
  }

  // 2. Insert bundle relations if provided
  if (data.bundle_keys && data.bundle_keys.length > 0) {
    const bundleRows = data.bundle_keys.map((bKey) => ({
      plan_key: data.plan_key.trim(),
      bundle_key: bKey
    }));
    await supabase.from('plan_bundles').insert(bundleRows);
  }

  // 3. Write Audit Log
  await writeAuditLog(
    supabase,
    user.id,
    'plan_created',
    `Yeni abonelik planı oluşturuldu: ${data.plan_key}`,
    null,
    { plan_key: data.plan_key, display_name: data.display_name, price_monthly: data.price_monthly }
  );

  return createdPlan;
}

export async function updatePlanAction(id: string, data: Partial<PlanFormData>) {
  const supabase = createBrowserSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Yetkisiz işlem: Oturum açılmamış.');
  }

  if (data.price_monthly !== undefined && data.price_monthly < 0) {
    throw new Error('Aylık fiyat 0 veya daha büyük olmalıdır.');
  }
  if (data.price_yearly !== undefined && data.price_yearly < 0) {
    throw new Error('Yıllık fiyat 0 veya daha büyük olmalıdır.');
  }

  // Get current plan for audit
  const { data: currentPlan } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', id)
    .single();

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString()
  };

  if (data.plan_name !== undefined) updatePayload.plan_name = data.plan_name;
  if (data.display_name !== undefined) updatePayload.display_name = data.display_name;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.icon !== undefined) updatePayload.icon = data.icon;
  if (data.accent_color !== undefined) updatePayload.accent_color = data.accent_color;
  if (data.status !== undefined) {
    updatePayload.status = data.status;
    updatePayload.is_active = data.status === 'active';
  }
  if (data.price_monthly !== undefined) updatePayload.price_monthly = data.price_monthly;
  if (data.price_yearly !== undefined) updatePayload.price_yearly = data.price_yearly;
  if (data.currency !== undefined) updatePayload.currency = data.currency;
  if (data.billing_cycle !== undefined) updatePayload.billing_cycle = data.billing_cycle;
  if (data.trial_days !== undefined) updatePayload.trial_days = data.trial_days;
  if (data.grace_days !== undefined) updatePayload.grace_days = data.grace_days;
  if (data.visibility !== undefined) updatePayload.visibility = data.visibility;
  if (data.sort_order !== undefined) updatePayload.sort_order = data.sort_order;
  if (data.stripe_product_id !== undefined) updatePayload.stripe_product_id = data.stripe_product_id;
  if (data.stripe_price_id_monthly !== undefined) updatePayload.stripe_price_id_monthly = data.stripe_price_id_monthly;
  if (data.stripe_price_id_yearly !== undefined) updatePayload.stripe_price_id_yearly = data.stripe_price_id_yearly;
  if (data.iyzico_plan_code !== undefined) updatePayload.iyzico_plan_code = data.iyzico_plan_code;
  if (data.google_play_product_id !== undefined) updatePayload.google_play_product_id = data.google_play_product_id;
  if (data.apple_product_id !== undefined) updatePayload.apple_product_id = data.apple_product_id;
  if (data.upgrade_allowed !== undefined) updatePayload.upgrade_allowed = data.upgrade_allowed;
  if (data.downgrade_allowed !== undefined) updatePayload.downgrade_allowed = data.downgrade_allowed;

  const { data: updatedPlan, error } = await supabase
    .from('subscription_plans')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Plan güncelleme hatası: ${error.message}`);
  }

  // Update Bundle Assignments if provided
  if (data.bundle_keys !== undefined && currentPlan?.plan_key) {
    await supabase.from('plan_bundles').delete().eq('plan_key', currentPlan.plan_key);
    if (data.bundle_keys.length > 0) {
      const bundleRows = data.bundle_keys.map((bKey) => ({
        plan_key: currentPlan.plan_key,
        bundle_key: bKey
      }));
      await supabase.from('plan_bundles').insert(bundleRows);
    }
  }

  // Write Audit Log
  const isProviderChange =
    data.stripe_product_id !== undefined ||
    data.iyzico_plan_code !== undefined ||
    data.apple_product_id !== undefined ||
    data.google_play_product_id !== undefined;

  await writeAuditLog(
    supabase,
    user.id,
    isProviderChange ? 'provider_mapping_updated' : 'plan_updated',
    `Plan güncellendi: ${currentPlan?.plan_key || id}`,
    currentPlan,
    updatedPlan
  );

  return updatedPlan;
}

export async function archivePlanAction(id: string) {
  const supabase = createBrowserSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Yetkisiz işlem: Oturum açılmamış.');
  }

  const { data: updatedPlan, error } = await supabase
    .from('subscription_plans')
    .update({
      status: 'archived',
      visibility: 'draft',
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Plan arşivleme hatası: ${error.message}`);
  }

  await writeAuditLog(
    supabase,
    user.id,
    'plan_archived',
    `Plan arşivlendi: ${updatedPlan.plan_key}`,
    { id, status: 'active' },
    { id, status: 'archived' }
  );

  return updatedPlan;
}

export async function duplicatePlanAction(id: string) {
  const supabase = createBrowserSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Yetkisiz işlem: Oturum açılmamış.');
  }

  const { data: original, error: fetchError } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !original) {
    throw new Error('Kopyalanacak plan bulunamadı.');
  }

  const newKey = `${original.plan_key}_copy_${Date.now().toString().slice(-4)}`;
  const newName = `${original.display_name || original.plan_name} (Kopya)`;

  const { data: duplicated, error: dupError } = await supabase
    .from('subscription_plans')
    .insert({
      ...original,
      id: undefined,
      plan_key: newKey,
      plan_name: newName,
      display_name: newName,
      status: 'draft',
      visibility: 'draft',
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (dupError) {
    throw new Error(`Plan kopyalama hatası: ${dupError.message}`);
  }

  // Copy bundle relationships
  const { data: bundles } = await supabase
    .from('plan_bundles')
    .select('bundle_key')
    .eq('plan_key', original.plan_key);

  if (bundles && bundles.length > 0) {
    const newBundleRows = bundles.map((b: { bundle_key: string }) => ({
      plan_key: newKey,
      bundle_key: b.bundle_key
    }));
    await supabase.from('plan_bundles').insert(newBundleRows);
  }

  await writeAuditLog(
    supabase,
    user.id,
    'plan_duplicated',
    `Plan kopyalandı: ${original.plan_key} -> ${newKey}`,
    { original_key: original.plan_key },
    { new_key: newKey }
  );

  return duplicated;
}

export async function toggleVisibilityAction(id: string, visibility: 'public' | 'hidden' | 'draft') {
  return updatePlanAction(id, { visibility });
}
