import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

export type AdministrationRoute =
  | 'intranasal'
  | 'oral'
  | 'parenteral_sc'
  | 'parenteral_im';

export interface VaccinationTask {
  category: string;
  sub_type: string;
  scheduled_at: string;
  extra_data: Record<string, any>;
}

const isLegalRequiredPlansEnabled = () => process.env.ENABLE_LEGAL_REQUIRED_PLANS !== 'false';

// ============================================================
// SABİTLER
// ============================================================

const COMPOSITE_ANTIGENS_CLOSED_BY_DHPPI = ['DOG_CPIV'] as const;
const DHPPI_ANTIGEN_CODE = 'DOG_DHPPI';
const SINGLE_DOSE_ROUTES: AdministrationRoute[] = ['intranasal', 'oral'];
const INACTIVE_INTERVAL_DAYS = 21;
const LEPTO_ANTIGEN_CODES = ['DOG_LEPTO', 'DOG_LEPTO_C'];
const BORDETELLA_ANTIGEN_CODE = 'DOG_BORDETELLA';

// ============================================================
// TİPLER
// ============================================================

export interface VaccineTemplate {
  id?: string;
  vaccine_code: string;
  vaccine_name: string;
  species: string;
  is_active: boolean;
  doses?: number;
  dose_count?: number;
  interval_days?: number | null;
  recurrence_days?: number | null;
  booster_interval_days?: number | null;
  has_annual_booster?: boolean;
  is_core: boolean;
  is_live_vaccine?: boolean;
  administration_route?: AdministrationRoute;
  category?: string;
  first_dose_week?: number;
}

interface VaccinationPlanItem {
  pet_id: string;
  antigen_code: string;
  brand_id: string | null;
  dose_number: number;
  recommended_start: string;
  recommended_end: string;
  status: 'upcoming';
  plan_origin: 'system_rule';
  administration_route: AdministrationRoute | null;
  plans_mirror_id: string | null;
}

interface BoosterInfo {
  clinicalBoosterDays: number;
  legalBoosterDays: number;
  uiLabel: string;
}

// ============================================================
// A2 — TRİENNİAL / YILLIK BOOSTER AYIRIMI
// ============================================================

export function getBoosterRules(vaccineCode: string): BoosterInfo {
  if (vaccineCode === 'DOG_RABIES' || vaccineCode === 'CAT_RABIES') {
    return {
      clinicalBoosterDays: 365,
      legalBoosterDays: 365,
      uiLabel:
        'Kuduz aşısı Türkiye\'de her yıl yasal olarak yenilenmelidir. ' +
        'WSAVA da yıllık tekrarı destekler.',
    };
  }

  if (LEPTO_ANTIGEN_CODES.includes(vaccineCode)) {
    return {
      clinicalBoosterDays: 365,
      legalBoosterDays: 365,
      uiLabel: 'Leptospiroz aşısı yıllık olarak tekrarlanmalıdır.',
    };
  }

  if (
    vaccineCode === 'DOG_DHPPI' ||
    vaccineCode === 'DOG_CDV' ||
    vaccineCode === 'DOG_CPV' ||
    vaccineCode === 'CAT_FPV' ||
    vaccineCode === 'CAT_FHV1' ||
    vaccineCode === 'CAT_FCV'
  ) {
    return {
      clinicalBoosterDays: 1095,
      legalBoosterDays: 365,
      uiLabel:
        'Dünya standartlarında bu aşının biyolojik koruyuculuğu 3 yıla kadar ' +
        'sürebilir. Ancak Türkiye\'deki yasal prosedürler, seyahat kuralları ' +
        've pansiyon/otel kabullerinde yıllık aşı tekrarı aranmaktadır. ' +
        'Odi takviminizi yasal mevzuata uygun olarak yıllık planlar.',
    };
  }

  return {
    clinicalBoosterDays: 365,
    legalBoosterDays: 365,
    uiLabel: 'Veterinerinizin önerisi doğrultusunda tekrar zamanı belirlenir.',
  };
}

export function calculateNextBoosterDate(
  lastAdministeredAt: string,
  vaccineCode: string
): { date: Date; boosterInfo: BoosterInfo } {
  const boosterInfo = getBoosterRules(vaccineCode);
  const lastDate = new Date(lastAdministeredAt);
  const nextDate = new Date(lastDate);
  nextDate.setDate(nextDate.getDate() + boosterInfo.legalBoosterDays);
  return { date: nextDate, boosterInfo };
}

// ============================================================
// A3 — CPiV BAĞIMSIZ GÖREV ENGELİ
// ============================================================

