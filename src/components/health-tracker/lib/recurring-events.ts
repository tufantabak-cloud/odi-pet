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

/** Özel gün seçimleri (selected_days / days_of_week) için gün indeks setini ayrıştırır (0=Sun, 1=Mon...6=Sat) */
export function parseSelectedDayIndices(selectedDaysInput: any): Set<number> | null {
  if (!Array.isArray(selectedDaysInput) || selectedDaysInput.length === 0) return null;
  const set = new Set<number>();
  selectedDaysInput.forEach(val => {
    if (typeof val === 'number') {
      set.add(val === 7 ? 0 : val % 7);
    } else if (typeof val === 'string') {
      const lower = val.toLowerCase().trim();
      if (lower.includes('pazartesi') || lower.includes('mon')) set.add(1);
      else if (lower.includes('salı') || lower.includes('tue')) set.add(2);
      else if (lower.includes('çarşamba') || lower.includes('wed')) set.add(3);
      else if (lower.includes('perşembe') || lower.includes('thu')) set.add(4);
      else if (lower.includes('cuma') || lower.includes('fri')) set.add(5);
      else if (lower.includes('cumartesi') || lower.includes('sat')) set.add(6);
      else if (lower.includes('pazar') || lower.includes('sun')) set.add(0);
    }
  });
  return set.size > 0 ? set : null;
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

    // Series start anchor calculation (ADIM 6)
    // Priority: extra_data.series_start_at > extra_data.start_date > start_date > occurrence_scheduled_at > scheduled_at > due_date
    const rawSeriesStart =
      e.extra_data?.series_start_at ||
      e.extra_data?.start_date ||
      e.extra_data?.medication?.start_date ||
      e.start_date ||
      e.occurrence_scheduled_at ||
      e.scheduled_at ||
      rawDueDate;

    const seriesStartStr = String(rawSeriesStart).includes('T')
      ? String(rawSeriesStart).split('T')[0]
      : String(rawSeriesStart);

    const anchorDateStr = seriesStartStr || rawDueDate;
    const anchor = new Date(anchorDateStr + 'T00:00:00');
    if (isNaN(anchor.getTime())) return;

    // 1. Max occurrences count (if endCondition === 'occurrences' or endOccurrences / medication_days / duration_days set)
    const maxOccurrencesCount = Number(
      e.extra_data?.endOccurrences ||
      e.extra_data?.end_occurrences ||
      e.extra_data?.max_occurrences ||
      (repeatRule === 'daily' ? (e.extra_data?.medication_days || e.extra_data?.duration_days || e.extra_data?.medication?.days) : null)
    ) || null;

    // 2. End date (ends_at, extra_data.ends_at, extra_data.endDate, duration_days)
    let maxEndDateStr: string | null = null;
    const rawEndsAt = e.ends_at || e.extra_data?.ends_at || e.extra_data?.endDate;
    if (rawEndsAt) {
      maxEndDateStr = String(rawEndsAt).includes('T') ? String(rawEndsAt).split('T')[0] : String(rawEndsAt);
    }

    const durationDays = Number(
      e.extra_data?.medication_days ||
      e.extra_data?.duration_days ||
      e.extra_data?.medication?.days
    ) || null;
    if (durationDays && durationDays > 0) {
      const calcMaxDate = new Date(anchor);
      calcMaxDate.setDate(anchor.getDate() + (durationDays - 1));
      const calcMaxStr = toDateKey(calcMaxDate);
      if (!maxEndDateStr || calcMaxStr < maxEndDateStr) {
        maxEndDateStr = calcMaxStr;
      }
    }

    // 3. Specific days of week
    const allowedDayIndices = parseSelectedDayIndices(
      e.extra_data?.selected_days || e.extra_data?.days_of_week || e.extra_data?.days
    );

    const interval = Number(e.extra_data?.interval) || 1;
    let totalOccurrencesCount = existingDates.size;

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

    // İleri yönde genişlet
    const nextDate = (current: Date): Date | null => {
      const d = new Date(current);
      if (repeatRule === 'weekly' && allowedDayIndices) {
        d.setDate(d.getDate() + 1);
        return d;
      }
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

    // İleri: anchor (seriesStartAt) → rangeEnd
    let cursor: Date | null = new Date(anchor);
    let guard = 0;
    while (cursor && guard < 1000) {
      const ds = toDateKey(cursor);
      if (ds > rangeEndStr) break;
      if (maxEndDateStr && ds > maxEndDateStr) break;
      if (maxOccurrencesCount && totalOccurrencesCount >= maxOccurrencesCount) break;

      if (ds >= rangeStartStr && ds >= seriesStartStr) {
        if (!allowedDayIndices || allowedDayIndices.has(cursor.getDay())) {
          if (!existingDates.has(ds)) {
            addVirtual(ds);
            totalOccurrencesCount++;
          }
        }
      }
      cursor = nextDate(cursor);
      guard++;
    }
  });

  return [...events, ...virtualEvents].sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );
}
