import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { CreatePlanInput, UpdatePlanInput } from './schema';
import { normalizeSpecies } from '@/lib/species';
import { calculateNextBoosterDate } from '@/features/pets/vaccination-algorithm';

export function calculateNextOccurrenceDate(
  baseScheduledAt: string,
  repeatRule: string | null,
  extraData?: any
): string | null {
  const baseDate = new Date(baseScheduledAt);
  if (isNaN(baseDate.getTime())) return null;

  // 1. Vaccine category with a known vaccine_code: use vaccine booster rules engine
  const vaccineCode = extraData?.vaccine_code || extraData?.vaccine?.code;
  if (vaccineCode) {
    try {
      const { date } = calculateNextBoosterDate(baseScheduledAt, vaccineCode);
      if (date && !isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch {
      /* continue to check explicit repeat_rule */
    }
  }

  // 2. Explicit repeat_rule provided by user (hour, daily, weekly, monthly, yearly)
  if (repeatRule && repeatRule !== 'none') {
    const interval = Number(extraData?.interval) || 1;
    const nextDate = new Date(baseDate);

    if (repeatRule === 'hour' || repeatRule === 'hourly') {
      nextDate.setHours(nextDate.getHours() + interval);
    } else if (repeatRule === 'daily') {
      nextDate.setDate(nextDate.getDate() + interval);
    } else if (repeatRule === 'weekly') {
      nextDate.setDate(nextDate.getDate() + interval * 7);
    } else if (repeatRule === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + interval);
    } else if (repeatRule === 'yearly') {
      nextDate.setFullYear(nextDate.getFullYear() + interval);
    } else {
      return null;
    }
    return nextDate.toISOString();
  }

  // 3. Unsupported category or no explicit repeat_rule: DO NOT guess +365 days! Return null safely.
  return null;
}

export function calculateFireAt(scheduledAt: string, notifBefore: number | null, notifUnit: string): string | null {
  if (notifBefore === null) return null;
  const date = new Date(scheduledAt);
  if (notifUnit === 'minute') {
    date.setMinutes(date.getMinutes() - notifBefore);
  } else if (notifUnit === 'hour') {
    date.setHours(date.getHours() - notifBefore);
  } else if (notifUnit === 'day') {
    date.setDate(date.getDate() - notifBefore);
  }
  return date.toISOString();
}

export async function verifyPetOwnership(userId: string, petId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: petOwner, error } = await supabase
    .from('pet_owners')
    .select('id')
    .eq('pet_id', petId)
    .eq('profile_id', userId)
    .single();
    
  if (error || !petOwner) {
    throw new Error('FORBIDDEN');
  }
  return true;
}

