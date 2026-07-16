import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

type PlanInsert = Database['public']['Tables']['plans']['Insert'];

// parasite-algorithm.ts

const INTERVAL_ADULT_DAYS  = 90;

export type ParasiteIntervalResult = {
  intervalDays: number;
  phase: 'puppy_phase1' | 'puppy_phase2' | 'adult';
  nextDueDate: string; // ISO date
  requiresVetReview: boolean;
  vetReviewReason?: string;
};

export function calculateParasiteInterval(
  petAgeInDays: number,
  lastApplicationDate: string | null,
  species: 'dog' | 'cat',
  lifestyle: 'indoor' | 'outdoor' | 'mixed',
  birthDatePrecision: 'exact' | 'month_known' | 'approximate' | 'unknown'
): ParasiteIntervalResult {
  if (birthDatePrecision === 'unknown') {
    return {
      intervalDays: INTERVAL_ADULT_DAYS,
      phase: 'adult',
      nextDueDate: addDays(lastApplicationDate ?? new Date().toISOString(), INTERVAL_ADULT_DAYS),
      requiresVetReview: true,
      vetReviewReason: 'UNKNOWN_BIRTH_DATE',
    };
  }

  const requiresVetReview = birthDatePrecision === 'approximate';
  let intervalDays = INTERVAL_ADULT_DAYS;
  let phase: ParasiteIntervalResult['phase'] = 'adult';

  if (petAgeInDays < 60) {
    intervalDays = 14;
    phase = 'puppy_phase1';
  } else if (petAgeInDays < 180) {
    intervalDays = 30;
    phase = 'puppy_phase2';
  } else {
    intervalDays = INTERVAL_ADULT_DAYS;
    phase = 'adult';
  }

  const baseDate = lastApplicationDate ?? new Date().toISOString();
  const nextDueDate = addDays(baseDate, intervalDays);

  return {
    intervalDays,
    phase,
    nextDueDate,
    requiresVetReview,
    vetReviewReason: requiresVetReview ? 'APPROXIMATE_BIRTH_DATE' : undefined,
  };
}

export function detectParasiteTypeCoverage(
  parasiteType: string
): { coversInternal: boolean; coversExternal: boolean; isCombined: boolean } {
  const coversInternal = parasiteType === 'internal' || parasiteType === 'combined';
  const coversExternal = parasiteType === 'external' || parasiteType === 'combined';
  return {
    coversInternal,
    coversExternal,
    isCombined: coversInternal && coversExternal,
  };
}

export async function closeCombinedParasitePlans(
  petId: string,
  protocolId: string,
  recordedAt: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  const { data: proto } = await supabase
    .from('parasite_protocols')
    .select('parasite_type')
    .eq('id', protocolId)
    .single();

  if (!proto) return;

  const coversInternal = proto.parasite_type === 'internal' || proto.parasite_type === 'combined';
  const coversExternal = proto.parasite_type === 'external' || proto.parasite_type === 'combined';

  const typesToClose: string[] = [];
  if (coversInternal) typesToClose.push('internal');
  if (coversExternal) typesToClose.push('external');
  if (coversInternal && coversExternal) typesToClose.push('combined');

  if (!typesToClose.length) return;

  const { data: activePlans } = await supabase
    .from('plans')
    .select('*')
    .eq('pet_id', petId)
    .eq('category', 'parazit')
    .eq('status', 'active');

  if (activePlans) {
    for (const plan of activePlans) {
      const extraData = plan.extra_data as Record<string, unknown> | null;
      const planType = extraData?.parasite_type as string | undefined;
      if (planType && typesToClose.includes(planType)) {
        await supabase
          .from('plans')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', plan.id);
      }
    }
  }
}

export const closeCombinedParaсиtePlans = closeCombinedParasitePlans;

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export type ConflictCheckResult =
  | { hasConflict: false }
  | {
      hasConflict: true;
      productName: string;
      remainingDays: number;
      message: string;
    };

