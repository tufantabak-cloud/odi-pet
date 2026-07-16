// ============================================================
// OdiPet — Aşı Kural Motoru Tipleri ve Yardımcı Sabitleri
// ============================================================

export type AdministrationRoute =
  | 'intranasal'
  | 'oral'
  | 'parenteral_sc'
  | 'parenteral_im';

// --- Kural motoru için yardımcı sabitler ---
export const SINGLE_DOSE_ROUTES: AdministrationRoute[] = [
  'intranasal',
  'oral',
];

export const DOUBLE_DOSE_ROUTES: AdministrationRoute[] = [
  'parenteral_sc',
  'parenteral_im',
];

// A5: Bordetella rota kontrolü
export function getBordetellaDoseCount(route: AdministrationRoute): number {
  return SINGLE_DOSE_ROUTES.includes(route) ? 1 : 2;
}

// A5: Bordetella doz aralığı (gün)
export function getBordetellaIntervalDays(route: AdministrationRoute): number {
  return SINGLE_DOSE_ROUTES.includes(route) ? 0 : 21;
}

// A4: Yetişkin başlangıç dozu (MLV vs inaktive)
export function getAdultInitialDoseCount(
  isLiveVaccine: boolean,
  antigenCode: string
): number {
  // MLV → 1 doz (yetişkin, geçmişi bilinmeyen)
  if (isLiveVaccine) return 1;
  // İnaktive → 2 doz (tüm rotalar)
  // Leptospiroz her durumda 2 doz (B2 kararı uyarınca)
  return 2;
}

// A4: İnaktive doz aralığı (gün)
export const INACTIVE_VACCINE_INTERVAL_DAYS = 21; // 2–4 hafta, TR pratiğinde 21 gün standart
