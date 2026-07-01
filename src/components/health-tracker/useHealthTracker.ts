import { useState, useEffect, useCallback, useMemo } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { ComputedStatus, CategoryGroup, TaskRow, PetCareTask, PetCareEvent, ComputedEvent } from './types';
import { getPlanDisplayTitle } from '@/lib/plans/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Veri Kaynağı Notu:
// Aşı ve parazit sınıflandırması için tek kaynak gerçek: vaccine_templates tablosu.
// mandatory_level alanı:
//   'legal_required' → Zorunlu Aşılar (legal)
//   'core'           → Zorunlu Aşılar
//   'optional'       → Opsiyonel Aşılar
// Statik vaccineCatalog.ts bu hook içinde KULLANILMAZ.
// ─────────────────────────────────────────────────────────────────────────────

/** vaccine_templates tablosundan yüklenen lookup map türü */
type VaccineTemplateEntry = {
  group: 'core' | 'optional';
  recurrence_days: number | null;
  has_annual_booster: boolean;
};
type VaccineTemplateMap = Map<string, VaccineTemplateEntry>;

/** mandatory_level → UI grubu */
function mandatoryLevelToGroup(level: string): 'core' | 'optional' {
  return (level === 'core' || level === 'legal_required') ? 'core' : 'optional';
}

