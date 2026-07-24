import { describe, it, expect } from 'vitest';
import { expandRecurringForTimeline, toDateKey } from '../recurring-events';

describe('Recurring Events Virtual Occurrence Boundary Rules', () => {
  it('1. Bugün başlayan günlük ilaç → geçmiş kaçırıldı kartı yok', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toDateKey(today);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = toDateKey(yesterday);

    const events = [
      {
        id: 'plan_vermidon_today',
        category: 'saglik',
        title: 'Vermidon',
        due_date: todayStr,
        status: 'upcoming',
        repeat_rule: 'daily',
        extra_data: { interval: 1 }
      }
    ];

    const expanded = expandRecurringForTimeline(events, -10, 10);
    
    // 23 Temmuz / bugün öncesinde hiçbir sanal kart bulunmamalı
    const pastVirtuals = expanded.filter(e => e.due_date < todayStr);
    expect(pastVirtuals.length).toBe(0);

    // Dün için kart olmamalı
    const yesterdayCards = expanded.filter(e => e.due_date === yesterdayStr);
    expect(yesterdayCards.length).toBe(0);
  });

  it('2. Yarın başlayan ilaç → bugün kartı yok', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toDateKey(today);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = toDateKey(tomorrow);

    const events = [
      {
        id: 'plan_vermidon_tomorrow',
        category: 'saglik',
        title: 'Vermidon',
        due_date: tomorrowStr,
        status: 'upcoming',
        repeat_rule: 'daily',
        extra_data: { interval: 1 }
      }
    ];

    const expanded = expandRecurringForTimeline(events, -10, 10);
    
    // Bugüne ait sanal veya gerçek kart bulunmamalı
    const todayCards = expanded.filter(e => e.due_date === todayStr);
    expect(todayCards.length).toBe(0);

    // İlk kart yarın olmalı
    const tomorrowCards = expanded.filter(e => e.due_date === tomorrowStr);
    expect(tomorrowCards.length).toBeGreaterThanOrEqual(1);
  });

  it('3. Dün başlayan ilaç → yalnız dün kaçırıldı', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toDateKey(today);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = toDateKey(yesterday);

    const dayBeforeYesterday = new Date(today);
    dayBeforeYesterday.setDate(today.getDate() - 2);
    const dayBeforeYesterdayStr = toDateKey(dayBeforeYesterday);

    const events = [
      {
        id: 'plan_vermidon_yesterday',
        category: 'saglik',
        title: 'Vermidon',
        due_date: yesterdayStr,
        status: 'upcoming',
        repeat_rule: 'daily',
        extra_data: { interval: 1 }
      }
    ];

    const expanded = expandRecurringForTimeline(events, -10, 10);

    // Dünden önceki gün (2 gün önce) için kart olmamalı
    const dayBeforeCards = expanded.filter(e => e.due_date === dayBeforeYesterdayStr);
    expect(dayBeforeCards.length).toBe(0);

    // Dün için 1 kart olmalı (ana plan kaydı)
    const yesterdayCards = expanded.filter(e => e.due_date === yesterdayStr);
    expect(yesterdayCards.length).toBe(1);

    // Bugün için sanal kart olmalı
    const todayCards = expanded.filter(e => e.due_date === todayStr);
    expect(todayCards.length).toBe(1);
  });

  it('4. Başlangıç tarihi ileri alındığında eski sanal kartlar kaybolur', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toDateKey(today);

    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 5);
    const futureDateStr = toDateKey(futureDate);

    // Başlangıç tarihi ertelenmiş yeni plan (due_date futureDateStr yapıldı)
    const events = [
      {
        id: 'plan_vermidon_rescheduled',
        category: 'saglik',
        title: 'Vermidon',
        due_date: futureDateStr,
        status: 'upcoming',
        repeat_rule: 'daily',
        extra_data: { interval: 1 }
      }
    ];

    const expanded = expandRecurringForTimeline(events, -10, 10);

    // İleri tarihten önceki (bugün dahil) hiçbir sanal kart görüntülenmemeli
    const cardsBeforeNewStart = expanded.filter(e => e.due_date < futureDateStr);
    expect(cardsBeforeNewStart.length).toBe(0);
  });

  it('5. Gerçek tamamlanmış tarihsel kayıt korunur', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toDateKey(today);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = toDateKey(yesterday);

    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 5);
    const futureDateStr = toDateKey(futureDate);

    // Geçmişte tamamlanmış gerçek DB kaydı + İleri tarihe taşınmış ana plan
    const events = [
      {
        id: 'child_completed_yesterday',
        category: 'saglik',
        title: 'Vermidon',
        due_date: yesterdayStr,
        status: 'done',
        repeat_rule: null,
        parent_plan_id: 'plan_vermidon_main'
      },
      {
        id: 'plan_vermidon_main',
        category: 'saglik',
        title: 'Vermidon',
        due_date: futureDateStr,
        status: 'upcoming',
        repeat_rule: 'daily',
        extra_data: { interval: 1 }
      }
    ];

    const expanded = expandRecurringForTimeline(events, -10, 10);

    // Gerçekleşmiş dünkü completed kayıt aynen durmalı
    const completedYesterday = expanded.find(e => e.id === 'child_completed_yesterday');
    expect(completedYesterday).toBeDefined();
    expect(completedYesterday.status).toBe('done');

    // Ancak tamamlanmış olan dün ile yeni başlangıç arasındaki boş günlerde sanal event olmamalı
    const virtualsBetween = expanded.filter(e => e._is_virtual && e.due_date > yesterdayStr && e.due_date < futureDateStr);
    expect(virtualsBetween.length).toBe(0);
  });

  it('6. endOccurrences = 5 seçildiğinde tam olarak 5 occurrence üretilir (fazla/eksik yok)', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toDateKey(today);

    const events = [
      {
        id: 'plan_occurrences_limit',
        category: 'bakim',
        title: 'Tüy Bakımı',
        due_date: todayStr,
        status: 'upcoming',
        repeat_rule: 'daily',
        extra_data: { interval: 1, endCondition: 'occurrences', endOccurrences: 5 }
      }
    ];

    const expanded = expandRecurringForTimeline(events, -10, 30);
    expect(expanded.length).toBe(5);
  });

  it('7. medication_days / duration_days = 7 seçildiğinde tam olarak 7 gün üretilir', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toDateKey(today);

    const events = [
      {
        id: 'plan_med_duration',
        category: 'saglik',
        title: 'Antibiyotik',
        due_date: todayStr,
        status: 'upcoming',
        repeat_rule: 'daily',
        extra_data: { interval: 1, medication_days: 7 }
      }
    ];

    const expanded = expandRecurringForTimeline(events, -10, 30);
    expect(expanded.length).toBe(7);
  });

  it('8. ends_at seçildiğinde bitiş tarihinden sonra occurrence üretilmez', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toDateKey(today);

    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 4);
    const endDateStr = toDateKey(endDate);

    const events = [
      {
        id: 'plan_ends_at_limit',
        category: 'beslenme',
        title: 'Özel Diyet',
        due_date: todayStr,
        ends_at: endDateStr + 'T23:59:59.000Z',
        status: 'upcoming',
        repeat_rule: 'daily',
        extra_data: { interval: 1 }
      }
    ];

    const expanded = expandRecurringForTimeline(events, -10, 30);
    const afterEndDate = expanded.filter(e => e.due_date > endDateStr);
    expect(afterEndDate.length).toBe(0);
    expect(expanded.length).toBe(5); // 0, 1, 2, 3, 4 gün sonra = 5 gün
  });

  it('9. Özel gün seçimi (selected_days) yapıldığında yalnızca o günlerde occurrence üretilir', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toDateKey(today);

    // Haftalık Pazartesi ve Cuma seçimi
    const events = [
      {
        id: 'plan_selected_days',
        category: 'aktivite',
        title: 'Eğitim Seansı',
        due_date: todayStr,
        status: 'upcoming',
        repeat_rule: 'weekly',
        extra_data: { interval: 1, selected_days: ['Pazartesi', 'Cuma'], endOccurrences: 4 }
      }
    ];

    const expanded = expandRecurringForTimeline(events, -10, 60);
    expect(expanded.length).toBeLessThanOrEqual(4);

    // Üretilen tüm kartların günleri 1 (Mon) veya 5 (Fri) olmalı (anchor ilk başlangıç hariç)
    expanded.forEach(e => {
      if (e._is_virtual) {
        const d = new Date(e.due_date + 'T00:00:00');
        const dayIdx = d.getDay();
        expect([1, 5]).toContain(dayIdx);
      }
    });
  });
});