export function shouldGenerateIndependentTask(
  vaccineCode: string,
  existingRecords: { vaccine_code: string; status: string }[]
): boolean {
  if (COMPOSITE_ANTIGENS_CLOSED_BY_DHPPI.includes(vaccineCode as any)) {
    const dhppiDone = existingRecords.some(
      (r) => r.vaccine_code === DHPPI_ANTIGEN_CODE && r.status === 'completed'
    );
    if (dhppiDone) return false;
  }
  return true;
}

export async function closeCompositeAntigenPlans(
  petId: string,
  recordedVaccineCode: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  if (recordedVaccineCode !== DHPPI_ANTIGEN_CODE) return;

  await supabase
    .from('vaccination_plan_items')
    .update({ status: 'not_applicable', updated_at: new Date().toISOString() })
    .eq('pet_id', petId)
    .in('antigen_code', COMPOSITE_ANTIGENS_CLOSED_BY_DHPPI)
    .in('status', ['upcoming', 'due', 'overdue']);

  await supabase
    .from('plans')
    .update({ status: 'not_applicable' } as any)
    .eq('pet_id', petId)
    .eq('category', 'asi')
    .contains('extra_data', { vaccine: { code: 'DOG_CPIV' } } as any);
}

// ============================================================
// A4 — MLV / İNAKTİVE DİNAMİK DOZ
// ============================================================

export function calculateAdultInitialDoses(
  template: VaccineTemplate
): { doseCount: number; intervalDays: number } {
  if (LEPTO_ANTIGEN_CODES.includes(template.vaccine_code)) {
    return { doseCount: 2, intervalDays: INACTIVE_INTERVAL_DAYS };
  }

  if (template.is_live_vaccine === true) {
    return { doseCount: 1, intervalDays: 0 };
  }

  return { doseCount: 2, intervalDays: INACTIVE_INTERVAL_DAYS };
}

// ============================================================
// A5 — BORDETELLA ROTA DOZ MOTORU
// ============================================================

export function calculateBordetellaDoses(
  template: VaccineTemplate
): { doseCount: number; intervalDays: number } {
  const route = template.administration_route ?? 'parenteral_sc';
  const isSingle = SINGLE_DOSE_ROUTES.includes(route);
  return {
    doseCount: isSingle ? 1 : 2,
    intervalDays: isSingle ? 0 : INACTIVE_INTERVAL_DAYS,
  };
}

export function detectRouteConflict(
  expectedRoute: AdministrationRoute,
  recordedRoute: AdministrationRoute
): { hasConflict: boolean; message: string | null } {
  if (expectedRoute === recordedRoute) {
    return { hasConflict: false, message: null };
  }
  if (
    expectedRoute === 'intranasal' &&
    (recordedRoute === 'parenteral_sc' || recordedRoute === 'parenteral_im')
  ) {
    return {
      hasConflict: true,
      message:
        'Bu aşı intranasal (burun içi) uygulanmalıdır. ' +
        'Enjeksiyon ile uygulandığı belirtilmiş — ' +
        'ciddi advers reaksiyon riski. Veterinerinize danışın.',
    };
  }
  return {
    hasConflict: true,
    message: `Beklenen uygulama rotası: ${expectedRoute}. Kaydedilen: ${recordedRoute}.`,
  };
}

// ============================================================
// PARALEL YAZIM YARDIMCILARI
// ============================================================

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function writeDosePair(
  supabase: SupabaseClient<Database>,
  petId: string,
  template: VaccineTemplate,
  doseNumber: number,
  doseStart: Date,
  intervalWindowDays: number,
  route: AdministrationRoute | null,
  boosterInfo: BoosterInfo | null
): Promise<string | null> {
  const doseEnd = addDays(doseStart, intervalWindowDays);

  const { error: vpiError } = await supabase
    .from('vaccination_plan_items')
    .insert({
      pet_id: petId,
      antigen_code: template.vaccine_code,
      brand_id: null,
      dose_number: doseNumber,
      recommended_start: toIsoDate(doseStart),
      recommended_end: toIsoDate(doseEnd),
      status: 'upcoming',
      plan_origin: 'system_rule',
      administration_route: route,
      plans_mirror_id: null,
      extra_data: {
        vaccine: {
          code: template.vaccine_code,
          name: template.vaccine_name,
        },
        dose_number: doseNumber,
        auto_generated: true,
        ...(boosterInfo && {
          booster_ui_label: boosterInfo.uiLabel,
          clinical_booster_days: boosterInfo.clinicalBoosterDays,
          legal_booster_days: boosterInfo.legalBoosterDays,
        }),
        ...(route && { administration_route: route }),
      },
    } as any);

  if (vpiError) {
    console.error('[Faz2] vaccination_plan_items yazım hatası:', vpiError);
  }

  return null;
}

// ============================================================
// ANA PLAN ÜRETİCİ
// ============================================================

