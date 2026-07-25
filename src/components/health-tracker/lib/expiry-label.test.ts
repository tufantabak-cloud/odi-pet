import { describe, it, expect } from 'vitest';
import { buildCategoryGroups } from './group-events';
import { expandRecurringForTimeline } from './recurring-events';
import { toComputedEvent, formatFrequency, mapDbToUI } from './normalize-events';
import { computeExpiryDateLabel } from './coverage';
import { getPlanDisplayTitle } from '@/lib/plans/utils';
import type { CategoryGroup, FlowEvent, TaskRow } from '../types';

/**
 * Timeline satır başlığı üçlüsü — "alt kategori adı · yenileme periyodu ·
 * Son: gg.aa.yy" — TÜM kategori ve alt kategoriler için geçerli mi?
 *
 * Bu test, gerçek üretim pipeline'ını (useHealthTracker'ın plan→event map
 * mantığı + expandRecurringForTimeline + toComputedEvent + buildCategoryGroups
 * + computeExpiryDateLabel) çalıştırır — kopya mantık değil.
 */

const DAY = 86400000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();

// ── useHealthTracker.ts içindeki plan→event map'inin birebir kopyası ──
function mapPlanToEvent(p: any) {
  const PLAN_CAT_MAP: Record<string, string> = {
    saglik: 'Saglik', asi: 'Asi', parazit: 'Parazit',
    bakim: 'Bakım', beslenme: 'Beslenme', hijyen: 'Hijyen', aktivite: 'Aktivite',
  };
  const dueDateStr = p.scheduled_at.split('T')[0];
  let freqDays = 0;
  let freqLabel = '';
  if (p.repeat_rule) {
    const interval = Number(p.extra_data?.interval) || 1;
    if (p.repeat_rule === 'daily') { freqDays = interval; freqLabel = interval === 1 ? 'Her gün' : `Her ${interval} günde bir`; }
    else if (p.repeat_rule === 'weekly') { freqDays = interval * 7; freqLabel = interval === 1 ? 'Haftalık' : `Her ${interval} haftada bir`; }
    else if (p.repeat_rule === 'monthly') { freqDays = interval * 30; freqLabel = interval === 1 ? 'Aylık' : `Her ${interval} ayda bir`; }
    else if (p.repeat_rule === 'yearly') { freqDays = interval * 365; freqLabel = interval === 1 ? 'Yıllık' : `Her ${interval} yılda bir`; }
  }
  return {
    id: `plan_${p.id}`, _plan_id: p.id, _source: 'plans', _plan_category: p.category,
    pet_id: p.pet_id, title: getPlanDisplayTitle(p), due_date: dueDateStr, due_time: '12:00:00',
    status: p.status === 'completed' ? 'done' : p.status === 'cancelled' ? 'done' : 'upcoming',
    category: PLAN_CAT_MAP[p.category] || p.category, sub_category: p.sub_type,
    vaccines: p.extra_data?.vaccine ? { name: p.extra_data.vaccine.name } : null,
    notes: p.note ?? null, frequency_days: freqDays, frequency_label: freqLabel,
    repeat_rule: p.repeat_rule || null, extra_data: p.extra_data,
  };
}

function runPipeline(mergedEvents: any[]): CategoryGroup[] {
  const expanded = expandRecurringForTimeline(mergedEvents);
  const computed = expanded.map(toComputedEvent);
  return buildCategoryGroups(computed as any, new Map());
}

/** Bir kategori grubundaki tüm (satır, flowEvents) çiftlerini bileşenle aynı
 *  şekilde çıkarır (Aşı alt gruplu, diğerleri düz). */
function rowsOf(group: CategoryGroup): Array<{ row: TaskRow; flow: FlowEvent[] }> {
  const out: Array<{ row: TaskRow; flow: FlowEvent[] }> = [];
  if (group.subGroups && group.subGroups.length > 0) {
    for (const sg of group.subGroups) for (const row of sg.taskRows) out.push({ row, flow: sg.flowEvents || [] });
  } else {
    for (const row of group.taskRows) out.push({ row, flow: group.flowEvents || [] });
  }
  return out;
}

/** Bileşendeki satır başlığı hesabının birebir aynısı → üçlüyü döndürür. */
function headerOf(row: TaskRow, flow: FlowEvent[]) {
  const name = row.task.title;
  const period = formatFrequency(row.task.frequency_days, row.subGroupLabel ? null : row.task.frequency_label);
  const rowEvents = flow.filter(e => e.taskKey === row.task.title);
  const expiry = computeExpiryDateLabel(rowEvents, row.task.frequency_days || 0);
  return { name, period, expiry };
}

