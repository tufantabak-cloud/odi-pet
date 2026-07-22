import { ComputedStatus, ComputedEvent } from '../types';
import { VaccineTemplateMap, resolveVaccineGroup } from './vaccine-templates';

/**
 * Frekans gün sayısından okunabilir Türkçe etiket üret.
 * zeroLabel: gün sayısı 0/null olduğunda dönülecek metin. Aşılarda varsayılan
 * 'Her Yıl' (yıllık booster varsayımı); aşı olmayan/tek-seferlik görevlerde
 * çağıran taraf 'Tek seferlik' geçer.
 */
export function formatFrequency(days: number | null | undefined, label?: string | null, zeroLabel: string = 'Her Yıl'): string {
  if (label) return label;
  if (!days || days === 0) return zeroLabel;
  if (days === 1) return 'Her gün';
  if (days <= 3) return `${days} günde 1`;
  if (days === 7) return 'Haftada 1';
  if (days === 14) return '2 haftada 1';
  if (days === 30) return 'Ayda 1';
  if (days === 60) return '2 ayda 1';
  if (days === 90) return '3 ayda 1';
  if (days === 180) return '6 ayda 1';
  if (days === 365) return 'Her yıl';
  // Tam bölünen değerler net etiket alır (yıl → ay → hafta önceliğiyle)
  if (days % 365 === 0) return `${days / 365} yılda 1`;
  if (days % 30 === 0) return `${days / 30} ayda 1`;
  if (days % 7 === 0) return `${days / 7} haftada 1`;
  // Tam bölünmeyen ürün süreleri (84, 210, 240…) için en yakın ay/hafta yaklaşımı
  if (days >= 60) return `≈${Math.round(days / 30)} ayda 1`;   // örn. 84→≈3 ay, 210→≈7 ay, 240→≈8 ay
  if (days >= 14) return `≈${Math.round(days / 7)} haftada 1`; // örn. 28→≈4 hafta, 35→≈5 hafta
  return `${days} günde 1`;
}

/** DB category → UI kategori eşleştirmesi */
export const DB_CATEGORY_TO_UI: Record<string, { category: string; label: string; icon: string; order: number }> = {
  'Saglik':   { category: 'Saglik',   label: 'Sağlık',   icon: '❤️',  order: 0 },
  'Kontrol':  { category: 'Kontrol',  label: 'Kontrol & Randevu', icon: '🩺', order: 0.5 },
  'Asi':      { category: 'Asi',      label: 'Aşı',      icon: '💉',  order: 1 },
  'Parazit':  { category: 'Parazit',  label: 'Parazit',  icon: '🦠',  order: 2 },
  'Bakım':    { category: 'Bakım',    label: 'Bakım',    icon: '🧼',  order: 3 },
  'Beslenme': { category: 'Beslenme', label: 'Beslenme', icon: '🥣',  order: 4 },
  'Hijyen':   { category: 'Hijyen',   label: 'Hijyen',   icon: '🧹',  order: 5 },
  'Aktivite': { category: 'Aktivite', label: 'Aktivite', icon: '🦴',  order: 6 },
};