export async function checkDuplicateCompletedPlanSameDay(
  supabase: any,
  input: CreatePlanInput
): Promise<void> {
  if (!input.scheduled_at) return;

  const targetDateStr = input.scheduled_at.includes('T')
    ? input.scheduled_at.split('T')[0]
    : input.scheduled_at;

  const { data: completedPlans, error: completedError } = await supabase
    .from('plans')
    .select('id, category, sub_type, title, scheduled_at, extra_data, is_active')
    .eq('pet_id', input.pet_id)
    .eq('status', 'completed')
    .gte('scheduled_at', `${targetDateStr}T00:00:00.000Z`)
    .lte('scheduled_at', `${targetDateStr}T23:59:59.999Z`);

  if (completedError) {
    console.error('[checkDuplicateCompletedPlanSameDay] Supabase error:', completedError);
  }

  if (!completedPlans || completedPlans.length === 0) return;

  const toTRLower = (s: string) => (s || '').trim().toLocaleLowerCase('tr-TR');
  const category = input.category;
  const subType = (input.sub_type || '').trim();
  const subTypeLower = toTRLower(subType);

  for (const p of completedPlans) {
    // Aşı kontrolü
    if (category === 'asi' && p.category === 'asi') {
      const vaccineCode = input.extra_data?.vaccine_code || input.extra_data?.vaccine?.code;
      const pCode = p.extra_data?.vaccine_code || p.extra_data?.vaccine?.code;
      if (vaccineCode && pCode && vaccineCode.toUpperCase() === pCode.toUpperCase()) {
        const doseNumber = input.extra_data?.dose_number;
        const pDose = p.extra_data?.dose_number;
        if (doseNumber !== undefined && doseNumber !== null && pDose !== undefined && pDose !== null) {
          if (String(doseNumber) === String(pDose)) {
            throw new Error(`DUPLICATE_COMPLETED_PLAN_SAME_DAY:${p.id}:asi:${p.sub_type || subType}:${p.scheduled_at}`);
          }
        } else {
          throw new Error(`DUPLICATE_COMPLETED_PLAN_SAME_DAY:${p.id}:asi:${p.sub_type || subType}:${p.scheduled_at}`);
        }
      } else if (toTRLower(p.sub_type) === subTypeLower) {
        throw new Error(`DUPLICATE_COMPLETED_PLAN_SAME_DAY:${p.id}:asi:${p.sub_type || subType}:${p.scheduled_at}`);
      }
      continue;
    }

    // Parazit kontrolü
    if (category === 'parazit' && p.category === 'parazit') {
      const normalizeParasiteSub = (s: string) => toTRLower(s).replace(/\s+/g, '');
      const targetNorm = normalizeParasiteSub(subType);
      const existNorm = normalizeParasiteSub(p.sub_type || '');
      const isMatch = existNorm === targetNorm ||
        (existNorm.includes('iç') && targetNorm.includes('iç')) ||
        (existNorm.includes('dış') && targetNorm.includes('dış')) ||
        (existNorm.includes('tasma') && targetNorm.includes('tasma')) ||
        (existNorm.includes('birleşik') && targetNorm.includes('birleşik'));

      if (isMatch) {
        throw new Error(`DUPLICATE_COMPLETED_PLAN_SAME_DAY:${p.id}:parazit:${p.sub_type || subType}:${p.scheduled_at}`);
      }
      continue;
    }

    // İlaç kontrolü
    if (category === 'saglik' && subType === 'İlaç' && p.category === 'saglik' && p.sub_type === 'İlaç') {
      const targetMedName = toTRLower(input.extra_data?.medication_name || input.extra_data?.title || '');
      const existMedName = toTRLower(p.extra_data?.medication_name || p.extra_data?.title || '');
      if (targetMedName && existMedName && targetMedName === existMedName) {
        throw new Error(`DUPLICATE_COMPLETED_PLAN_SAME_DAY:${p.id}:saglik:İlaç:${p.scheduled_at}`);
      }
      continue;
    }

    // Standart Kategoriler (bakim, hijyen, aktivite, beslenme, kontrol, saglik)
    const isCategoryMatch = p.category === category ||
      (category === 'kontrol' && p.category === 'saglik' && (p.extra_data?.original_category === 'kontrol' || ['kontrol', 'acil', 'takip', 'genel kontrol'].includes(toTRLower(p.sub_type)))) ||
      (category === 'saglik' && p.category === 'kontrol');

    if (isCategoryMatch) {
      if (subType === 'Diğer' && p.sub_type === 'Diğer') {
        const targetText = toTRLower(input.extra_data?.custom_text || input.title || '');
        const existText = toTRLower(p.extra_data?.custom_text || p.title || '');
        if (targetText && existText && targetText === existText) {
          throw new Error(`DUPLICATE_COMPLETED_PLAN_SAME_DAY:${p.id}:${category}:${subType}:${p.scheduled_at}`);
        }
      } else if (p.sub_type && toTRLower(p.sub_type) === subTypeLower) {
        throw new Error(`DUPLICATE_COMPLETED_PLAN_SAME_DAY:${p.id}:${category}:${p.sub_type}:${p.scheduled_at}`);
      }
    }
  }
}

