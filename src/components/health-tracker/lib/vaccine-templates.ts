// ─────────────────────────────────────────────────────────────────────────────
// Veri Kaynağı Notu:
// Aşı sınıflandırması için tek kaynak gerçek: vaccine_protocols tablosu
// (vaccine_templates dropped — bkz. vaccination-algorithm.ts).
// is_core alanı:
//   true  → Zorunlu Aşılar
//   false → Opsiyonel Aşılar
// Statik vaccineCatalog.ts bu modülde KULLANILMAZ.
// ─────────────────────────────────────────────────────────────────────────────

/** vaccine_protocols tablosundan yüklenen lookup map türü */
export type VaccineTemplateEntry = {
  group: 'core' | 'optional';
  recurrence_days: number | null;
  has_annual_booster: boolean;
};
export type VaccineTemplateMap = Map<string, VaccineTemplateEntry>;

/** vaccine_protocols.is_core → UI grubu */
export function mandatoryLevelToGroup(isCore: boolean): 'core' | 'optional' {
  return isCore ? 'core' : 'optional';
}

/** Template map'ten recurrence_days al */
export function getTemplateRecurrenceDays(
  vaccineTemplateMap: VaccineTemplateMap,
  vaccineCode?: string | null,
  vaccineName?: string | null,
): number | null {
  if (vaccineCode) {
    const byCode = vaccineTemplateMap.get(vaccineCode.toUpperCase())
                ?? vaccineTemplateMap.get(vaccineCode);
    if (byCode) return byCode.recurrence_days;
  }
  if (vaccineName) {
    const lower = vaccineName.toLowerCase().trim();
    const exact = vaccineTemplateMap.get(lower);
    if (exact) return exact.recurrence_days;
    for (const [key, entry] of vaccineTemplateMap) {
      if (key.length >= 4 && lower.includes(key)) return entry.recurrence_days;
    }
  }
  return null;
}

/**
 * vaccine_protocols map'ine bakarak vaccine_code veya vaccine_name üzerinden
 * zorunlu/opsiyonel grubunu belirler.
 * Map yoksa (henüz yüklenmemişse) null döner → fallback: is_core DB flag'ı.
 */
export function resolveVaccineGroup(
  vaccineTemplateMap: VaccineTemplateMap,
  vaccineCode?: string | null,
  vaccineName?: string | null,
  isCoreFlag?: boolean | null,
  subCategory?: string | null,
): 'core' | 'optional' {
  // Template map henuz yuklenmemisse DB flaglarina don
  if (vaccineTemplateMap.size === 0) {
    if (isCoreFlag === true) return 'core';
    if (isCoreFlag === false) return 'optional';
    if ((subCategory || '').toLowerCase().includes('zorunlu')) return 'core';
    return 'core';
  }

  // 1) vaccine_code ile birebir bak (hem uppercase hem as-is dene)
  if (vaccineCode) {
    const byCode = vaccineTemplateMap.get(vaccineCode.toUpperCase())
                ?? vaccineTemplateMap.get(vaccineCode);
    if (byCode) return byCode.group;
  }

  // 2) vaccine_name / title ile tam key eslesme
  if (vaccineName) {
    const lower = vaccineName.toLowerCase().trim();
    const exact = vaccineTemplateMap.get(lower);
    if (exact) return exact.group;

    // 3) Partial: template adi title icinde geciyor mu? (min 4 karakter guard)
    for (const [key, entry] of vaccineTemplateMap) {
      if (key.length >= 4 && lower.includes(key)) return entry.group;
    }
  }

  // 4) DB is_core flag
  if (isCoreFlag === true) return 'core';
  if (isCoreFlag === false) return 'optional';

  // 5) sub_category metni
  if ((subCategory || '').toLocaleLowerCase('tr-TR').includes('zorunlu')) return 'core';

  return 'core'; // safe default
}