export async function checkParasiteConflict(
  petId: string,
  newProtocolId: string,
  newApplicationDate: string,
  supabase: SupabaseClient<Database>
): Promise<ConflictCheckResult> {
  const { data: newProto } = await supabase
    .from('parasite_protocols')
    .select('parasite_type, protocol_name')
    .eq('id', newProtocolId)
    .single();

  if (!newProto) return { hasConflict: false };

  const coversInternal = newProto.parasite_type === 'internal' || newProto.parasite_type === 'combined';
  const coversExternal = newProto.parasite_type === 'external' || newProto.parasite_type === 'combined';

  const typesToCheck: string[] = [];
  if (coversInternal) typesToCheck.push('internal', 'combined');
  if (coversExternal) typesToCheck.push('external', 'combined');

  if (!typesToCheck.length) return { hasConflict: false };

  const windowStart = addDays(newApplicationDate, -180);

  const { data: recentRecords } = await supabase
    .from('parasite_records')
    .select('*')
    .eq('pet_id', petId)
    .in('parasite_type', [...new Set(typesToCheck)])
    .gte('administered_at', windowStart)
    .order('administered_at', { ascending: false })
    .limit(1);

  if (!recentRecords?.length) return { hasConflict: false };

  const lastRecord = recentRecords[0];
  const protectionDays = lastRecord.protection_duration_days ?? 30;
  const lastApplied = new Date(lastRecord.administered_at);
  const protectionEnds = new Date(lastApplied);
  protectionEnds.setDate(protectionEnds.getDate() + protectionDays);
  const newDate = new Date(newApplicationDate);

  if (newDate < protectionEnds) {
    const remainingDays = Math.ceil(
      (protectionEnds.getTime() - newDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let prevProductName = lastRecord.product_free_text || lastRecord.brand_free_text || 'önceki uygulama';
    if (lastRecord.parasite_protocol_id) {
      const { data: prevProto } = await supabase
        .from('parasite_protocols')
        .select('protocol_name')
        .eq('id', lastRecord.parasite_protocol_id)
        .single();
      if (prevProto) prevProductName = prevProto.protocol_name;
    }

    return {
      hasConflict: true,
      productName: prevProductName,
      remainingDays: remainingDays,
      message: `Dostunuz zaten ${prevProductName} ile koruma altında. Koruma ${remainingDays} gün daha devam eder.`,
    };
  }

  return { hasConflict: false };
}

export type CollarAgeCheckResult =
  | { allowed: true }
  | {
      allowed: false;
      minAgeWeeks: number;
      petAgeWeeks: number;
      message: string;
    };

export async function checkCollarAgeRestriction(
  petBirthDate: string,
  protocolId: string,
  applicationDate: string,
  supabase: SupabaseClient<Database>
): Promise<CollarAgeCheckResult> {
  const { data: proto } = await supabase
    .from('parasite_protocols')
    .select('protocol_name, min_age_weeks, default_application_method')
    .eq('id', protocolId)
    .single();

  if (!proto) return { allowed: true };

  if (proto.default_application_method !== 'collar') return { allowed: true };
  if (!proto.min_age_weeks) return { allowed: true };

  const birth = new Date(petBirthDate);
  const applied = new Date(applicationDate);
  const ageInDays = Math.floor(
    (applied.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24)
  );
  const ageInWeeks = Math.floor(ageInDays / 7);

  if (ageInWeeks < proto.min_age_weeks) {
    return {
      allowed: false,
      minAgeWeeks: proto.min_age_weeks,
      petAgeWeeks: ageInWeeks,
      message: `${proto.protocol_name} yalnızca ${proto.min_age_weeks} haftadan büyük hayvanlarda kullanılabilir. Dostunuz şu an ${ageInWeeks} haftalık.`,
    };
  }

  return { allowed: true };
}

export type CollarSpotOnConflictResult =
  | { hasConflict: false }
  | {
      hasConflict: true;
      existingProductName: string;
      existingMethod: string;
      message: string;
    };

export async function checkCollarSpotOnSameDayConflict(
  petId: string,
  newApplicationMethod: string,
  applicationDate: string,
  supabase: SupabaseClient<Database>
): Promise<CollarSpotOnConflictResult> {
  const relevantMethods = ['collar', 'spot_on'];
  if (!relevantMethods.includes(newApplicationMethod)) {
    return { hasConflict: false };
  }

  const conflictMethod = newApplicationMethod === 'collar' ? 'spot_on' : 'collar';
  const dayStart = applicationDate.split('T')[0] + 'T00:00:00.000Z';
  const dayEnd   = applicationDate.split('T')[0] + 'T23:59:59.999Z';

  const { data: sameDay } = await supabase
    .from('parasite_records')
    .select('application_method, parasite_protocol_id, product_free_text, brand_free_text')
    .eq('pet_id', petId)
    .eq('application_method', conflictMethod)
    .gte('administered_at', dayStart.split('T')[0])
    .lte('administered_at', dayEnd.split('T')[0])
    .limit(1);

  if (!sameDay?.length) return { hasConflict: false };

  const existingRecord = sameDay[0];
  let existingProductName = existingRecord.product_free_text || existingRecord.brand_free_text || 'dış parazit uygulaması';
  if (existingRecord.parasite_protocol_id) {
    const { data: proto } = await supabase
      .from('parasite_protocols')
      .select('protocol_name')
      .eq('id', existingRecord.parasite_protocol_id)
      .single();
    if (proto) existingProductName = proto.protocol_name;
  }

  const methodLabel: Record<string, string> = {
    collar: 'tasma',
    spot_on: 'ense damlası',
  };

  return {
    hasConflict: true,
    existingProductName,
    existingMethod: methodLabel[conflictMethod] ?? conflictMethod,
    message: `Bugün zaten ${existingProductName} (${methodLabel[conflictMethod]}) uygulandı. Aynı gün hem tasma hem ense damlası kullanımı önerilmez. Yine de kaydetmek istiyor musunuz?`,
  };
}

export type EarMiteInsightResult =
  | { coversEarMites: false }
  | {
      coversEarMites: true;
      message: string;
      insightLevel: 'info';
    };

export async function checkEarMiteCoverage(
  protocolId: string,
  supabase: SupabaseClient<Database>
): Promise<EarMiteInsightResult> {
  const { data: proto } = await supabase
    .from('parasite_protocols')
    .select('protocol_name, parasite_code')
    .eq('id', protocolId)
    .single();

  if (!proto) return { coversEarMites: false };

  const covers = proto.parasite_code?.toLowerCase().includes('combined') || proto.protocol_name?.toLowerCase().includes('karma');

  if (!covers) {
    return { coversEarMites: false };
  }

  return {
    coversEarMites: true,
    insightLevel: 'info',
    message: `${proto.protocol_name} aynı zamanda kulak uyuzuna karşı da koruma sağlar.`,
  };
}

export type NextParasiteDueDateResult = {
  nextDueDate: string;
  protectionDays: number;
  productName: string;
  nextDueDateWindowEnd: string;
};

export async function calculateNextParasiteDueDate(
  protocolId: string,
  lastApplicationDate: string,
  supabase: SupabaseClient<Database>
): Promise<NextParasiteDueDateResult | null> {
  const { data: proto } = await supabase
    .from('parasite_protocols')
    .select('protocol_name, default_protection_duration_days')
    .eq('id', protocolId)
    .single();

  if (!proto) return null;

  const nextDueDate = addDays(lastApplicationDate, proto.default_protection_duration_days);
  const nextDueDateWindowEnd = addDays(nextDueDate, 7);

  return {
    nextDueDate,
    protectionDays: proto.default_protection_duration_days,
    productName: proto.protocol_name,
    nextDueDateWindowEnd,
  };
}

export async function scheduleNextParasiteDose(
  petId: string,
  protocolId: string,
  lastApplicationDate: string,
  parasiteType: 'internal' | 'external' | 'combined',
  applicationMethod: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  const next = await calculateNextParasiteDueDate(
    protocolId,
    lastApplicationDate,
    supabase
  );

  if (!next) return;

  const { data: proto } = await supabase
    .from('parasite_protocols')
    .select('*')
    .eq('id', protocolId)
    .single();

  if (!proto) return;

  // Resolve the user_id from the active session (required by plans schema)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) {
    console.warn('[P10] No authenticated user — skipping next-dose scheduling');
    return;
  }

  const subType = 
    proto.parasite_type === 'internal' ? 'İç Parazit' : 
    proto.parasite_type === 'external' ? 'Dış Parazit' : 
    proto.parasite_type === 'collar' ? 'Parazit Tasması' : 
    'Karma Parazit';

  const payload: PlanInsert = {
    pet_id: petId,
    user_id: user.id,
    category: 'parazit',
    sub_type: subType,
    scheduled_at: new Date(next.nextDueDate).toISOString(),
    status: 'active',
    extra_data: {
      protocol_name: proto.protocol_name,
      parasite_protocol_id: proto.id,
      parasite_code: proto.parasite_code,
      parasite_type: proto.parasite_type,
      default_application_method: proto.default_application_method,
      protection_duration_days: proto.default_protection_duration_days,
    } satisfies Record<string, unknown>,
  };

  const { error } = await supabase.from('plans').insert(payload);

  if (error) {
    console.error('[P10] Sonraki doz planlama hatası:', error);
  }
}