export async function processPlanItemsForTemplate(
  supabase: SupabaseClient<Database>,
  petId: string,
  template: VaccineTemplate,
  isAdult: boolean,
  existingRecords: { vaccine_code: string; status: string }[],
  lastRecord?: { vaccine_code: string; administered_at: string } | null
): Promise<void> {
  if (!shouldGenerateIndependentTask(template.vaccine_code, existingRecords)) {
    return;
  }

  const today = new Date();

  // ── BOOSTER PLANI ──
  if (isAdult && lastRecord?.administered_at) {
    const { date: nextBooster, boosterInfo } = calculateNextBoosterDate(
      lastRecord.administered_at,
      template.vaccine_code
    );

    if (nextBooster > today) {
      await writeDosePair(
        supabase,
        petId,
        template,
        1,
        nextBooster,
        14,
        template.administration_route ?? null,
        boosterInfo
      );
    }
    return;
  }

  // ── İLK SERİ PLANI ──
  let doseCount: number;
  let intervalDays: number;

  if (template.vaccine_code === BORDETELLA_ANTIGEN_CODE) {
    ({ doseCount, intervalDays } = calculateBordetellaDoses(template));
  } else if (isAdult) {
    ({ doseCount, intervalDays } = calculateAdultInitialDoses(template));
  } else {
    doseCount = template.dose_count ?? 2;
    intervalDays = template.recurrence_days ?? INACTIVE_INTERVAL_DAYS;
  }

  for (let dose = 1; dose <= doseCount; dose++) {
    const doseStart = addDays(today, (dose - 1) * intervalDays);
    await writeDosePair(
      supabase,
      petId,
      template,
      dose,
      doseStart,
      14,
      template.administration_route ?? null,
      null
    );
  }
}

/**
 * Geriye dönük uyumluluk için generateVaccinationPlan fonksiyonu.
 * Hem plans tablosuna yazar (processPlanItemsForTemplate çağırarak),
 * hem de API'nin beklediği şekilde VaccinationTask[] döndürür.
 */
