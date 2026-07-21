/**
 * Timeline'ın görünür tarih aralığı — her görev satırının bağımsız olarak
 * sürükleyip gezebileceği ortak, sabit pencere. Sanal (tekrarlayan) event
 * üretimi de aynı aralıkla sınırlıdır (bkz. expandRecurringForTimeline).
 * Bu pencere dışına (örn. 8 ay süren bir koruma penceresinin sonuna)
 * gerçek DB kayıtları yine de düşebilir; yalnızca SANAL tekrarlar bu
 * aralıkla sınırlıdır.
 */
export const TIMELINE_VISIBLE_PAST_DAYS = 60;
export const TIMELINE_VISIBLE_FUTURE_DAYS = 240;
/** Görünür kolon sayısı (bugün dahil) */
export const TIMELINE_VISIBLE_DAY_COUNT =
  TIMELINE_VISIBLE_PAST_DAYS + 1 + TIMELINE_VISIBLE_FUTURE_DAYS;

/** Tarihi YYYY-MM-DD anahtarına çevirir (İstanbul TZ) — grid hücre eşlemesinin tek kaynağı */
export function toDateKey(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
}

/**
 * Tekrarlayan planları yalnızca görünür tarih aralığı boyunca
 * sanal event'lere genişletir. Böylece her tekrar tarihinde chip görünür.
 * startOffsetDays/endOffsetDays: bugüne göre gün cinsinden pencere sınırları.
 */
export function expandRecurringForTimeline(
  events: any[],
  startOffsetDays: number = -TIMELINE_VISIBLE_PAST_DAYS,
  endOffsetDays: number = TIMELINE_VISIBLE_FUTURE_DAYS
): any[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rangeStart = new Date(today);
  rangeStart.setDate(today.getDate() + startOffsetDays);
  const rangeEnd = new Date(today);
  rangeEnd.setDate(today.getDate() + endOffsetDays);

  const rangeStartStr = toDateKey(rangeStart);
  const rangeEndStr = toDateKey(rangeEnd);

  // Mevcut event'lerin due_date'lerini task bazında kaydet (duplicate engeli)
  const existingDatesByKey = new Map<string, Set<string>>();
  events.forEach(e => {
    // Görevi tanımlayan unique key: category + title/sub_category
    const taskKey = `${e.category}_${e.title || e.sub_category}`;
    if (!existingDatesByKey.has(taskKey)) existingDatesByKey.set(taskKey, new Set());
    const dd = (e.due_date || '').includes('T') ? e.due_date.split('T')[0] : (e.due_date || '');
    if (dd) existingDatesByKey.get(taskKey)!.add(dd);
  });

  const virtualEvents: any[] = [];

  // Genişletilecek tekrar kurallarını seç:
  //  1. Tamamlanmış/iptal (status='done') tekrarlar genişletilmez — bunlar tek
  //     bir anchor kartıyla kalır; fantom geçmiş/gelecek occurrence üretmez.
  //  2. Aynı taskKey'de birden fazla AKTİF tekrar kuralı varsa yalnızca en
  //     güncel anchor'a sahip olan genişletilir (çakışan haftalık+aylık gibi
  //     akışların aynı satırda üst üste binmesini önler).
  const dueKeyOf = (e: any): string =>
    (e.due_date || '').includes('T') ? e.due_date.split('T')[0] : (e.due_date || '');
  const expandCandidates = new Map<string, any>();
  events.forEach(e => {
    const repeatRule = e.repeat_rule;
    if (!repeatRule || repeatRule === 'none') return;
    if (e.status === 'done') return;
    const rawDueDate = dueKeyOf(e);
    if (!rawDueDate) return;
    const taskKey = `${e.category}_${e.title || e.sub_category}`;
    const existing = expandCandidates.get(taskKey);
    if (!existing || rawDueDate > dueKeyOf(existing)) {
      expandCandidates.set(taskKey, e);
    }
  });

  expandCandidates.forEach(e => {
    const repeatRule = e.repeat_rule;
    const key = e._plan_id
      ? `${e._source || 'plan'}_${e._plan_id}`
      : `${e.category}_${e.title || e.sub_category}`;

    const taskKey = `${e.category}_${e.title || e.sub_category}`;
    const existingDates = existingDatesByKey.get(taskKey) || new Set();
    const rawDueDate = dueKeyOf(e);
    if (!rawDueDate) return;

    const anchor = new Date(rawDueDate + 'T00:00:00');
    if (isNaN(anchor.getTime())) return;

    // Her bir tekrar tarihini üret
    const addVirtual = (dateStr: string) => {
      if (existingDates.has(dateStr)) return;
      existingDates.add(dateStr); // Tekrar eklemeyi engelle
      virtualEvents.push({
        ...e,
        id: `virtual_${key}_${dateStr}`,
        _is_virtual: true,
        due_date: dateStr,
        due_time: e.due_time || '12:00:00',
        status: 'upcoming', // computeStatus daha sonra doğru statüyü belirler
      });
    };

    const interval = Number(e.extra_data?.interval) || 1;

    // İleri yönde genişlet
    const nextDate = (current: Date): Date | null => {
      const d = new Date(current);
      switch (repeatRule) {
        case 'hour':
        case 'hourly': d.setHours(d.getHours() + interval); break;
        case 'daily': d.setDate(d.getDate() + interval); break;
        case 'weekly': d.setDate(d.getDate() + (interval * 7)); break;
        case 'monthly': d.setMonth(d.getMonth() + interval); break;
        case 'yearly': d.setFullYear(d.getFullYear() + interval); break;
        default: return null;
      }
      return d;
    };

    // Geri yönde genişlet
    const prevDate = (current: Date): Date | null => {
      const d = new Date(current);
      switch (repeatRule) {
        case 'hour':
        case 'hourly': d.setHours(d.getHours() - interval); break;
        case 'daily': d.setDate(d.getDate() - interval); break;
        case 'weekly': d.setDate(d.getDate() - (interval * 7)); break;
        case 'monthly': d.setMonth(d.getMonth() - interval); break;
        case 'yearly': d.setFullYear(d.getFullYear() - interval); break;
        default: return null;
      }
      return d;
    };

    // İleri: anchor → rangeEnd
    let cursor: Date | null = new Date(anchor);
    let guard = 0;
    while (cursor && guard < 500) {
      const ds = toDateKey(cursor);
      if (ds > rangeEndStr) break;
      if (ds >= rangeStartStr) addVirtual(ds);
      cursor = nextDate(cursor);
      guard++;
    }

    // Geri: anchor - 1 step → rangeStart
    cursor = prevDate(new Date(anchor));
    guard = 0;
    while (cursor && guard < 500) {
      const ds = toDateKey(cursor);
      if (ds < rangeStartStr) break;
      addVirtual(ds);
      cursor = prevDate(cursor);
      guard++;
    }
  });

  return [...events, ...virtualEvents].sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );
}