/** Template map'ten recurrence_days al */
function getTemplateRecurrenceDays(
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
 * vaccine_templates map'ine bakarak vaccine_code veya vaccine_name üzerinden
 * zorunlu/opsiyonel grubunu belirler.
 * Map yoksa (henüz yüklenmemişse) null döner → fallback: is_core DB flag'ı.
 */
function resolveVaccineGroup(
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

/** Frekans gün sayısından okunabilir Türkçe etiket üret */
export function formatFrequency(days: number | null | undefined, label?: string | null): string {
  if (label) return label;
  if (!days || days === 0) return 'Her Yıl'; // null veya 0 → has_annual_booster fallback
  if (days === 1) return 'Her gün';
  if (days <= 3) return `${days} günde 1`;
  if (days === 7) return 'Haftada 1';
  if (days === 14) return '2 haftada 1';
  if (days === 30) return 'Ayda 1';
  if (days === 60) return '2 ayda 1';
  if (days === 90) return '3 ayda 1';
  if (days === 180) return '6 ayda 1';
  if (days === 365) return 'Her yıl';
  return `${days} günde 1`;
}

/** DB category → UI kategori eşleştirmesi */
const DB_CATEGORY_TO_UI: Record<string, { category: string; label: string; icon: string; order: number }> = {
  'Saglik':   { category: 'Saglik',   label: 'Sağlık',   icon: '❤️',  order: 0 },
  'Asi':      { category: 'Asi',      label: 'Aşı',      icon: '💉',  order: 1 },
  'Parazit':  { category: 'Parazit',  label: 'Parazit',  icon: '🦠',  order: 2 },
  'Bakım':    { category: 'Bakım',    label: 'Bakım',    icon: '🧼',  order: 3 },
  'Beslenme': { category: 'Beslenme', label: 'Beslenme', icon: '🥣',  order: 4 },
  'Hijyen':   { category: 'Hijyen',   label: 'Hijyen',   icon: '🧹',  order: 5 },
  'Aktivite': { category: 'Aktivite', label: 'Aktivite', icon: '🦴',  order: 6 },
};

/** DB kaydını UI kategori + alt kategorisine map'le */
function mapDbToUI(
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
    subCatLower.includes('tasma') ||
    titleLower.includes('tasma');

  if (isParasite || dbCat === 'Parazit') {
    let sub = 'Parazit Uygulamaları';
    if (subCatLower.includes('iç parazit') || titleLower.includes('iç parazit') || titleLower.includes('ic parazit')) sub = 'İç Parazit';
    else if (subCatLower.includes('dış parazit') || titleLower.includes('dış parazit') || titleLower.includes('dis parazit')) sub = 'Dış Parazit';
    else if (subCatLower.includes('tasma') || titleLower.includes('tasma')) sub = 'Parazit Tasması';
    return { category: 'Asi', subCategory: sub };
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
function computeStatus(schedule: any): ComputedStatus {
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

/** health_schedules kaydını ComputedEvent'e dönüştür */
function toComputedEvent(s: any): ComputedEvent {
  const computedStatus = computeStatus(s);
  return {
    ...s,
    id: s.id,
    task_id: s.plan_id || s.id,
    pet_id: s.pet_id,
    scheduled_at: s.due_date + (s.due_time ? `T${s.due_time}` : 'T12:00:00'),
    completed_at: s.status === 'done' ? (s.created_at || new Date().toISOString()) : null,
    status: s.status || 'scheduled',
    notes: s.notes,
    created_at: s.created_at,
    vaccines: s.vaccines,
    pet_care_tasks: {
      id: s.plan_id || s.id,
      pet_id: s.pet_id,
      title: s.title || s.plan_type || 'Görev',
      category: s.category || 'Diger',
      frequency_days: s.frequency_days !== undefined ? s.frequency_days : 0,
      frequency_label: s.frequency_label !== undefined ? s.frequency_label : null,
    },
    computedStatus,
  };
}

export function useHealthTracker(petId: string, refreshTrigger?: number) {
  const [events, setEvents] = useState<ComputedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserSupabaseClient();

  /**
   * vaccine_templates tablosundan yüklenen lookup map.
   * Key: vaccine_code (BÜYÜK HARF) veya vaccine_name (küçük harf normalize)
   * Value: 'core' | 'optional'
   */
  const [vaccineTemplateMap, setVaccineTemplateMap] = useState<VaccineTemplateMap>(new Map());

  // ── vaccine_templates'i yükle (her iki tür için, species filtresi yok — en kapsamlı) ──
  useEffect(() => {
    async function loadTemplates() {
      try {
        const { data, error } = await supabase
          .from('vaccine_templates')
          .select('vaccine_code, vaccine_name, mandatory_level, category, recurrence_days, has_annual_booster')
          .eq('is_active', true);

        if (error) {
          console.error('[useHealthTracker] vaccine_templates load error:', error);
          return;
        }

        const map = new Map<string, VaccineTemplateEntry>();
        (data || []).forEach((t: any) => {
          const group = mandatoryLevelToGroup(t.mandatory_level);
          const entry: VaccineTemplateEntry = {
            group,
            recurrence_days: t.recurrence_days ?? null,
            has_annual_booster: t.has_annual_booster ?? false,
          };
          // vaccine_code ile kayıt (büyük harf key)
          if (t.vaccine_code) map.set(t.vaccine_code.toUpperCase(), entry);
          // vaccine_name ile kayıt (küçük harf key — fuzzy match için)
          if (t.vaccine_name) map.set(t.vaccine_name.toLocaleLowerCase('tr-TR').trim(), entry);
        });

        setVaccineTemplateMap(map);
      } catch (err) {
        console.error('[useHealthTracker] vaccine_templates exception:', err);
      }
    }

    loadTemplates();
    // Yalnızca mount'ta çalışsın; supabase instance referansı stabil
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── health_schedules events ──────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    if (!petId) return;
    try {
      setLoading(true);

      const now = new Date();
      const past30 = new Date();
      past30.setDate(now.getDate() - 30);
      const future365 = new Date();
      future365.setDate(now.getDate() + 365);
      
      const past30Str = past30.toISOString().split('T')[0];
      const future365Str = future365.toISOString().split('T')[0];

      const usePlansOnly = process.env.NEXT_PUBLIC_USE_PLANS_ONLY === 'true';

      // vaccines join: is_core + code (template eşleştirme için)
      // vaccines tablosunda alan adı: code (vaccine_code değil)
      const [schedulesRes, plansRes] = await Promise.all([
        usePlansOnly ? Promise.resolve({ data: [], error: null }) : supabase
          .from('health_schedules')
          .select('*, vaccines(is_core, code, name)')
          .eq('pet_id', petId)
          .gte('due_date', past30Str)
          .lte('due_date', future365Str),
        supabase
          .from('plans')
          .select('*')
          .eq('pet_id', petId)
          .gte('scheduled_at', past30Str)
          .lte('scheduled_at', future365Str)
      ]);

      if (schedulesRes.error) throw schedulesRes.error;
      if (plansRes.error) throw plansRes.error;
      
      const PLAN_CAT_MAP: Record<string, string> = {
        saglik: 'Saglik', asi: 'Asi', parazit: 'Asi',
        bakim: 'Bakım', beslenme: 'Beslenme', hijyen: 'Hijyen', aktivite: 'Aktivite'
      };

      const mergedEvents = [
        ...(schedulesRes.data || []),
        ...(plansRes.data || []).map((p: any) => {
          let dueDateStr = p.scheduled_at?.split('T')[0];
          let dueTimeStr = '12:00:00';
          if (p.scheduled_at) {
            try {
              const d = new Date(p.scheduled_at);
              dueDateStr = d.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
              dueTimeStr = d.toLocaleTimeString('tr-TR', { 
                timeZone: 'Europe/Istanbul', 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit',
                hour12: false 
              });
            } catch(e) {}
          }
          let freqDays = p.extra_data?.frequency_days || 0;
          let freqLabel = p.extra_data?.frequency_label || '';

          if (p.repeat_rule) {
            if (p.repeat_rule === 'daily') { freqDays = 1; freqLabel = 'Her gün'; }
            else if (p.repeat_rule === 'weekly') { freqDays = 7; freqLabel = 'Haftalık'; }
            else if (p.repeat_rule === 'monthly') { freqDays = 30; freqLabel = 'Aylık'; }
            else if (p.repeat_rule === 'yearly') { freqDays = 365; freqLabel = 'Yıllık'; }
          }

          return {
            id: `plan_${p.id}`,
            _plan_id: p.id,
            _source: 'plans',
            pet_id: p.pet_id,
            title: getPlanDisplayTitle(p),
            due_date: dueDateStr,
            due_time: dueTimeStr,
            status: p.status === 'completed' ? 'done' : p.status === 'cancelled' ? 'done' : 'upcoming',
            category: PLAN_CAT_MAP[p.category] || p.category,
            sub_category: p.sub_type,
            vaccines: p.extra_data?.vaccine ? { name: p.extra_data.vaccine.name } : null,
            notes: p.note,
            updated_at: p.updated_at,
            frequency_days: freqDays,
            frequency_label: freqLabel,
          };
        })
      ].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

      const computed = mergedEvents.map(toComputedEvent);
      setEvents(computed);
    } catch (err) {
      console.error('Error fetching health tracker events:', err);
    } finally {
      setLoading(false);
    }
  }, [petId, supabase]);

  useEffect(() => {
    fetchEvents();

    const usePlansOnly = process.env.NEXT_PUBLIC_USE_PLANS_ONLY === 'true';
    let channel1: any;

    if (!usePlansOnly) {
      channel1 = supabase
        .channel('health_schedules_changes_tracker')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'health_schedules', filter: `pet_id=eq.${petId}` },
          () => { fetchEvents(); }
        )
        .subscribe();
    }
      
    const channel2 = supabase
      .channel('plans_changes_tracker')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plans', filter: `pet_id=eq.${petId}` },
        () => { fetchEvents(); }
      )
      .subscribe();

    return () => { 
      if (channel1) supabase.removeChannel(channel1); 
      supabase.removeChannel(channel2); 
    };
  }, [fetchEvents, petId, supabase, refreshTrigger]);

  // ── Gruplama Mantığı ─────────────────────────────────────────────────────────
  const categoryGroups: CategoryGroup[] = useMemo(() => {
    const taskMap = new Map<string, TaskRow>();

    events.forEach(event => {
      const task = event.pet_care_tasks;
      if (!task) return;

      // vaccines join'dan gelen alanlar (vaccines.code = vaccineCatalog kodu)
      const vaccineCode = (event.vaccines as any)?.code ?? null;
      const isCoreFlag  = (event.vaccines as any)?.is_core ?? null;

      const mapped = mapDbToUI(
        task.category,
        event.sub_category || null,
        task.title,
        vaccineTemplateMap,  // ← vaccine_templates tek kaynak
        vaccineCode,
        isCoreFlag,
      );

      // Veteriner ve Diğer dahil olmayacak
      if (mapped.category === 'Veteriner' || mapped.category === 'Diger') return;

      // Aşı → 3 seviye (category::subCategory::vaccineName) → aşı ismi ayrı satır
      // Parazit → 2 seviye (category::subCategory) → alt başlık tek bir satır
      // Diğer → 2 seviye (category::subCategory)
      const isVaccine = mapped.category === 'Asi';
      const productName = task.title || event.sub_category || 'Aşı';

      const groupKey = isVaccine
        ? `${mapped.category}::${mapped.subCategory}::${productName}`
        : `${mapped.category}::${mapped.subCategory}`;

      if (!taskMap.has(groupKey)) {
        // Frekans gün sayısını vaccine_templates'tan al
        const templateRecurrenceDays = getTemplateRecurrenceDays(
          vaccineTemplateMap,
          vaccineCode,
          productName,
        );
        taskMap.set(groupKey, {
          task: {
            ...task,
            title: isVaccine ? productName : mapped.subCategory,
            category: mapped.category,
            frequency_days: templateRecurrenceDays ?? task.frequency_days ?? 0,
            frequency_label: isVaccine ? mapped.subCategory : (task.frequency_label || null),
          },
          events: [],
          subGroupLabel: isVaccine ? mapped.subCategory : undefined,
        });
      }
      taskMap.get(groupKey)!.events.push(event);
    });

    // Kategoriye göre grupla
    const catMap = new Map<string, CategoryGroup>();
    taskMap.forEach(taskRow => {
      const cat = taskRow.task.category || 'Diger';
      const meta = DB_CATEGORY_TO_UI[cat];
      if (!meta) return;

      if (!catMap.has(cat)) {
        catMap.set(cat, { category: cat, label: meta.label, icon: meta.icon, taskRows: [], subGroups: [] });
      }
      catMap.get(cat)!.taskRows.push(taskRow);
    });

    // Aşı kategorisi → Zorunlu / Opsiyonel alt grupları (subGroups)
    // Parazit kategorisi → düz taskRows (alt başlık = satır başlığı)
    const VACCINE_SUB_GROUP_ORDER = ['Zorunlu Aşılar', 'Opsiyonel Aşılar', 'İç Parazit', 'Dış Parazit', 'Parazit Tasması', 'Parazit Uygulamaları', 'Diğer Aşılar'];

    catMap.forEach(group => {
      if (group.category === 'Asi') {
        const subGroupMap = new Map<string, TaskRow[]>();
        group.taskRows.forEach(row => {
          const label = row.subGroupLabel || 'Opsiyonel Aşılar';
          if (!subGroupMap.has(label)) subGroupMap.set(label, []);
          subGroupMap.get(label)!.push(row);
        });
        group.subGroups = VACCINE_SUB_GROUP_ORDER
          .filter(l => subGroupMap.has(l))
          .map(l => ({ label: l, taskRows: subGroupMap.get(l)! }));
        // leftover groups (eğer varsa)
        Array.from(subGroupMap.keys())
          .filter(l => !VACCINE_SUB_GROUP_ORDER.includes(l))
          .forEach(l => group.subGroups!.push({ label: l, taskRows: subGroupMap.get(l)! }));
      }
      // Parazit için subGroups boş kalır, taskRows düz sıralanır
      if (group.category === 'Parazit') {
        const PARASITE_ORDER = ['İç Parazit Uygulaması', 'Dış Parazit Uygulaması', 'Parazit Tasması'];
        group.taskRows.sort((a, b) => {
          const ai = PARASITE_ORDER.indexOf(a.task.title);
          const bi = PARASITE_ORDER.indexOf(b.task.title);
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });
        group.subGroups = []; // subGroups yok → HealthTracker düz liste render eder
      }
    });

    // Sabit sıralama
    return Array.from(catMap.values()).sort((a, b) => {
      const ma = DB_CATEGORY_TO_UI[a.category];
      const mb = DB_CATEGORY_TO_UI[b.category];
      return (ma?.order ?? 99) - (mb?.order ?? 99);
    });
  }, [events, vaccineTemplateMap]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const markEventStatus = async (eventId: string, newStatus: string) => {
    try {
      setEvents(prev => prev.map(e =>
        e.id === eventId ? { ...e, status: newStatus, computedStatus: newStatus as ComputedStatus } : e
      ));
      
      const realId = eventId.toString().startsWith('plan_') ? eventId.replace('plan_', '') : eventId;
      await fetch(`/api/plans/${realId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus === 'done' ? 'completed' : newStatus })
      });
      
      fetchEvents();
    } catch (err) {
      console.error('Error updating event status:', err);
      fetchEvents();
    }
  };

  const postponeEvent = async (eventId: string, days: number = 1) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;
      const oldDate = new Date(event.scheduled_at);
      oldDate.setDate(oldDate.getDate() + days);
      const newDueDate = oldDate.toISOString().split('T')[0];
      
      const realId = eventId.toString().startsWith('plan_') ? eventId.replace('plan_', '') : eventId;
      await fetch(`/api/plans/${realId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_at: newDueDate })
      });
      
      fetchEvents();
    } catch (err) {
      console.error('Error postponing event:', err);
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const realId = eventId.toString().startsWith('plan_') ? eventId.replace('plan_', '') : eventId;
      await fetch(`/api/plans/${realId}`, { method: 'DELETE' });
      fetchEvents();
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  return {
    categoryGroups,
    loading,
    refetch: fetchEvents,
    markEventStatus,
    postponeEvent,
    deleteEvent,
    formatFrequency,
  };
}