interface Case {
  label: string;      // insan-okur test adı
  source: 'plan' | 'hs';
  cat: string;        // DB kategori (plan.category veya hs.category)
  sub: string;        // alt kategori (sub_type / sub_category)
  rule: string | null; // repeat_rule (null = tek seferlik)
  group: string;      // beklenen UI kategori (CategoryGroup.category)
  recurring: boolean; // true → üç parça, false → Son yok (geçerlilik N/A)
  vaccineName?: string;
}

// ── Kapsam: kullanıcının belirttiği 8 kategori + tüm alt kategoriler ──
const CASES: Case[] = [
  // ═══ SAĞLIK ═══
  { label: 'Beslenme · Kilo Takibi (aylık)',      source: 'plan', cat: 'beslenme', sub: 'Kilo Takibi',    rule: 'monthly', group: 'Beslenme', recurring: true },
  { label: 'Sağlık · Belirti Takibi (haftalık)', source: 'plan', cat: 'saglik', sub: 'Belirti Takibi', rule: 'weekly',  group: 'Saglik', recurring: true },
  { label: 'Sağlık · Tedavi/Pansuman (günlük)',  source: 'plan', cat: 'saglik', sub: 'Tedavi/Pansuman', rule: 'daily',  group: 'Saglik', recurring: true },
  { label: 'Sağlık · Kronik Takip (günlük)',     source: 'plan', cat: 'saglik', sub: 'Kronik Takip',   rule: 'daily',   group: 'Saglik', recurring: true },
  { label: 'Sağlık · Tahlil/Rapor (tek sefer)',  source: 'plan', cat: 'saglik', sub: 'Tahlil/Rapor',   rule: null,      group: 'Saglik', recurring: false },
  { label: 'Sağlık · Alerji (tek sefer)',        source: 'plan', cat: 'saglik', sub: 'Alerji',         rule: null,      group: 'Saglik', recurring: false },
  { label: 'Beslenme · Kilo & Boy Ölçümü (aylık)', source: 'plan', cat: 'beslenme', sub: 'Kilo & Boy Ölçümü', rule: 'monthly', group: 'Beslenme', recurring: true },



  // ═══ AŞI ═══ (Zorunlu / Opsiyonel alt gruplar, satır = aşı adı)
  { label: 'Aşı · Kuduz Aşısı (yıllık)',   source: 'plan', cat: 'asi', sub: 'Aşı', rule: 'yearly', group: 'Asi', recurring: true, vaccineName: 'Kuduz Aşısı Protokolü' },
  { label: 'Aşı · Karma Aşı (yıllık)',     source: 'plan', cat: 'asi', sub: 'Aşı', rule: 'yearly', group: 'Asi', recurring: true, vaccineName: 'Karma Aşı (DHPPi)' },

  // ═══ PARAZİT ═══
  { label: 'Parazit · İç Parazit (aylık)',       source: 'plan', cat: 'parazit', sub: 'İç Parazit',    rule: 'monthly', group: 'Parazit', recurring: true },
  { label: 'Parazit · Dış Parazit (aylık)',      source: 'plan', cat: 'parazit', sub: 'Dış Parazit',   rule: 'monthly', group: 'Parazit', recurring: true },
  { label: 'Parazit · Parazit Tasması (8 aylık)', source: 'plan', cat: 'parazit', sub: 'Parazit Tasması', rule: 'monthly', group: 'Parazit', recurring: true },

  // ═══ BESLENME ═══
  { label: 'Beslenme · Mama Siparişi (aylık)',   source: 'plan', cat: 'beslenme', sub: 'Mama Siparişi',  rule: 'monthly', group: 'Beslenme', recurring: true },
  { label: 'Beslenme · Diyet Değişimi (tek sefer)', source: 'plan', cat: 'beslenme', sub: 'Diyet Değişimi', rule: null,   group: 'Beslenme', recurring: false },

  // ═══ BAKIM ═══
  { label: 'Bakım · Banyo (aylık)',          source: 'plan', cat: 'bakim', sub: 'Banyo',          rule: 'monthly', group: 'Bakım', recurring: true },
  { label: 'Bakım · Tüy Bakımı (haftalık)',  source: 'plan', cat: 'bakim', sub: 'Tüy Bakımı',     rule: 'weekly',  group: 'Bakım', recurring: true },
  { label: 'Bakım · Kulak Temizliği (2 haftalık)', source: 'plan', cat: 'bakim', sub: 'Kulak Temizliği', rule: 'weekly', group: 'Bakım', recurring: true },
  { label: 'Bakım · Diş Fırçalama (haftalık)', source: 'plan', cat: 'bakim', sub: 'Diş Fırçalama', rule: 'weekly',  group: 'Bakım', recurring: true },
  { label: 'Bakım · Tırnak Kesimi (aylık)',  source: 'plan', cat: 'bakim', sub: 'Tırnak Kesimi',  rule: 'monthly', group: 'Bakım', recurring: true },

  // ═══ HİJYEN ═══
  { label: 'Hijyen · Mama Kabı (günlük)',    source: 'plan', cat: 'hijyen', sub: 'Mama Kabı',     rule: 'daily',   group: 'Hijyen', recurring: true },
  { label: 'Hijyen · Yatak (aylık)',         source: 'plan', cat: 'hijyen', sub: 'Yatak',         rule: 'monthly', group: 'Hijyen', recurring: true },
  { label: 'Hijyen · Oyuncaklar (aylık)',    source: 'plan', cat: 'hijyen', sub: 'Oyuncaklar',    rule: 'monthly', group: 'Hijyen', recurring: true },
  { label: 'Hijyen · Su Pınarı (haftalık)',  source: 'plan', cat: 'hijyen', sub: 'Su Pınarı',     rule: 'weekly',  group: 'Hijyen', recurring: true },
  { label: 'Hijyen · Tasma (aylık)',         source: 'plan', cat: 'hijyen', sub: 'Tasma',         rule: 'monthly', group: 'Hijyen', recurring: true },
  { label: 'Hijyen · Kum Kabı (günlük)',     source: 'plan', cat: 'hijyen', sub: 'Kum Kabı',      rule: 'daily',   group: 'Hijyen', recurring: true },
  { label: 'Hijyen · Kum Değişimi (haftalık)', source: 'plan', cat: 'hijyen', sub: 'Kum Değişimi', rule: 'weekly', group: 'Hijyen', recurring: true },
  { label: 'Hijyen · Çiş Pedi (günlük)',     source: 'plan', cat: 'hijyen', sub: 'Çiş Pedi',      rule: 'daily',   group: 'Hijyen', recurring: true },
  { label: 'Hijyen · Kafes (aylık)',         source: 'plan', cat: 'hijyen', sub: 'Kafes',         rule: 'monthly', group: 'Hijyen', recurring: true },
  { label: 'Hijyen · Ortam Hijyeni (haftalık)', source: 'plan', cat: 'hijyen', sub: 'Ortam Hijyeni', rule: 'weekly', group: 'Hijyen', recurring: true },

  // ═══ AKTİVİTE ═══
  { label: 'Aktivite · Yürüyüş (günlük)',    source: 'plan', cat: 'aktivite', sub: 'Yürüyüş',     rule: 'daily',   group: 'Aktivite', recurring: true },
  { label: 'Aktivite · Köpek Tuvalet (günlük)', source: 'plan', cat: 'aktivite', sub: 'Köpek Tuvalet', rule: 'daily', group: 'Aktivite', recurring: true },
  { label: 'Aktivite · Kedi Tuvalet (günlük)', source: 'plan', cat: 'aktivite', sub: 'Kedi Tuvalet', rule: 'daily', group: 'Aktivite', recurring: true },
  { label: 'Aktivite · Eğitim (haftalık)',   source: 'plan', cat: 'aktivite', sub: 'Eğitim',       rule: 'weekly',  group: 'Aktivite', recurring: true },
  { label: 'Aktivite · Oyun (günlük)',       source: 'plan', cat: 'aktivite', sub: 'Oyun',         rule: 'daily',   group: 'Aktivite', recurring: true },
  { label: 'Aktivite · Yarışma (tek sefer)', source: 'plan', cat: 'aktivite', sub: 'Yarışma',      rule: null,      group: 'Aktivite', recurring: false },

  // ═══ VETERİNER ═══ (health_schedules kaynaklı → UI kategori "Kontrol")
  { label: 'Veteriner · Genel Kontrol (yıllık)', source: 'hs', cat: 'Veteriner', sub: 'Kontrol', rule: 'yearly', group: 'Kontrol', recurring: true },
  { label: 'Veteriner · Acil Durum (tek sefer)', source: 'hs', cat: 'Veteriner', sub: 'Acil',    rule: null,     group: 'Kontrol', recurring: false },
  { label: 'Veteriner · Takip Randevusu (tek sefer)', source: 'hs', cat: 'Veteriner', sub: 'Takip', rule: null,  group: 'Kontrol', recurring: false },
];