export async function checkDuplicateActivePlan(
  supabase: any,
  input: CreatePlanInput
): Promise<void> {
  const isPastDone = !!input.extra_data?.is_past_done;
  const isRecurring = !!input.repeat_rule && input.repeat_rule !== 'none';

  // 0. Geçmişte veya o an uygulanmış (is_past_done = true) bir kayıt ekleniyorsa,
  // aynı gün için aynı alt türde zaten bir "yapıldı" kaydı var mı denetle!
  if (isPastDone) {
    await checkDuplicateCompletedPlanSameDay(supabase, input);
    if (!isRecurring) {
      return;
    }
  }

  // Pet'in mevcut aktif veya gecikmiş ana planlarını sorgula
  const { data: existingPlans } = await supabase
    .from('plans')
    .select('id, category, sub_type, title, scheduled_at, extra_data, is_active')
    .eq('pet_id', input.pet_id)
    .in('status', ['active', 'overdue'])
    .is('parent_plan_id', null);

  if (!existingPlans || existingPlans.length === 0) {
    return;
  }

  const toTRLower = (s: string) => (s || '').trim().toLocaleLowerCase('tr-TR');

  const category = input.category;
  const subType = (input.sub_type || '').trim();
  const subTypeLower = toTRLower(subType);

  // 1. Aşı Kodu ve Doz Kontrolü (category === 'asi')
  if (category === 'asi') {
    const vaccineCode = input.extra_data?.vaccine_code || input.extra_data?.vaccine?.code;
    const doseNumber = input.extra_data?.dose_number;

    for (const p of existingPlans) {
      if (p.is_active === false || p.category !== 'asi') continue;
      const pCode = p.extra_data?.vaccine_code || p.extra_data?.vaccine?.code;
      const pDose = p.extra_data?.dose_number;

      if (vaccineCode && pCode && vaccineCode.toUpperCase() === pCode.toUpperCase()) {
        if (doseNumber !== undefined && doseNumber !== null) {
          if (pDose !== undefined && pDose !== null && String(pDose) === String(doseNumber)) {
            throw new Error(`DUPLICATE_ACTIVE_VACCINE_PLAN:${p.id}`);
          }
        } else {
          const scheduledDate = new Date(input.scheduled_at).toISOString().split('T')[0];
          const dateStr = new Date(p.scheduled_at).toISOString().split('T')[0];
          if (dateStr === scheduledDate) {
            throw new Error(`DUPLICATE_ACTIVE_VACCINE_PLAN:${p.id}`);
          }
        }
      }
    }
    return;
  }

  // 2. Parazit Kontrolü (category === 'parazit')
  if (category === 'parazit') {
    const normalizeParasiteSub = (s: string) => toTRLower(s).replace(/\s+/g, '');
    const targetNorm = normalizeParasiteSub(subType);

    for (const p of existingPlans) {
      if (p.is_active === false || p.category !== 'parazit') continue;
      const existNorm = normalizeParasiteSub(p.sub_type || '');
      const isMatch = existNorm === targetNorm ||
        (existNorm.includes('iç') && targetNorm.includes('iç')) ||
        (existNorm.includes('dış') && targetNorm.includes('dış')) ||
        (existNorm.includes('tasma') && targetNorm.includes('tasma')) ||
        (existNorm.includes('birleşik') && targetNorm.includes('birleşik'));

      if (isMatch) {
        throw new Error(`DUPLICATE_ACTIVE_PLAN:${p.id}:parazit:${p.sub_type || subType}:${p.scheduled_at}`);
      }
    }
    return;
  }

  // 3. İlaç Kontrolü (category === 'saglik' && sub_type === 'İlaç')
  if (category === 'saglik' && subType === 'İlaç') {
    const targetMedName = toTRLower(input.extra_data?.medication_name || input.extra_data?.title || '');
    if (targetMedName) {
      for (const p of existingPlans) {
        if (p.is_active === false) continue;
        if (p.category === 'saglik' && p.sub_type === 'İlaç') {
          const existMedName = toTRLower(p.extra_data?.medication_name || p.extra_data?.title || '');
          if (existMedName && existMedName === targetMedName) {
            throw new Error(`DUPLICATE_ACTIVE_PLAN:${p.id}:saglik:İlaç:${p.scheduled_at}`);
          }
        }
      }
    }
    return;
  }

  // 4. Standart Kategoriler (bakim, hijyen, aktivite, beslenme, kontrol, saglik diğerleri)
  for (const p of existingPlans) {
    if (p.is_active === false) continue;

    const isCategoryMatch = p.category === category ||
      (category === 'kontrol' && p.category === 'saglik' && (p.extra_data?.original_category === 'kontrol' || ['kontrol', 'acil', 'takip', 'genel kontrol'].includes(toTRLower(p.sub_type)))) ||
      (category === 'saglik' && p.category === 'kontrol');

    if (isCategoryMatch) {
      if (subType === 'Diğer' && p.sub_type === 'Diğer') {
        const targetText = toTRLower(input.extra_data?.custom_text || input.title || '');
        const existText = toTRLower(p.extra_data?.custom_text || p.title || '');
        if (targetText && existText && targetText === existText) {
          throw new Error(`DUPLICATE_ACTIVE_PLAN:${p.id}:${category}:${subType}:${p.scheduled_at}`);
        }
      } else if (p.sub_type && toTRLower(p.sub_type) === subTypeLower) {
        throw new Error(`DUPLICATE_ACTIVE_PLAN:${p.id}:${category}:${p.sub_type}:${p.scheduled_at}`);
      }
    }
  }
}