/** DB kaydını UI kategori + alt kategorisine map'le */
export function mapDbToUI(
  category: string,
  subCategory: string | null,
  title: string,
  vaccineTemplateMap: VaccineTemplateMap,
  vaccineCode?: string | null,
  isCoreVaccine?: boolean | null,
): { category: string; subCategory: string } {
  let dbCat = category;
  if (dbCat === 'Temizlik') dbCat = 'Hijyen';

  const titleLower = title.toLocaleLowerCase('tr-TR');
  const subCatLower = (subCategory || '').toLocaleLowerCase('tr-TR');

  // ── PARAZİT KONTROLÜ (Tüm kategoriler için intercept) ──────────────────────
  const isParasite =
    titleLower.includes('parazit') ||
    subCatLower.includes('parazit') ||
    subCatLower.includes('parazit tasm') ||
    titleLower.includes('parazit tasm') ||
    (dbCat === 'Parazit' && (subCatLower.includes('tasma') || titleLower.includes('tasma')));

  if (isParasite || dbCat === 'Parazit') {
    let sub = 'Parazit Uygulamaları';
    const isCombined =
      subCatLower.includes('kombine') || titleLower.includes('kombine') ||
      subCatLower.includes('birleşik') || titleLower.includes('birleşik') ||
      subCatLower.includes('birlesik') || titleLower.includes('birlesik') ||
      subCatLower.includes('karma') || titleLower.includes('karma');
    if (subCatLower.includes('tasma') || titleLower.includes('tasma')) sub = 'Parazit Tasması';
    else if (subCatLower.includes('iç parazit') || titleLower.includes('iç parazit') || titleLower.includes('ic parazit')) sub = 'İç Parazit Uygulaması';
    else if (subCatLower.includes('dış parazit') || titleLower.includes('dış parazit') || titleLower.includes('dis parazit')) sub = 'Dış Parazit Uygulaması';
    else if (isCombined) sub = 'Kombine Parazit Uygulaması';
    return { category: 'Parazit', subCategory: sub };
  }

  // ── 0. Kontroller & Randevular (Veteriner) ──────────────────────────────────
  if (dbCat === 'Veteriner' || dbCat === 'kontrol') {
    let sub = 'Kontrol';
    if (subCategory === 'Kontrol') sub = 'Genel Kontrol';
    else if (subCategory === 'Acil') sub = 'Acil Durum';
    else if (subCategory === 'Takip') sub = 'Takip Randevusu';
    else if (subCategory) sub = subCategory;
    return { category: 'Kontrol', subCategory: sub };
  }

  // ── 1. Sağlık ──────────────────────────────────────────────────────────────
  if (dbCat === 'Saglik') {
    let sub = 'Sağlık Takibi';
    if (subCategory === 'Kilo Takibi') sub = 'Kilo Ölçümü';
    else if (subCategory === 'Belirti Takibi') sub = 'Semptom & Belirti Takibi';
    else if (subCategory === 'İlaç') sub = 'İlaç Kullanımı';
    else if (subCategory === 'Tedavi/Pansuman') sub = 'Tedavi & Pansuman';
    else if (subCategory === 'Tahlil/Rapor') sub = 'Tahlil & Rapor';
    else if (subCategory === 'Kronik Takip') sub = 'Kronik Rahatsızlık Takibi';
    else if (subCategory === 'Alerji') sub = 'Alerji Kaydı';
    else if (subCategory) sub = subCategory;
    return { category: 'Saglik', subCategory: sub };
  }

  // ── 2. Medikal (eski kategori adı) → Aşı ────────────────────────────────────
  if (dbCat === 'Medikal') {
    const group = resolveVaccineGroup(vaccineTemplateMap, vaccineCode, title, isCoreVaccine, subCategory);
    return { category: 'Asi', subCategory: group === 'core' ? 'Zorunlu Aşılar' : 'Opsiyonel Aşılar' };
  }

  // ── 4. Aşı (doğrudan Asi category) ─────────────────────────────────────────
  if (dbCat === 'Asi') {
    const group = resolveVaccineGroup(vaccineTemplateMap, vaccineCode, title, isCoreVaccine, subCategory);
    return { category: 'Asi', subCategory: group === 'core' ? 'Zorunlu Aşılar' : 'Opsiyonel Aşılar' };
  }

  // ── 5. Bakım ────────────────────────────────────────────────────────────────
  if (dbCat === 'Bakım') {
    let sub = subCategory || 'Bakım';
    if (subCategory === 'Banyo') sub = 'Banyo';
    else if (subCategory === 'Tüy Bakımı') sub = 'Tüy Bakımı';
    else if (subCategory === 'Kulak Temizliği') sub = 'Kulak Temizliği';
    else if (subCategory === 'Diş Fırçalama') sub = 'Diş Fırçalama';
    else if (subCategory === 'Tırnak Kesimi') sub = 'Tırnak Kesimi';
    return { category: 'Bakım', subCategory: sub };
  }

  // ── 6. Beslenme ─────────────────────────────────────────────────────────────
  if (dbCat === 'Beslenme') {
    let sub = subCategory || 'Beslenme';
    if (subCategory === 'Mama Siparişi') sub = 'Mama Siparişi / Stok';
    else if (subCategory === 'Diyet Değişimi') sub = 'Diyet Değişimi';
    return { category: 'Beslenme', subCategory: sub };
  }

  // ── 7. Hijyen ───────────────────────────────────────────────────────────────
  if (dbCat === 'Hijyen') {
    let sub = subCategory || 'Hijyen';
    if (subCategory === 'Mama Kabı') sub = 'Mama Kabı Temizliği';
    else if (subCategory === 'Yatak') sub = 'Yatak Temizliği';
    else if (subCategory === 'Oyuncaklar') sub = 'Oyuncak Temizliği';
    else if (subCategory === 'Su Pınarı') sub = 'Su Pınarı Temizliği';
    else if (subCategory === 'Tasma') sub = 'Tasma & Göğüslük Temizliği';
    else if (subCategory === 'Çiş Pedi') sub = 'Çiş Pedi Temizliği & Değişimi';
    else if (subCategory === 'Kum Kabı') sub = 'Kum Kabı Temizliği';
    else if (subCategory === 'Kum Değişimi') sub = 'Kum Değişimi & Yıkama';
    else if (subCategory === 'Kafes') sub = 'Kafes / Taşıma Kutusu';
    else if (subCategory === 'Ortam Hijyeni') sub = 'Ev & Ortam Hijyeni';
    return { category: 'Hijyen', subCategory: sub };
  }

  // ── 8. Aktivite ─────────────────────────────────────────────────────────────
  if (dbCat === 'Aktiviteler' || dbCat === 'Aktivite') {
    let sub = subCategory || 'Aktivite';
    if (subCategory === 'Yürüyüş') sub = 'Yürüyüş';
    else if (subCategory === 'Köpek Tuvalet') sub = 'Dışarı Tuvalet Eğitimi';
    else if (subCategory === 'Kedi Tuvalet') sub = 'Kedi Tuvalet Eğitimi';
    else if (subCategory === 'Yarışma') sub = 'Yarışma / Gösteri';
    else if (subCategory === 'Eğitim') sub = 'Eğitim Seansı';
    else if (subCategory === 'Oyun') sub = 'Oyun Zamanı';
    return { category: 'Aktivite', subCategory: sub };
  }

  // Fallback
  return { category: dbCat, subCategory: subCategory || title || 'Diğer' };
}