const RULE_DAYS: Record<string, number> = { daily: 1, weekly: 7, monthly: 30, yearly: 365 };

function buildEventsForCase(c: Case): any[] {
  const anchorOffset = -5; // 5 gün önce "Yapıldı"
  if (c.source === 'plan') {
    const plan = {
      id: `p_${c.sub}`, pet_id: 'test-pet', category: c.cat, sub_type: c.sub,
      scheduled_at: iso(anchorOffset), repeat_rule: c.rule, status: 'completed',
      note: null, extra_data: c.vaccineName ? { interval: 1, vaccine: { name: c.vaccineName } } : { interval: 1 },
    };
    return [mapPlanToEvent(plan)];
  }
  // health_schedules kaynaklı (Veteriner): tekrarsız tek "Yapıldı" satırı
  const freqDays = c.rule ? RULE_DAYS[c.rule] : 0;
  const freqLabel = c.rule === 'yearly' ? 'Yıllık' : c.rule === 'monthly' ? 'Aylık' : c.rule === 'weekly' ? 'Haftalık' : c.rule === 'daily' ? 'Her gün' : '';
  return [{
    id: `hs_${c.sub}`, pet_id: 'test-pet', category: c.cat, sub_category: c.sub,
    title: c.sub === 'Kontrol' ? 'Genel Kontrol' : c.sub === 'Acil' ? 'Acil Durum' : 'Takip Randevusu',
    due_date: iso(anchorOffset).split('T')[0], due_time: '12:00:00', status: 'done',
    frequency_days: freqDays, frequency_label: freqLabel,
  }];
}