export async function createPlan(userId: string, input: CreatePlanInput) {
  await verifyPetOwnership(userId, input.pet_id);
  const supabase = await createServerSupabaseClient();

  // Centralized duplicate active plan check across all categories
  await checkDuplicateActivePlan(supabase, input);

  // Get pet info for species validation
  const { data: pet, error: petErr } = await supabase
    .from('pets')
    .select('species')
    .eq('id', input.pet_id)
    .single();

  if (petErr || !pet) {
    throw new Error('PROTOCOL_NOT_FOUND');
  }

  // 1. Vaccine Category Validations
  if (input.category === 'asi') {
    const vaccineCode = input.extra_data?.vaccine_code || input.extra_data?.vaccine?.code;
    if (!vaccineCode) {
      throw new Error('PROTOCOL_NOT_FOUND');
    }

    const { data: proto, error: protoErr } = await supabase
      .from('vaccine_protocols')
      .select('*')
      .eq('vaccine_code', vaccineCode)
      .maybeSingle();

    if (protoErr || !proto) {
      throw new Error('PROTOCOL_NOT_FOUND');
    }

    if (!proto.is_active) {
      throw new Error('INACTIVE_PROTOCOL');
    }

    if (proto.species !== 'both' && normalizeSpecies(proto.species) !== normalizeSpecies(pet.species)) {
      throw new Error('PROTOCOL_SPECIES_MISMATCH');
    }

    // Check preference
    const { data: pref } = await supabase
      .from('pet_vaccine_preferences')
      .select('enabled')
      .eq('pet_id', input.pet_id)
      .eq('vaccine_code', vaccineCode)
      .maybeSingle();

    if (pref && !pref.enabled && proto.category !== 'legal' && proto.category !== 'core') {
      throw new Error('VACCINE_PREFERENCE_DISABLED');
    }
  }

  // 2. Parasite Category Validations
  if (input.category === 'parazit') {
    const parasiteProtoId = input.extra_data?.product?.id || input.extra_data?.parasite_protocol_id;
    if (!parasiteProtoId) {
      throw new Error('PROTOCOL_NOT_FOUND');
    }

    const { data: proto, error: protoErr } = await supabase
      .from('parasite_protocols')
      .select('*')
      .eq('id', parasiteProtoId)
      .maybeSingle();

    if (protoErr || !proto) {
      throw new Error('PROTOCOL_NOT_FOUND');
    }

    if (!proto.is_active) {
      throw new Error('INACTIVE_PROTOCOL');
    }

    if (proto.species !== 'both' && normalizeSpecies(proto.species) !== normalizeSpecies(pet.species)) {
      throw new Error('PROTOCOL_SPECIES_MISMATCH');
    }

    // Check preference
    const { data: pref } = await supabase
      .from('pet_parasite_preferences')
      .select('enabled')
      .eq('pet_id', input.pet_id)
      .eq('parasite_protocol_id', parasiteProtoId)
      .maybeSingle();

    if (pref && !pref.enabled) {
      throw new Error('PARASITE_PREFERENCE_DISABLED');
    }

    // Parazit protokol kimliğini tek ve kanonik biçimde plana yaz.
    input.extra_data = {
      ...(input.extra_data || {}),
      parasite_protocol_id: proto.id,
      parasite_code: proto.parasite_code,
      parasite_type: proto.parasite_type,
    };

    const subCat = input.sub_type;
    const pType = proto.parasite_type;

    if (subCat === 'İç Parazit') {
      if (pType !== 'internal' && pType !== 'combined') {
        throw new Error('PROTOCOL_TYPE_MISMATCH');
      }
    } else if (subCat === 'Dış Parazit') {
      if (pType !== 'external' && pType !== 'combined') {
        throw new Error('PROTOCOL_TYPE_MISMATCH');
      }
    } else if (subCat === 'Birleşik Parazit') {
      if (pType !== 'combined') {
        throw new Error('PROTOCOL_TYPE_MISMATCH');
      }
    } else if (subCat === 'Parazit Tasması') {
      if (pType !== 'collar') {
        throw new Error('PROTOCOL_TYPE_MISMATCH');
      }
    }
  }

  const isPastDone = !!input.extra_data?.is_past_done;
  const isRecurring = !!input.repeat_rule;

  let scheduledAt = input.scheduled_at;
  let initialStatus = 'active';

  if (isPastDone) {
    if (isRecurring) {
      const nextScheduledAtStr = calculateNextOccurrenceDate(
        input.scheduled_at,
        input.repeat_rule || null,
        input.extra_data
      ) || input.scheduled_at;

      let mainInsertPayload: any = {
        user_id: userId,
        pet_id: input.pet_id,
        category: input.category,
        sub_type: input.sub_type,
        title: input.title || null,
        scheduled_at: nextScheduledAtStr,
        repeat_rule: input.repeat_rule || null,
        ends_at: input.ends_at || null,
        notif_before: input.notif_before,
        notif_unit: input.notif_unit,
        note: input.note || null,
        extra_data: { ...(input.extra_data || {}), is_past_done: false },
        status: 'active',
        source: input.source || 'user',
        policy: input.policy || 'optional',
        assigned_to: input.assigned_to || null,
      };

      let { data: mainPlan, error: mainPlanErr } = await supabase
        .from('plans')
        .insert(mainInsertPayload)
        .select()
        .single();

      if (mainPlanErr && mainPlanErr.code === '23514' && input.category === 'kontrol') {
        mainInsertPayload.category = 'saglik';
        mainInsertPayload.extra_data.original_category = 'kontrol';
        const retry = await supabase.from('plans').insert(mainInsertPayload).select().single();
        mainPlan = retry.data;
        mainPlanErr = retry.error;
      }

      if (mainPlanErr) throw new Error(mainPlanErr.message);

      const completedPlanData = {
        user_id: userId,
        pet_id: input.pet_id,
        category: mainInsertPayload.category,
        sub_type: input.sub_type,
        scheduled_at: input.scheduled_at,
        occurrence_scheduled_at: input.occurrence_scheduled_at || input.scheduled_at,
        repeat_rule: null,
        ends_at: null,
        notif_before: 0,
        notif_unit: 'minute',
        note: input.note || null,
        extra_data: { ...(input.extra_data || {}), is_past_done: true },
        status: 'completed',
        parent_plan_id: mainPlan.id,
      };

      const { data: insertedCompletedPlan } = await supabase
        .from('plans')
        .insert(completedPlanData)
        .select('id')
        .single();

      const completedTargetPlanId = insertedCompletedPlan?.id || mainPlan.id;

      if (input.category === 'asi') {
        const vaccineCode = input.extra_data?.vaccine_code || input.extra_data?.vaccine?.code || null;
        try {
          await supabase.from('vaccine_records_v2').insert({
            pet_id: input.pet_id,
            vaccine_code: vaccineCode,
            vaccine_name: input.sub_type || input.title || 'Aşı Kaydı',
            dose_number: input.extra_data?.dose_number || 1,
            administered_at: input.scheduled_at,
            status: 'completed',
            source: 'user_detailed',
            plan_id: completedTargetPlanId,
            notes: input.note || null
          });
        } catch {}
      } else if (input.category === 'parazit') {
        const parasiteType = input.extra_data?.parasite_type || 'internal';
        try {
          await supabase.from('parasite_records').insert({
            pet_id: input.pet_id,
            parasite_type: parasiteType,
            administered_at: input.scheduled_at ? input.scheduled_at.split('T')[0] : new Date().toISOString().split('T')[0],
            brand_free_text: input.extra_data?.product?.brand_name || input.sub_type || null,
            product_free_text: input.extra_data?.product?.product_name || null,
            status: 'completed',
            plan_id: completedTargetPlanId
          });
        } catch {}
      }

      if (input.category === 'saglik' && input.sub_type === 'İlaç') {
        const startDate = input.scheduled_at.split('T')[0];
        await supabase.from('health_medication_courses').insert({
          pet_id: input.pet_id,
          user_id: userId,
          medication_name: input.extra_data?.medication_name || 'Bilinmeyen İlaç',
          medication_unit: input.extra_data?.medication_unit || 'doz',
          purpose: input.extra_data?.purpose || null,
          frequency_type: input.extra_data?.medication_freq_type || 'once_daily',
          start_date: startDate,
          duration_type: input.extra_data?.medication_duration || 'continuous',
          duration_days: input.extra_data?.medication_days || null,
          stock_enabled: input.extra_data?.medication_stock_enabled || false,
          stock_count: input.extra_data?.medication_stock_count || 0,
          stock_alert_threshold: input.extra_data?.medication_alert_count || 0,
          dose_per_administration: input.extra_data?.medication_dose || 1,
          main_plan_id: mainPlan.id
        });
      }

      return mainPlan;
    } else {
      initialStatus = 'completed';
    }
  }
  
  let insertPayload: any = {
    user_id: userId,
    pet_id: input.pet_id,
    category: input.category,
    sub_type: input.sub_type,
    title: input.title || null,
    scheduled_at: scheduledAt,
    occurrence_scheduled_at: input.occurrence_scheduled_at || null,
    repeat_rule: input.repeat_rule || null,
    ends_at: input.ends_at || null,
    notif_before: input.notif_before,
    notif_unit: input.notif_unit,
    note: input.note || null,
    extra_data: input.extra_data || {},
    status: initialStatus,
    source: input.source || 'user',
    policy: input.policy || 'optional',
    assigned_to: input.assigned_to || null,
  };

  let { data: plan, error: planError } = await supabase
    .from('plans')
    .insert(insertPayload)
    .select()
    .single();

  // Defensive fallback: DB constraint 'kontrol' içermiyorsa 'saglik' kategorisine yönlendir
  if (planError && planError.code === '23514' && input.category === 'kontrol') {
    insertPayload.category = 'saglik';
    insertPayload.extra_data = { ...(insertPayload.extra_data || {}), original_category: 'kontrol' };
    const retryRes = await supabase
      .from('plans')
      .insert(insertPayload)
      .select()
      .single();
    plan = retryRes.data;
    planError = retryRes.error;
  }

  if (planError) throw new Error(planError.message);

  if (input.category === 'saglik' && input.sub_type === 'İlaç') {
    const startDate = input.scheduled_at.split('T')[0];
    await supabase.from('health_medication_courses').insert({
      pet_id: input.pet_id,
      user_id: userId,
      medication_name: input.extra_data?.medication_name || 'Bilinmeyen İlaç',
      medication_unit: input.extra_data?.medication_unit || 'doz',
      purpose: input.extra_data?.purpose || null,
      frequency_type: input.extra_data?.medication_freq_type || 'once_daily',
      start_date: startDate,
      duration_type: input.extra_data?.medication_duration || 'continuous',
      duration_days: input.extra_data?.medication_days || null,
      stock_enabled: input.extra_data?.medication_stock_enabled || false,
      stock_count: input.extra_data?.medication_stock_count || 0,
      stock_alert_threshold: input.extra_data?.medication_alert_count || 0,
      dose_per_administration: input.extra_data?.medication_dose || 1,
      main_plan_id: plan.id
    });
  }

  if (initialStatus === 'completed') {
    if (input.category === 'asi') {
      const vaccineCode = input.extra_data?.vaccine_code || input.extra_data?.vaccine?.code || null;
      try {
        await supabase.from('vaccine_records_v2').insert({
          pet_id: input.pet_id,
          vaccine_code: vaccineCode,
          vaccine_name: input.sub_type || input.title || 'Aşı Kaydı',
          dose_number: input.extra_data?.dose_number || 1,
          administered_at: input.scheduled_at,
          status: 'completed',
          source: 'user_detailed',
          plan_id: plan.id,
          notes: input.note || null
        });
      } catch {}
    } else if (input.category === 'parazit') {
      const parasiteType = input.extra_data?.parasite_type || 'internal';
      try {
        await supabase.from('parasite_records').insert({
          pet_id: input.pet_id,
          parasite_type: parasiteType,
          administered_at: input.scheduled_at ? input.scheduled_at.split('T')[0] : new Date().toISOString().split('T')[0],
          brand_free_text: input.extra_data?.product?.brand_name || input.sub_type || null,
          product_free_text: input.extra_data?.product?.product_name || null,
          status: 'completed',
          plan_id: plan.id
        });
      } catch {}
    }
  }

  return plan;
}