/** health_schedules kaydından status hesapla */
export function computeStatus(schedule: any): ComputedStatus {
  if (schedule.status === 'done' || schedule.status === 'completed') return 'done';

  const now = new Date();
  const dueDate = new Date(schedule.due_date);

  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const scheduledDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const diffDays = Math.round((scheduledDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'missed';
  if (diffDays === 0) return 'today';
  if (diffDays <= 3) return 'upcoming';
  return 'future';
}

/** Bir event'in sıralamada kullanılacak tarihini (due_date öncelikli) döndürür */
export function getEventSortDate(e: ComputedEvent): number {
  const raw = (e as any).due_date || e.scheduled_at;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

/** health_schedules kaydını ComputedEvent'e dönüştür */
export function toComputedEvent(s: any): ComputedEvent {
  const computedStatus = computeStatus(s);

  // due_date'i normalize et — her zaman YYYY-MM-DD formatında olmalı
  let normalizedDueDate: string = s.due_date || '';
  if (normalizedDueDate.includes('T')) {
    normalizedDueDate = normalizedDueDate.split('T')[0];
  }
  // due_date boş veya geçersizse scheduled_at'ten çıkar
  if (!normalizedDueDate && s.scheduled_at) {
    try {
      const d = new Date(s.scheduled_at);
      normalizedDueDate = d.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
    } catch { /* fallback bırak */ }
  }

  return {
    ...s,
    id: s.id,
    task_id: s.plan_id || s._plan_id || s.id,
    pet_id: s.pet_id,
    due_date: normalizedDueDate, // ← açıkça set et, hiçbir zaman kaybolmasın
    scheduled_at: (normalizedDueDate || s.due_date) + (s.due_time ? `T${s.due_time}` : 'T12:00:00'),
    completed_at: s.status === 'done' ? (s.created_at || new Date().toISOString()) : null,
    status: s.status || 'scheduled',
    notes: s.notes,
    created_at: s.created_at,
    vaccines: s.vaccines,
    pet_care_tasks: {
      id: s.plan_id || s._plan_id || s.id,
      pet_id: s.pet_id,
      title: s.title || s.plan_type || 'Görev',
      category: s.category || 'Diger',
      frequency_days: s.frequency_days !== undefined ? s.frequency_days : 0,
      frequency_label: s.frequency_label !== undefined ? s.frequency_label : null,
    },
    computedStatus,
  };
}
