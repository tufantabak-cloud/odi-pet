import { describe, it, expect } from 'vitest';
import { expandRecurringForTimeline, toDateKey } from '../recurring-events';

describe('ADIM 6 — İlaç ve Plan Başlangıç Sınırı (seriesStartAt) Testleri', () => {
  const getTodayStr = () => toDateKey(new Date());

  it('1. Bugün başlayan günlük ilaç → Geçmiş günlerde (18-22 Temmuz vb.) sanal kart yok', () => {
    const todayStr = getTodayStr();
    const event = {
      id: 'plan_med_today',
      category: 'ilac',
      title: 'Günlük İlaç',
      due_date: todayStr,
      scheduled_at: `${todayStr}T12:00:00Z`,
      repeat_rule: 'daily',
      extra_data: { series_start_at: todayStr, interval: 1 }
    };

    const expanded = expandRecurringForTimeline([event], -10, 10);
    const pastEvents = expanded.filter(e => e.due_date < todayStr);
    expect(pastEvents.length).toBe(0);
  });

  it('2. Yarın başlayan ilaç → Bugün ve geçmiş günlerde kart yok', () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = toDateKey(tomorrow);
    const todayStr = getTodayStr();

    const event = {
      id: 'plan_med_tomorrow',
      category: 'ilac',
      title: 'Gelecek İlaç',
      due_date: tomorrowStr,
      scheduled_at: `${tomorrowStr}T12:00:00Z`,
      repeat_rule: 'daily',
      extra_data: { series_start_at: tomorrowStr, interval: 1 }
    };

    const expanded = expandRecurringForTimeline([event], -10, 10);
    const todayOrPastEvents = expanded.filter(e => e.due_date <= todayStr);
    expect(todayOrPastEvents.length).toBe(0);
  });

  it('3. Dün başlayan ilaç → Yalnız dün için geçmiş kart var (daha eski yok)', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = toDateKey(yesterday);

    const event = {
      id: 'plan_med_yesterday',
      category: 'ilac',
      title: 'Dün Başlayan İlaç',
      due_date: yesterdayStr,
      scheduled_at: `${yesterdayStr}T12:00:00Z`,
      repeat_rule: 'daily',
      extra_data: { series_start_at: yesterdayStr, interval: 1 }
    };

    const expanded = expandRecurringForTimeline([event], -10, 10);
    const beforeYesterday = expanded.filter(e => e.due_date < yesterdayStr);
    expect(beforeYesterday.length).toBe(0);
    expect(expanded.some(e => e.due_date === yesterdayStr)).toBe(true);
  });

  it('4. Saat 12:00’de başlayan plan → Aynı gün sabah için ekstra kart yok', () => {
    const todayStr = getTodayStr();
    const event = {
      id: 'plan_med_noon',
      category: 'ilac',
      title: 'Öğle İlacı',
      due_date: todayStr,
      scheduled_at: `${todayStr}T12:00:00Z`,
      repeat_rule: 'daily',
      extra_data: { series_start_at: todayStr, interval: 1 }
    };

    const expanded = expandRecurringForTimeline([event], -5, 5);
    const todayEvents = expanded.filter(e => e.due_date === todayStr);
    expect(todayEvents.length).toBe(1);
  });

  it('5. Başlangıç tarihi ileri taşınınca eski sanal kartlar yok olur, gerçek completed kayıt saklanır', () => {
    const todayStr = getTodayStr();
    const pastDoneRecord = {
      id: 'real_completed_rec',
      category: 'ilac',
      title: 'İlaç',
      due_date: '2026-07-15',
      status: 'done',
      repeat_rule: 'none'
    };

    const movedPlan = {
      id: 'plan_med_moved',
      category: 'ilac',
      title: 'İlaç',
      due_date: todayStr,
      scheduled_at: `${todayStr}T12:00:00Z`,
      repeat_rule: 'daily',
      extra_data: { series_start_at: todayStr, interval: 1 }
    };

    const expanded = expandRecurringForTimeline([pastDoneRecord, movedPlan], -15, 10);
    const July15Events = expanded.filter(e => e.due_date === '2026-07-15');
    expect(July15Events.length).toBe(1);
    expect(July15Events[0].status).toBe('done');

    const phantomPast = expanded.filter(e => e.due_date > '2026-07-15' && e.due_date < todayStr);
    expect(phantomPast.length).toBe(0);
  });

  it('6. Haftalık ilaç başlangıç sınırı korunur', () => {
    const todayStr = getTodayStr();
    const event = {
      id: 'plan_med_weekly',
      category: 'ilac',
      title: 'Haftalık İlaç',
      due_date: todayStr,
      scheduled_at: `${todayStr}T12:00:00Z`,
      repeat_rule: 'weekly',
      extra_data: { series_start_at: todayStr, interval: 1 }
    };

    const expanded = expandRecurringForTimeline([event], -30, 30);
    const pastEvents = expanded.filter(e => e.due_date < todayStr);
    expect(pastEvents.length).toBe(0);
  });

  it('7. Aşı / Parazit Timeline regresyonu yok', () => {
    const todayStr = getTodayStr();
    const vaxEvent = {
      id: 'plan_vax_yearly',
      category: 'asi',
      title: 'Kuduz Aşısı',
      due_date: todayStr,
      scheduled_at: `${todayStr}T10:00:00Z`,
      repeat_rule: 'yearly',
      extra_data: { series_start_at: todayStr, interval: 1 }
    };

    const expanded = expandRecurringForTimeline([vaxEvent], -365, 400);
    expect(expanded.some(e => e.due_date === todayStr)).toBe(true);
    expect(expanded.filter(e => e.due_date < todayStr).length).toBe(0);
  });
});