export async function updatePlan(userId: string, planId: string, input: UpdatePlanInput) {
  if (planId.toString().startsWith('virtual_')) {
    throw new Error('INVALID_VIRTUAL_PLAN_ID');
  }

  const supabase = await createServerSupabaseClient();
  
  // RLS will ensure user owns the plan, but we need to check if pet_id is being changed
  if (input.pet_id) {
    await verifyPetOwnership(userId, input.pet_id);
  }

  const { data: currentPlan, error: fetchError } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (fetchError || !currentPlan) {
    throw new Error('PLAN_NOT_FOUND');
  }

  // Treat input.extra_data?.is_past_done as completed status
  let statusToApply = input.status;
  const isPastDone = !!input.extra_data?.is_past_done;
  if (isPastDone) {
    statusToApply = 'completed';
  }

  const hasRepeatRule = input.repeat_rule !== undefined ? input.repeat_rule : currentPlan.repeat_rule;
  const isMainRecurringPlan = hasRepeatRule && !currentPlan.parent_plan_id;

  if (statusToApply === 'completed' && isMainRecurringPlan) {
    const occurrenceScheduledAt = input.occurrence_scheduled_at || currentPlan.scheduled_at;
    const actualCompletionDate = input.scheduled_at || occurrenceScheduledAt;

    // Calculate next occurrence date using protocol/rules (server-side only)
    const computedNextScheduledAt = calculateNextOccurrenceDate(
      actualCompletionDate,
      hasRepeatRule,
      input.extra_data || currentPlan.extra_data
    );

    const closeSeries = !hasRepeatRule || input.ends_at === 'close';
    if (!computedNextScheduledAt && !closeSeries) {
      throw new Error('NEXT_OCCURRENCE_UNRESOLVED');
    }

    // Use atomic database function complete_recurring_plan RPC (service_role only)
    const adminClient = createAdminSupabaseClient();
    const { data: rpcRes, error: rpcErr } = await adminClient.rpc('complete_recurring_plan', {
      p_plan_id: planId,
      p_user_id: userId,
      p_occurrence_scheduled_at: occurrenceScheduledAt,
      p_actual_completion_date: actualCompletionDate,
      p_next_scheduled_at: computedNextScheduledAt || null,
      p_close_series: closeSeries,
      p_note: input.note !== undefined ? input.note : currentPlan.note,
      p_extra_data: input.extra_data || {}
    });

    if (rpcErr) {
      console.error('[service.ts updatePlan] complete_recurring_plan RPC error:', rpcErr);
      throw new Error(rpcErr.message || 'PLAN_COMPLETION_FAILED');
    }

    // Refetch the updated main recurring plan
    const { data: updatedMainPlan } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (updatedMainPlan) {
      // Dismiss active in-app notifications tied to this plan
      await supabase
        .from('notifications')
        .update({ is_read: true, opened_at: new Date().toISOString() })
        .eq('plan_id', planId)
        .eq('is_read', false);

      return updatedMainPlan;
    }
  }

  // Standard update flow for one-time plans or updating existing static records
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .update({
      ...input,
      ...(statusToApply ? { status: statusToApply } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .select()
    .single();

  if (planError) throw new Error(planError.message);

  // If plan was marked completed, dismiss active in-app notifications tied to this plan
  if (statusToApply === 'completed' || input.status === 'completed') {
    await supabase
      .from('notifications')
      .update({ is_read: true, opened_at: new Date().toISOString() })
      .eq('plan_id', planId)
      .eq('is_read', false);
  }

  return plan;
}

export async function getPlans(userId: string, petId?: string | null, category?: string | null) {
  const supabase = await createServerSupabaseClient();
  
  let query = supabase
    .from('plans')
    .select('*')
    .eq('user_id', userId)
    .order('scheduled_at', { ascending: true });
    
  if (petId) query = query.eq('pet_id', petId);
  if (category) query = query.eq('category', category);
  
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  
  return data;
}

export async function deletePlan(planId: string) {
  const supabase = await createServerSupabaseClient();
  
  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('id', planId);
    
  if (error) throw new Error(error.message);
  return true;
}

export interface ParasiteCompletionResponse {
  id: string;
  status: 'completed';
  record_id: string;
  idempotent: boolean;
  document_storage_path: string | null;
}

export async function completeParasitePlan(
  userId: string,
  planId: string,
  input: {
    administered_at: string;
    application_method: string;
    brand_free_text?: string | null;
    product_free_text?: string | null;
    protection_duration_days?: number | null;
    notes?: string | null;
    document_storage_path?: string | null;
  }
): Promise<ParasiteCompletionResponse> {
  const supabase = await createServerSupabaseClient();

  const { data: currentPlan, error: fetchError } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (fetchError || !currentPlan) {
    throw new Error('PLAN_NOT_FOUND');
  }

  if (currentPlan.category !== 'parazit') {
    throw new Error('NOT_PARASITE_PLAN');
  }

  // 1. Verify ownership of currentPlan.pet_id
  try {
    await verifyPetOwnership(userId, currentPlan.pet_id);
  } catch {
    throw new Error('FORBIDDEN');
  }

  if (currentPlan.status === 'cancelled') {
    throw new Error('PLAN_CANCELLED');
  }

  const administeredAtStr = input.administered_at;
  if (!administeredAtStr) {
    throw new Error('INVALID_APPLICATION_DATA');
  }
  const administeredAt = new Date(administeredAtStr);
  const now = new Date();
  // administered_at gelecekte olamaz
  if (administeredAt > now) {
    throw new Error('INVALID_APPLICATION_DATA');
  }

  const applicationMethod = input.application_method;
  if (!applicationMethod || typeof applicationMethod !== 'string' || applicationMethod.trim() === '') {
    throw new Error('INVALID_APPLICATION_METHOD');
  }

  let protoId: string | null = null;
  try {
    protoId = currentPlan.extra_data?.product?.id ?? currentPlan.extra_data?.parasite_protocol_id ?? null;
  } catch {}

  if (!protoId) {
    throw new Error('PROTOCOL_NOT_FOUND');
  }

  const adminSupabase = createAdminSupabaseClient();
  const { data: rpcResult, error: rpcError } = await adminSupabase.rpc('complete_parasite_plan', {
    p_plan_id: planId,
    p_administered_at: administeredAtStr,
    p_application_method: applicationMethod,
    p_brand_free_text: input.brand_free_text ?? null,
    p_product_free_text: input.product_free_text ?? null,
    p_protection_duration_days: input.protection_duration_days ?? null,
    p_notes: input.notes ?? null,
    p_document_storage_path: input.document_storage_path ?? null,
    p_created_by: userId
  });

  if (rpcError) {
    console.error('DEBUG RPC ERROR:', rpcError);
    const msg = rpcError.message || '';
    if (msg.includes('PLAN_NOT_FOUND')) throw new Error('PLAN_NOT_FOUND');
    if (msg.includes('NOT_PARASITE_PLAN')) throw new Error('NOT_PARASITE_PLAN');
    if (msg.includes('PLAN_CANCELLED')) throw new Error('PLAN_CANCELLED');
    if (msg.includes('PROTOCOL_NOT_FOUND')) throw new Error('PROTOCOL_NOT_FOUND');
    if (msg.includes('INVALID_APPLICATION_METHOD')) throw new Error('INVALID_APPLICATION_METHOD');
    if (msg.includes('PROTOCOL_SPECIES_MISMATCH')) throw new Error('INVALID_APPLICATION_DATA');
    if (msg.includes('FORBIDDEN')) throw new Error('FORBIDDEN');
    if (msg.includes('INCONSISTENT_PLAN_STATE')) throw new Error('INCONSISTENT_PLAN_STATE');
    throw new Error('PLAN_COMPLETION_FAILED');
  }

  const { data: updatedPlan } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (!updatedPlan) {
    throw new Error('PLAN_COMPLETION_FAILED');
  }

  const recordId = (rpcResult as any)?.record_id;
  const idempotent = (rpcResult as any)?.idempotent;

  // Strict validation of the RPC response keys/types
  if (
    typeof recordId !== 'string' ||
    typeof idempotent !== 'boolean' ||
    updatedPlan.status !== 'completed'
  ) {
    throw new Error('PLAN_COMPLETION_FAILED');
  }

  // Fetch document storage path from the database to return in response if linked
  let finalPath: string | null = null;
  if (recordId) {
    const { data: rec } = await adminSupabase
      .from('parasite_records')
      .select('document_storage_path')
      .eq('id', recordId)
      .maybeSingle();
    if (rec) {
      finalPath = rec.document_storage_path ?? null;
    }
  }

  return {
    id: updatedPlan.id,
    status: 'completed',
    record_id: recordId,
    idempotent: idempotent,
    document_storage_path: finalPath
  };
}