export async function generateVaccinationPlan(
  birthDateStr: string,
  species: string,
  supabase: SupabaseClient,
  options?: { isOutdoor?: boolean; petId?: string; userId?: string }
): Promise<VaccinationTask[]> {
  const safeBirthStr = birthDateStr.includes('T') ? birthDateStr : birthDateStr + 'T12:00:00';
  const birthDate = new Date(safeBirthStr);
  if (isNaN(birthDate.getTime())) return [];

  const now = new Date();
  const ageInDays = Math.floor((now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
  const isAdult = ageInDays >= 365;

  // Query vaccine_protocols instead of dropped vaccine_templates
  let query = supabase
    .from('vaccine_protocols')
    .select('*')
    .eq('is_active', true)
    .in('species', [species, 'both']);

  const { data: protocols, error } = await query;
  if (error || !protocols) {
    console.error('[vaccination-algorithm] Fetch error:', error);
    return [];
  }

  // Map vaccine_protocols schema to VaccineTemplate compatible structure
  const templates = protocols.map((p: any) => {
    const doses = p.doses || [];
    const firstBirthDose = doses.find((d: any) => d.trigger === 'birth');
    const firstDoseWeek = firstBirthDose ? Math.round(firstBirthDose.days_offset / 7) : 8;
    return {
      vaccine_code: p.vaccine_code,
      vaccine_name: p.protocol_name,
      category: p.category || 'vaccine',
      species: p.species,
      is_active: p.is_active,
      is_core: p.is_core,
      mandatory_level: p.mandatory_level,
      first_dose_week: firstDoseWeek,
      dose_count: doses.length || 1,
      recurrence_days: p.repeat_interval_days || 21,
      has_annual_booster: p.repeat_frequency === 'yearly',
      vaccine_brands: {
        is_live_vaccine: false,
        administration_route: 'parenteral_sc'
      }
    };
  }).filter((t: any) => {
    const isIncluded =
      t.is_core ||
      (isLegalRequiredPlansEnabled() && t.mandatory_level === 'legal_required');

    if (species === 'cat' && options?.isOutdoor) {
      return isIncluded || t.vaccine_code === 'CAT_FELV';
    }
    return isIncluded;
  });

  // existingRecords ve lastRecordMap hazırlanması
  let existingRecords: { vaccine_code: string; status: string }[] = [];
  const lastRecordMap: Record<string, { vaccine_code: string; administered_at: string }> = {};

  if (options?.petId) {
    const { data: records } = await supabase
      .from('vaccine_records_v2')
      .select('vaccine_code, status, administered_at')
      .eq('pet_id', options.petId);

    if (records) {
      existingRecords = records.map(r => ({ vaccine_code: r.vaccine_code, status: r.status }));

      for (const r of records) {
        if (r.status === 'completed' && r.administered_at) {
          const existing = lastRecordMap[r.vaccine_code];
          if (!existing || new Date(r.administered_at) > new Date(existing.administered_at)) {
            lastRecordMap[r.vaccine_code] = {
              vaccine_code: r.vaccine_code,
              administered_at: r.administered_at,
            };
          }
        }
      }
    }
  }

  const tasks: VaccinationTask[] = [];

  for (const t of templates as any[]) {
    if (t.vaccine_code === 'CAT_FIV') continue;

    // A1 Kuduz min yaş
    if (t.vaccine_code === 'DOG_RABIES' || t.vaccine_code === 'CAT_RABIES') {
      t.first_dose_week = Math.max(t.first_dose_week ?? 12, 12);
    }

    const firstDoseWeek = t.first_dose_week ?? 8;
    const firstDoseDate = new Date(safeBirthStr);
    firstDoseDate.setDate(firstDoseDate.getDate() + firstDoseWeek * 7);

    const mappedCategory = t.category === 'parasite' ? 'parazit' : 'asi';
    const baseExtraData = {
      vaccine: { code: t.vaccine_code, name: t.vaccine_name },
      auto_generated: true,
    };

    // Parazitler için eski akış devam eder
    if (t.category === 'parasite') {
      const recurrenceDays = t.recurrence_days ?? 30;
      for (let occurrence = 0; occurrence < 3; occurrence++) {
        const scheduledDate = new Date(firstDoseDate);
        scheduledDate.setDate(firstDoseDate.getDate() + occurrence * recurrenceDays);
        tasks.push({
          category: mappedCategory,
          sub_type: occurrence > 0 ? `${t.vaccine_name} — ${occurrence + 1}. Uygulama` : t.vaccine_name,
          scheduled_at: scheduledDate.toISOString(),
          extra_data: baseExtraData,
        });
      }
      continue;
    }

    // Aşılar için: petId varsa yeni paralel yazım fonksiyonunu çalıştır
    if (options?.petId) {
      // JOIN sonucunu düzleştir
      const brand = t.vaccine_brands?.[0] || t.vaccine_brands;
      const enrichedTemplate: VaccineTemplate = {
        vaccine_code: t.vaccine_code,
        vaccine_name: t.vaccine_name,
        species: t.species,
        is_active: t.is_active,
        is_core: t.mandatory_level === 'core',
        dose_count: t.dose_count,
        recurrence_days: t.recurrence_days,
        has_annual_booster: t.has_annual_booster,
        is_live_vaccine: brand?.is_live_vaccine ?? false,
        administration_route: brand?.administration_route ?? 'parenteral_sc',
      };

      await processPlanItemsForTemplate(
        supabase as any,
        options.petId,
        enrichedTemplate,
        isAdult,
        existingRecords,
        lastRecordMap[t.vaccine_code] ?? null
      );
    } else {
      // Geriye dönük uyumluluk (petId yoksa eski yapıyı dizi olarak döndür)
      if ((t.dose_count ?? 1) === 1) {
        tasks.push({
          category: mappedCategory,
          sub_type: t.vaccine_name,
          scheduled_at: firstDoseDate.toISOString(),
          extra_data: baseExtraData,
        });
        if (t.has_annual_booster) {
          const boosterDate = new Date(firstDoseDate);
          boosterDate.setFullYear(boosterDate.getFullYear() + 1);
          tasks.push({
            category: mappedCategory,
            sub_type: `${t.vaccine_name} — Yıllık Tekrar`,
            scheduled_at: boosterDate.toISOString(),
            extra_data: baseExtraData,
          });
        }
      } else {
        const doseCount = t.dose_count ?? 2;
        const recurrenceDays = t.recurrence_days ?? INACTIVE_INTERVAL_DAYS;
        let lastDoseDate = new Date(firstDoseDate);

        for (let i = 1; i <= doseCount; i++) {
          const scheduledDate = new Date(firstDoseDate);
          if (i > 1) {
            scheduledDate.setDate(firstDoseDate.getDate() + (i - 1) * recurrenceDays);
          }
          lastDoseDate = new Date(scheduledDate);
          tasks.push({
            category: mappedCategory,
            sub_type: `${t.vaccine_name} — ${i}. Doz`,
            scheduled_at: scheduledDate.toISOString(),
            extra_data: baseExtraData,
          });
        }

        if (t.has_annual_booster) {
          const boosterDate = new Date(lastDoseDate);
          boosterDate.setFullYear(boosterDate.getFullYear() + 1);
          tasks.push({
            category: mappedCategory,
            sub_type: `${t.vaccine_name} — Yıllık Tekrar`,
            scheduled_at: boosterDate.toISOString(),
            extra_data: baseExtraData,
          });
        }
      }
    }
  }

  return tasks;
}