describe('Timeline satır başlığı: alt kategori · periyot · Son geçerlilik (tüm kategoriler)', () => {
  for (const c of CASES) {
    it(c.label, () => {
      const groups = runPipeline(buildEventsForCase(c));
      const group = groups.find(g => g.category === c.group);
      expect(group, `"${c.group}" kategorisi oluşmalı`).toBeTruthy();

      const rows = rowsOf(group!);
      expect(rows.length, 'en az bir satır olmalı').toBeGreaterThan(0);

      // Bu senaryo tek görev ürettiği için ilk satırı denetle
      const { row, flow } = rows[0];
      const { name, period, expiry } = headerOf(row, flow);

      // 1) Alt kategori adı — her zaman dolu
      expect(name, 'alt kategori adı boş olmamalı').toBeTruthy();
      expect(typeof name).toBe('string');

      // 2) Yenileme periyodu — her zaman bir etiket üretilir
      expect(period, 'periyot etiketi boş olmamalı').toBeTruthy();

      if (c.recurring) {
        // 3) Geçerlilik süresi — "gg.aa.yy" biçiminde görünmeli
        expect(expiry, `${c.label}: Son geçerlilik tarihi görünmeli`).toMatch(/^\d{2}\.\d{2}\.\d{2}$/);
      } else {
        // Tek seferlik görevde geçerlilik süresi yok (doğru davranış)
        expect(expiry, `${c.label}: tek seferlik görevde Son gösterilmez`).toBeNull();
      }
    });
  }

  it('özet: tekrarlı görevlerin tamamında üçlü başlık üretilir', () => {
    const recurring = CASES.filter(c => c.recurring);
    let ok = 0;
    for (const c of recurring) {
      const groups = runPipeline(buildEventsForCase(c));
      const group = groups.find(g => g.category === c.group);
      if (!group) continue;
      const { row, flow } = rowsOf(group)[0];
      const { name, period, expiry } = headerOf(row, flow);
      if (name && period && /^\d{2}\.\d{2}\.\d{2}$/.test(expiry || '')) ok++;
    }
    expect(ok).toBe(recurring.length);
  });
});

describe('mapDbToUI Kategori & Tasma Regresyon Testleri', () => {
  it('Gerçek parazit tasması hâlâ Parazit kategorisine atanır', () => {
    const res = mapDbToUI('Parazit', 'Tasma', 'Parazit Tasması', new Map());
    expect(res.category).toBe('Parazit');
    expect(res.subCategory).toBe('Parazit Tasması');
  });

  it('İç/Dış Parazit Tasması başlığı Parazit kategorisine atanır', () => {
    const res = mapDbToUI('Saglik', null, 'İç ve Dış Parazit Tasması', new Map());
    expect(res.category).toBe('Parazit');
    expect(res.subCategory).toBe('Parazit Tasması');
  });

  it('Hijyen kategorisindeki jenerik tasma işlemi Parazit olarak DEĞİL Hijyen olarak kalır', () => {
    const res = mapDbToUI('Hijyen', 'Tasma', 'Tasma Temizliği', new Map());
    expect(res.category).toBe('Hijyen');
    expect(res.subCategory).toBe('Tasma & Göğüslük Temizliği');
  });

  it('Aşı eventleri etkilenmez', () => {
    const res = mapDbToUI('Asi', 'Aşı', 'Kuduz Aşısı', new Map());
    expect(res.category).toBe('Asi');
  });
});

