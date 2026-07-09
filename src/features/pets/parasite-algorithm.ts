import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

// parasite-algorithm.ts

// ── SABITLER ────────────────────────────────────────────────

// Yavru protokol yaş eşikleri (gün)
const PUPPY_KITTEN_PHASE1_END_DAYS = 60;  // 2 ay — her 2 haftada bir
const PUPPY_KITTEN_PHASE2_END_DAYS = 180; // 6 ay — ayda bir
// 180 gün sonrası yetişkin — 3 ayda bir

const INTERVAL_PHASE1_DAYS = 14;  // 2 haftada bir
const INTERVAL_PHASE2_DAYS = 30;  // ayda bir
const INTERVAL_ADULT_DAYS  = 90;  // 3 ayda bir (varsayılan)

// ── KOMBINE ÜRÜN SABITLER ───────────────────────────────────

// Bu etken maddeler hem iç hem dış paraziti kapsar
const COMBINED_INTERNAL_INGREDIENTS = [
  'Milbemisin Oksim',
  'Moksidektin',
  'Pirantel',
  'Prazikuantel',
];

const COMBINED_EXTERNAL_INGREDIENTS = [
  'Afoxolaner',
  'Fluralaner',
  'Sarolaner',
  'Selamektin',
  'İmidakloprid',
  'Permetrin',
];

// ── TİPLER ──────────────────────────────────────────────────

export type ParasiteIntervalResult = {
  intervalDays: number;
  phase: 'puppy_phase1' | 'puppy_phase2' | 'adult';
  nextDueDate: string; // ISO date
  requiresVetReview: boolean;
  vetReviewReason?: string;
};

// ── FONKSİYONLAR ────────────────────────────────────────────

/**
 * P4: Yaşa göre dinamik parazit uygulama aralığı hesapla.
 * Doğum tarihi kesinliği 'approximate' veya 'unknown' ise
 * veteriner değerlendirmesi işaretle.
 */
