import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { CategoryGroup, ComputedEvent } from './types';
import { getPlanDisplayTitle } from '@/lib/plans/utils';
import {
  VaccineTemplateEntry,
  VaccineTemplateMap,
  mandatoryLevelToGroup,
} from './lib/vaccine-templates';
import { formatFrequency, toComputedEvent } from './lib/normalize-events';
import {
  TIMELINE_VISIBLE_PAST_DAYS,
  TIMELINE_VISIBLE_FUTURE_DAYS,
  TIMELINE_VISIBLE_DAY_COUNT,
  toDateKey,
  expandRecurringForTimeline,
} from './lib/recurring-events';
import { buildCategoryGroups } from './lib/group-events';
import { fetchEstrusVirtualEvents } from '@/lib/estrus/virtual-events';

// Grid bileşenlerinin kullandığı ortak sabit ve yardımcılar tek noktadan
export {
  TIMELINE_VISIBLE_PAST_DAYS,
  TIMELINE_VISIBLE_FUTURE_DAYS,
  TIMELINE_VISIBLE_DAY_COUNT,
  toDateKey,
  formatFrequency,
};

export function useHealthTracker(petId: string, refreshTrigger?: number) {
  // Ham (genişletilmemiş) birleşik event listesi — DB'den geldiği hali
  const [rawEvents, setRawEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserSupabaseClient();

  // ── Görünür tarih aralığı ────────────────────────────────────────────────
  // Sabit ve geniş bir pencere: her görev satırı bu ortak tarih dizisi içinde
  // kendi başına (bağımsız) sürüklenip gezinebilir — pencere kaydırma yok,
  // her satır kendi scroll konumunu tutar.
  const rangeStartOffset = -TIMELINE_VISIBLE_PAST_DAYS;
  const rangeEndOffset = TIMELINE_VISIBLE_FUTURE_DAYS;

  /** Tarih dizisi — tüm satırların sürüklenebileceği ortak (ama bağımsız kaydırılan) kaynak */
  const visibleDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: TIMELINE_VISIBLE_DAY_COUNT }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + rangeStartOffset + i);
      return d;
    });
  }, []);

  const events: ComputedEvent[] = useMemo(() => {
    const expanded = expandRecurringForTimeline(rawEvents, rangeStartOffset, rangeEndOffset);
    return expanded.map(toComputedEvent);
  }, [rawEvents]);

  /**
   * vaccine_protocols tablosundan yüklenen lookup map.
   * Key: vaccine_code (BÜYÜK HARF) veya protocol_name (küçük harf normalize)
   * Value: 'core' | 'optional'
   */
  const [vaccineTemplateMap, setVaccineTemplateMap] = useState<VaccineTemplateMap>(new Map());

  // ── vaccine_protocols'i yükle (species filtresi yok — en kapsamlı) ──
  useEffect(() => {
    async function loadTemplates() {
      try {
        const { data, error } = await supabase
          .from('vaccine_protocols')
          .select('vaccine_code, protocol_name, is_core, repeat_interval_days, repeat_frequency')
          .eq('is_active', true);

        if (error) {
          console.error('[useHealthTracker] vaccine_protocols load error:', error);
          return;
        }

        const map = new Map<string, VaccineTemplateEntry>();
        (data || []).forEach((t: any) => {
          const group = mandatoryLevelToGroup(t.is_core === true);
          const entry: VaccineTemplateEntry = {
            group,
            recurrence_days: t.repeat_interval_days ?? null,
            has_annual_booster: t.repeat_frequency === 'yearly',
          };
          // vaccine_code ile kayıt (büyük harf key)
          if (t.vaccine_code) map.set(t.vaccine_code.toUpperCase(), entry);
          // protocol_name ile kayıt (küçük harf key — fuzzy match için)
          if (t.protocol_name) map.set(t.protocol_name.toLocaleLowerCase('tr-TR').trim(), entry);
        });

        setVaccineTemplateMap(map);
      } catch (err) {
        console.error('[useHealthTracker] vaccine_protocols exception:', err);
      }
    }

    loadTemplates();
    // Yalnızca mount'ta çalışsın; supabase instance referansı stabil
  }, []);

  // ── health_schedules events ──────────────────────────────────────────────────
  const fetchEvents = useCallback(async (silent: boolean = false) => {
    if (!petId) return;
    try {
      if (!silent) setLoading(true);

      const now = new Date();
      const pastYear = new Date();
      pastYear.setDate(now.getDate() - 365); // Geçmiş 1 yılı ajandada gösterebilmek için 365 gün yapıldı
      const pastThreeYears = new Date();
      pastThreeYears.setDate(now.getDate() - 1095); // Aşı/koruma geçerlilik sürelerini yakalamak için geçmiş 3 yıl sorgulanır
      const future365 = new Date();
      future365.setDate(now.getDate() + 365);

      const pastYearStr = pastYear.toISOString().split('T')[0];
      const pastThreeYearsStr = pastThreeYears.toISOString().split('T')[0];
      const future365Str = future365.toISOString().split('T')[0];

      const usePlansOnly = process.env.NEXT_PUBLIC_USE_PLANS_ONLY === 'true';

      // vaccines join: is_core + code (template eşleştirme için)
      // vaccines tablosunda alan adı: code (vaccine_code değil)
      const [schedulesRes, plansRes, parasiteRes, petRes] = await Promise.all([
        usePlansOnly ? Promise.resolve({ data: [], error: null }) : supabase
          .from('health_schedules')
          .select('*')
          .eq('pet_id', petId)
          .gte('due_date', pastThreeYearsStr)
          .lte('due_date', future365Str),
        supabase
          .from('plans')
          .select('*')
          .eq('pet_id', petId)
          .gte('scheduled_at', pastThreeYearsStr)
          .lte('scheduled_at', future365Str),
        supabase
          .from('parasite_records')
          .select('*')
          .eq('pet_id', petId)
          .gte('administered_at', pastThreeYearsStr)
          .lte('administered_at', future365Str),
        supabase
          .from('pets')
          .select('id, name, species, gender, is_neutered')
          .eq('id', petId)
          .single()
      ]);

      if (schedulesRes.error) throw schedulesRes.error;
      if (plansRes.error) throw plansRes.error;
      if (parasiteRes.error) throw parasiteRes.error;
      // Note: we don't throw for petRes.error as it's non-critical for backward compatibility
      
      const PLAN_CAT_MAP: Record<string, string> = {
        saglik: 'Saglik', asi: 'Asi', parazit: 'Parazit',
        bakim: 'Bakım', beslenme: 'Beslenme', hijyen: 'Hijyen', aktivite: 'Aktivite'
      };

      const completedPlanIdsInParasiteRecords = new Set(
        (parasiteRes.data || []).map((item: any) => item.plan_id).filter(Boolean)
      );

      const mergedEvents = [
        ...(schedulesRes.data || []),
        ...(plansRes.data || [])
          .filter((p: any) => !(p.category === 'parazit' && p.status === 'completed' && completedPlanIdsInParasiteRecords.has(p.id)))
          .map((p: any) => {
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
            let freqDays = p.extra_data?.frequency_days || 
                           p.extra_data?.product?.duration_days || 
                           p.extra_data?.metadata?.duration_days || 
                           p.extra_data?.protection_duration_days || 
                           0;
            let freqLabel = p.extra_data?.frequency_label || '';

            if (p.repeat_rule) {
              const interval = Number(p.extra_data?.interval) || 1;
              if (p.repeat_rule === 'hour' || p.repeat_rule === 'hourly') {
                freqDays = Number((interval / 24).toFixed(4));
                freqLabel = interval === 1 ? 'Saatlik' : `Her ${interval} saatte bir`;
              } else if (p.repeat_rule === 'daily') {
                freqDays = interval;
                freqLabel = interval === 1 ? 'Her gün' : `Her ${interval} günde bir`;
              } else if (p.repeat_rule === 'weekly') {
                freqDays = interval * 7;
                freqLabel = interval === 1 ? 'Haftalık' : `Her ${interval} haftada bir`;
              } else if (p.repeat_rule === 'monthly') {
                freqDays = interval * 30;
                freqLabel = interval === 1 ? 'Aylık' : `Her ${interval} ayda bir`;
              } else if (p.repeat_rule === 'yearly') {
                freqDays = interval * 365;
                freqLabel = interval === 1 ? 'Yıllık' : `Her ${interval} yılda bir`;
              }
            }

            return {
              id: `plan_${p.id}`,
              _plan_id: p.id,
              _source: 'plans',
              _plan_category: p.category,
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
              repeat_rule: p.repeat_rule || null, // ← expandRecurringForTimeline için gerekli
              extra_data: p.extra_data,
            };
          }),
        ...(parasiteRes.data || []).map((item: any) => {
          const typeLabel = 
            item.parasite_type === 'internal' ? 'İç Parazit' : 
            item.parasite_type === 'external' ? 'Dış Parazit' : 
            item.parasite_type === 'collar' ? 'Parazit Tasması' : 
            'Karma Parazit';
          const productName = item.product_free_text || item.brand_free_text || (
            item.parasite_type === 'internal' ? 'İç Parazit Uygulaması' :
            item.parasite_type === 'external' ? 'Dış Parazit Uygulaması' :
            item.parasite_type === 'collar' ? 'Parazit Tasması' :
            'Karma Parazit Uygulaması'
          );
          return {
            id: `parasite_${item.id}`,
            _plan_id: item.id,
            _source: 'parasite_records',
            pet_id: item.pet_id,
            title: productName,
            due_date: item.administered_at,
            due_time: '12:00:00',
            status: 'done',
            category: 'Asi',
            sub_category: typeLabel,
            vaccines: null,
            notes: item.notes || '',
            updated_at: item.created_at,
            frequency_days: item.protection_duration_days || 30,
            frequency_label: typeLabel,
          };
        })
      ];

      // Inject virtual estrus forecast events
      if (petRes.data) {
        const estrusEvents = await fetchEstrusVirtualEvents(supabase, [petRes.data], pastYear, future365);
        if (estrusEvents && estrusEvents.length > 0) {
          mergedEvents.push(...estrusEvents);
        }
      }

      mergedEvents.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

      // Genişletme ve status hesabı görünür pencereye bağlı memo'da yapılır
      setRawEvents(mergedEvents);
    } catch (err) {
      console.error('Error fetching health tracker events:', err);
    } finally {
      setLoading(false);
    }
  }, [petId, supabase]);

  // Realtime kanallarından gelen ardışık bildirimleri tek bir sessiz
  // yenilemeye indirger; loading skeleton'ı tetiklemez, scroll korunur.
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      fetchEvents(true);
    }, 300);
  }, [fetchEvents]);

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
          () => { scheduleRefresh(); }
        )
        .subscribe();
    }

    const channel2 = supabase
      .channel('plans_changes_tracker')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plans', filter: `pet_id=eq.${petId}` },
        () => { scheduleRefresh(); }
      )
      .subscribe();

    const channel3 = supabase
      .channel('parasite_changes_tracker')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parasite_plan_items', filter: `pet_id=eq.${petId}` },
        () => { scheduleRefresh(); }
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (channel1) supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
      supabase.removeChannel(channel3);
    };
  }, [fetchEvents, scheduleRefresh, petId, supabase, refreshTrigger]);

  // ── Gruplama ─────────────────────────────────────────────────────────────────
  const categoryGroups: CategoryGroup[] = useMemo(
    () => buildCategoryGroups(events, vaccineTemplateMap),
    [events, vaccineTemplateMap]
  );

  // ── Actions ──────────────────────────────────────────────────────────────────
  /**
   * Sanal (DB'de karşılığı olmayan) tekrar event'i mi?
   * virtual_ ID'leri asla /api/plans/{id} endpoint'ine gönderilmemeli.
   */
  const isVirtualEventId = (eventId: string): boolean => {
    if (eventId.toString().startsWith('virtual_')) return true;
    const event = events.find(e => e.id === eventId);
    return event?._is_virtual === true;
  };

  const markEventStatus = async (eventId: string, newStatus: string) => {
    if (isVirtualEventId(eventId)) {
      console.warn('[useHealthTracker] Sanal event API\'ye gönderilemez:', eventId);
      return;
    }
    try {
      // Optimistic güncelleme ham listede yapılır; computedStatus memo'da yeniden hesaplanır
      setRawEvents(prev => prev.map(e =>
        e.id === eventId ? { ...e, status: newStatus === 'done' ? 'done' : newStatus } : e
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
    if (isVirtualEventId(eventId)) {
      console.warn('[useHealthTracker] Sanal event API\'ye gönderilemez:', eventId);
      return;
    }
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
    if (isVirtualEventId(eventId)) {
      console.warn('[useHealthTracker] Sanal event API\'ye gönderilemez:', eventId);
      return;
    }
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
    // Tarih-grid timeline
    visibleDates,
  };
}
