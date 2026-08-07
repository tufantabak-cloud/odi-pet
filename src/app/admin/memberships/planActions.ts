'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

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
  await supabase.from('premium_audit_logs').insert({
    admin_id: user.id,
    action: 'plan_created',
    target_profile_id: user.id,
    reason: `Yeni abonelik planı oluşturuldu: ${data.plan_key}`,
    old_value: null,
    new_value: { plan_key: data.plan_key, display_name: data.display_name, price_monthly: data.price_monthly }
  });

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

  await supabase.from('premium_audit_logs').insert({
    admin_id: user.id,
    action: isProviderChange ? 'provider_mapping_updated' : 'plan_updated',
    target_profile_id: user.id,
    reason: `Plan güncellendi: ${currentPlan?.plan_key || id}`,
    old_value: currentPlan,
    new_value: updatedPlan
  });

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

  await supabase.from('premium_audit_logs').insert({
    admin_id: user.id,
    action: 'plan_archived',
    target_profile_id: user.id,
    reason: `Plan arşivlendi: ${updatedPlan.plan_key}`,
    old_value: { id, status: 'active' },
    new_value: { id, status: 'archived' }
  });

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

  await supabase.from('premium_audit_logs').insert({
    admin_id: user.id,
    action: 'plan_duplicated',
    target_profile_id: user.id,
    reason: `Plan kopyalandı: ${original.plan_key} -> ${newKey}`,
    old_value: { original_key: original.plan_key },
    new_value: { new_key: newKey }
  });

  return duplicated;
}

export async function toggleVisibilityAction(id: string, visibility: 'public' | 'hidden' | 'draft') {
  return updatePlanAction(id, { visibility });
}