export function calculateParasiteInterval(
  petAgeInDays: number,
  lastApplicationDate: string | null,
  species: 'dog' | 'cat',
  lifestyle: 'indoor' | 'outdoor' | 'mixed',
  birthDatePrecision: 'exact' | 'month_known' | 'approximate' | 'unknown'
): ParasiteIntervalResult {

  // Doğum tarihi bilinmiyorsa veteriner değerlendirmesi
  if (birthDatePrecision === 'unknown') {
    return {
      intervalDays: INTERVAL_ADULT_DAYS,
      phase: 'adult',
      nextDueDate: addDays(lastApplicationDate ?? new Date().toISOString(), INTERVAL_ADULT_DAYS),
      requiresVetReview: true,
      vetReviewReason: 'UNKNOWN_BIRTH_DATE',
    };
  }

  // Yaklaşık yaş — taslak plan oluştur, uyarı ekle
  const requiresVetReview = birthDatePrecision === 'approximate';

  let intervalDays: number;
  let phase: ParasiteIntervalResult['phase'];

  if (petAgeInDays < PUPPY_KITTEN_PHASE1_END_DAYS) {
    // Faz 1: 15. günden 2 aya kadar — 2 haftada bir
    intervalDays = INTERVAL_PHASE1_DAYS;
    phase = 'puppy_phase1';
  } else if (petAgeInDays < PUPPY_KITTEN_PHASE2_END_DAYS) {
    // Faz 2: 2 aydan 6 aya kadar — ayda bir
    intervalDays = INTERVAL_PHASE2_DAYS;
    phase = 'puppy_phase2';
  } else {
    // Yetişkin: 6 aydan sonra — 3 ayda bir
    // Evden çıkmayan kedi: veteriner kararıyla 4-6 aya esnetilebilir
    // Sistem güvenli varsayılan olan 3 ayı kullanır
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

/**
 * P5: Ürünün kapsadığı parazit tiplerini döner.
 * active_ingredient üzerinden iç/dış/kombine belirlenir.
 */
export function detectParasiteTypeCoverage(
  activeIngredient: string
): { coversInternal: boolean; coversExternal: boolean; isCombined: boolean } {
  const ingredient = activeIngredient.toLowerCase();

  const coversInternal = COMBINED_INTERNAL_INGREDIENTS.some(i =>
    ingredient.includes(i.toLowerCase())
  );
  const coversExternal = COMBINED_EXTERNAL_INGREDIENTS.some(i =>
    ingredient.includes(i.toLowerCase())
  );

  return {
    coversInternal,
    coversExternal,
    isCombined: coversInternal && coversExternal,
  };
}

/**
 * P5: Kombine ürün kaydedilince ilgili planları kapat.
 * iç + dış parazit planlarını 'completed' yapar.
 */
export async function closeCombinedParasitePlans(
  petId: string,
  productId: string,
  recordedAt: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  const { data: product } = await supabase
    .from('parasite_products')
    .select('active_ingredient, protection_duration_days')
    .eq('id', productId)
    .single();

  if (!product) return;

  const { coversInternal, coversExternal } = detectParasiteTypeCoverage(
    product.active_ingredient || ''
  );

  const typesToClose: string[] = [];
  if (coversInternal) typesToClose.push('internal');
  if (coversExternal) typesToClose.push('external');
  if (coversInternal && coversExternal) typesToClose.push('combined');

  if (!typesToClose.length) return;

  const { error } = await (supabase as any)
    .from('parasite_plan_items')
    .update({
      status: 'completed',
      completed_record_id: null,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('pet_id', petId)
    .in('parasite_type', typesToClose)
    .in('status', ['upcoming', 'due', 'overdue']);

  if (error) {
    console.error('[P5] Kombine plan kapatma hatası:', error);
    return;
  }

  const nextDueDate = addDays(recordedAt, product.protection_duration_days);

  for (const parasiteType of typesToClose) {
    await (supabase as any).from('parasite_plan_items').insert({
      pet_id: petId,
      product_id: productId,
      parasite_type: parasiteType as 'internal' | 'external' | 'combined',
      application_method: 'spot_on',
      dose_number: 1,
      recommended_start: nextDueDate,
      recommended_end: addDays(nextDueDate, 7),
      status: 'upcoming',
      plan_origin: 'system_rule',
      extra_data: {
        auto_generated_by: 'combined_product_close',
        product_protection_days: product.protection_duration_days,
      },
    } as any);
  }
}

// Cyrillic spelling alias to avoid typos breaking code
export const closeCombinedParaсиtePlans = closeCombinedParasitePlans;

// Yardımcı fonksiyon
function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ── ÇAKIŞMA DEDEKTÖRÜ ───────────────────────────────────────

export type ConflictCheckResult =
  | { hasConflict: false }
  | {
      hasConflict: true;
      productName: string;
      remainingDays: number;
      message: string;
    };

/**
 * P6: Koruma periyodunda tekrar kayıt girişini kontrol eder.
 * Aynı parazit tipini kapsayan aktif kayıt varsa çakışma döner.
 */
export async function checkParasiteConflict(
  petId: string,
  newProductId: string,
  newApplicationDate: string,
  supabase: SupabaseClient<Database>
): Promise<ConflictCheckResult> {
  // Yeni ürünün kapsamını belirle
  const { data: newProduct } = await supabase
    .from('parasite_products')
    .select('active_ingredient, protection_duration_days, name')
    .eq('id', newProductId)
    .single();

  if (!newProduct) return { hasConflict: false };

  const { coversInternal, coversExternal } = detectParasiteTypeCoverage(
    newProduct.active_ingredient || ''
  );

  const typesToCheck: string[] = [];
  if (coversInternal) typesToCheck.push('internal', 'combined');
  if (coversExternal) typesToCheck.push('external', 'combined');

  if (!typesToCheck.length) return { hasConflict: false };

  // Son 180 gün içindeki tamamlanmış kayıtlara bak
  const windowStart = addDays(newApplicationDate, -180);

  const { data: recentRecords } = await (supabase as any)
    .from('parasite_plan_items')
    .select('product_id, updated_at, parasite_type, extra_data')
    .eq('pet_id', petId)
    .eq('status', 'completed')
    .in('parasite_type', [...new Set(typesToCheck)])
    .gte('updated_at', windowStart)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (!recentRecords?.length) return { hasConflict: false };

  const lastRecord = recentRecords[0];
  const protectionDays =
    lastRecord.extra_data?.product_protection_days ?? 30;
  const lastApplied = new Date(lastRecord.updated_at);
  const protectionEnds = new Date(lastApplied);
  protectionEnds.setDate(protectionEnds.getDate() + protectionDays);
  const newDate = new Date(newApplicationDate);

  if (newDate < protectionEnds) {
    const remainingDays = Math.ceil(
      (protectionEnds.getTime() - newDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Önceki ürünün adını al
    let prevProductName = 'önceki ürün';
    if (lastRecord.product_id) {
      const { data: prevProduct } = await supabase
        .from('parasite_products')
        .select('name')
        .eq('id', lastRecord.product_id)
        .single();
      if (prevProduct) prevProductName = prevProduct.name;
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

// ── TASMA YAŞ KISIT MOTORU ──────────────────────────────────

export type CollarAgeCheckResult =
  | { allowed: true }
  | {
      allowed: false;
      minAgeWeeks: number;
      petAgeWeeks: number;
      message: string;
    };

/**
 * P7: Tasma ürünü için pet yaşını kontrol eder.
 * min_age_weeks kısıtına uymayan kayıt engellenir.
 */
export async function checkCollarAgeRestriction(
  petBirthDate: string,
  productId: string,
  applicationDate: string,
  supabase: SupabaseClient<Database>
): Promise<CollarAgeCheckResult> {
  // Ürünün yaş kısıtını al
  const { data: product } = await supabase
    .from('parasite_products')
    .select('name, min_age_weeks, application_method')
    .eq('id', productId)
    .single();

  if (!product) return { allowed: true };

  // Tasma değilse kısıt yok
  if (product.application_method !== 'collar') return { allowed: true };

  // min_age_weeks tanımlı değilse kısıt yok
  if (!product.min_age_weeks) return { allowed: true };

  // Pet yaşını hesapla (uygulama tarihinde)
  const birth = new Date(petBirthDate);
  const applied = new Date(applicationDate);
  const ageInDays = Math.floor(
    (applied.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24)
  );
  const ageInWeeks = Math.floor(ageInDays / 7);

  if (ageInWeeks < product.min_age_weeks) {
    return {
      allowed: false,
      minAgeWeeks: product.min_age_weeks,
      petAgeWeeks: ageInWeeks,
      message: `${product.name} yalnızca ${product.min_age_weeks} haftadan büyük hayvanlarda kullanılabilir. Dostunuz şu an ${ageInWeeks} haftalık.`,
    };
  }

  return { allowed: true };
}

// ── TASMA + DAMLA AYNI GÜN ÇAKIŞMA ─────────────────────────

export type CollarSpotOnConflictResult =
  | { hasConflict: false }
  | {
      hasConflict: true;
      existingProductName: string;
      existingMethod: string;
      message: string;
    };

/**
 * P8: Aynı gün hem tasma hem damla kaydı girilirse uyarı üret.
 * Engel değil — uyarı. Kullanıcı onaylarsa kayıt devam eder.
 */
export async function checkCollarSpotOnSameDayConflict(
  petId: string,
  newApplicationMethod: string,
  applicationDate: string,
  supabase: SupabaseClient<Database>
): Promise<CollarSpotOnConflictResult> {
  // Yalnızca tasma veya damla için kontrol yap
  const relevantMethods = ['collar', 'spot_on'];
  if (!relevantMethods.includes(newApplicationMethod)) {
    return { hasConflict: false };
  }

  // Aynı gün diğer dış parazit yöntemi var mı?
  const conflictMethod =
    newApplicationMethod === 'collar' ? 'spot_on' : 'collar';

  const dayStart = applicationDate.split('T')[0] + 'T00:00:00.000Z';
  const dayEnd   = applicationDate.split('T')[0] + 'T23:59:59.999Z';

  const { data: sameDay } = await (supabase as any)
    .from('parasite_plan_items')
    .select('application_method, product_id')
    .eq('pet_id', petId)
    .eq('application_method', conflictMethod)
    .eq('status', 'completed')
    .gte('updated_at', dayStart)
    .lte('updated_at', dayEnd)
    .limit(1);

  if (!sameDay?.length) return { hasConflict: false };

  // Çakışan ürün adını al
  let existingProductName = 'dış parazit ürünü';
  const existingRecord = sameDay[0];
  if (existingRecord.product_id) {
    const { data: prod } = await supabase
      .from('parasite_products')
      .select('name')
      .eq('id', existingRecord.product_id)
      .single();
    if (prod) existingProductName = prod.name;
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

// ── KULAK UYUZU KAPSAM TESPİTİ ─────────────────────────────

export type EarMiteInsightResult =
  | { coversEarMites: false }
  | {
      coversEarMites: true;
      message: string;
      insightLevel: 'info';
    };

/**
 * P9: Kaydedilen ürün kulak uyuzunu kapsıyorsa insight rozeti üret.
 * covers_ear_mites alanı P2'de set edildi — doğrudan okur.
 * Yalnızca detaylı modda kullanıcıya gösterilir.
 */
export async function checkEarMiteCoverage(
  productId: string,
  supabase: SupabaseClient<Database>
): Promise<EarMiteInsightResult> {
  const { data: product } = await (supabase as any)
    .from('parasite_products')
    .select('name, covers_ear_mites, active_ingredient')
    .eq('id', productId)
    .single();

  if (!product || !product.covers_ear_mites) {
    return { coversEarMites: false };
  }

  return {
    coversEarMites: true,
    insightLevel: 'info',
    message: `${product.name} aynı zamanda kulak uyuzuna (Otodectes cynotis) karşı da koruma sağlar. Kulak kontrolü için veterinerinize danışabilirsiniz.`,
  };
}

// ── ÜRÜN BAZLI DİNAMİK TEKRAR HESABI ───────────────────────

export type NextParasiteDueDateResult = {
  nextDueDate: string;
  protectionDays: number;
  productName: string;
  nextDueDateWindowEnd: string; // 7 günlük uygulama penceresi
};

/**
 * P10: Son uygulama tarihinden sonraki dozu hesaplar.
 * Sabit 30/90 gün yerine protection_duration_days esas alınır.
 * Bravecto: 84 gün, Seresto: 240 gün, spot-on: 30 gün vb.
 */
export async function calculateNextParasiteDueDate(
  productId: string,
  lastApplicationDate: string,
  supabase: SupabaseClient<Database>
): Promise<NextParasiteDueDateResult | null> {
  const { data: product } = await supabase
    .from('parasite_products')
    .select('name, protection_duration_days')
    .eq('id', productId)
    .single();

  if (!product) return null;

  const nextDueDate = addDays(lastApplicationDate, product.protection_duration_days);
  const nextDueDateWindowEnd = addDays(nextDueDate, 7);

  return {
    nextDueDate,
    protectionDays: product.protection_duration_days,
    productName: product.name,
    nextDueDateWindowEnd,
  };
}

/**
 * P10: Kayıt tamamlandığında parasite_plan_items'a
 * sonraki dozu otomatik ekler.
 */
export async function scheduleNextParasiteDose(
  petId: string,
  productId: string,
  lastApplicationDate: string,
  parasiteType: 'internal' | 'external' | 'combined',
  applicationMethod: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  const next = await calculateNextParasiteDueDate(
    productId,
    lastApplicationDate,
    supabase
  );

  if (!next) return;

  const { error } = await (supabase as any)
    .from('parasite_plan_items')
    .insert({
      pet_id: petId,
      product_id: productId,
      parasite_type: parasiteType,
      application_method: applicationMethod,
      dose_number: 1,
      recommended_start: next.nextDueDate,
      recommended_end: next.nextDueDateWindowEnd,
      status: 'upcoming',
      plan_origin: 'system_rule',
      extra_data: {
        auto_generated_by: 'schedule_next_dose',
        product_protection_days: next.protectionDays,
        product_name: next.productName,
      },
    } as any);

  if (error) {
    console.error('[P10] Sonraki doz planlama hatası:', error);
  }
}
