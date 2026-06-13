import { useState, useEffect, useCallback, useMemo } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { ComputedStatus, CategoryGroup, TaskRow, PetCareTask, PetCareEvent, ComputedEvent } from './types';

/** Frekans gün sayısından okunabilir Türkçe etiket üret */
export function formatFrequency(days: number, label?: string | null): string {
  if (label) return label;
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

/** DB category → UI kategori eşleştirmesi (PetDetailClient'taki TAB_CATEGORY_MAP'in tersi) */
const DB_CATEGORY_TO_UI: Record<string, { category: string; label: string; icon: string; order: number }> = {
  'Saglik':       { category: 'Saglik',       label: 'Sağlık takibi',    icon: '❤️',  order: 0 },
  'Medikal':      { category: 'Medikal',      label: 'Aşı & Parazit',   icon: '🛡',  order: 1 },
  'Bakım':        { category: 'Bakım',        label: 'Bakım takibi',     icon: '♡',   order: 2 },
  'Beslenme':     { category: 'Beslenme',     label: 'Beslenme takibi',  icon: '🍽',  order: 3 },
  'Hijyen':       { category: 'Hijyen',       label: 'Hijyen takibi',    icon: '🧹',  order: 4 },
  'Aktiviteler':  { category: 'Aktiviteler',  label: 'Aktivite takibi',  icon: '🦴',  order: 5 },
  'Veteriner':    { category: 'Veteriner',    label: 'Veteriner takibi', icon: '🏥',  order: 6 },
  'Diger':        { category: 'Diger',        label: 'Diğer görevler',   icon: '📋',  order: 7 },
};

/** health_schedules kaydından status hesapla */
function computeStatus(schedule: any): ComputedStatus {
  if (schedule.status === 'done' || schedule.status === 'completed') return 'done';

  const now = new Date();
  const dueDate = new Date(schedule.due_date);
  
  // Takvim günü bazlı fark
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
    id: s.id,
    task_id: s.plan_id || s.id, // plan_id varsa aynı plan altında grupla, yoksa kendi başına
    pet_id: s.pet_id,
    scheduled_at: s.due_date + (s.due_time ? `T${s.due_time}` : 'T12:00:00'),
    completed_at: s.status === 'done' ? (s.created_at || new Date().toISOString()) : null,
    status: s.status || 'scheduled',
    notes: s.notes,
    created_at: s.created_at,
    pet_care_tasks: {
      id: s.plan_id || s.id,
      pet_id: s.pet_id,
      title: s.title || s.plan_type || 'Görev',
      category: s.category || 'Diger',
      frequency_days: 0,
      frequency_label: s.sub_category || null,
    },
    computedStatus,
  };
}

export function useHealthTracker(petId: string) {
  const [events, setEvents] = useState<ComputedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserSupabaseClient();

  const fetchEvents = useCallback(async () => {
    if (!petId) return;
    try {
      setLoading(true);

      const now = new Date();
      const past30 = new Date();
      past30.setDate(now.getDate() - 30);
      const future90 = new Date();
      future90.setDate(now.getDate() + 90);

      // health_schedules tablosundan oku — uygulamanın ana veri kaynağı
      const { data, error } = await supabase
        .from('health_schedules')
        .select('*')
        .eq('pet_id', petId)
        .gte('due_date', past30.toISOString().split('T')[0])
        .lte('due_date', future90.toISOString().split('T')[0])
        .order('due_date', { ascending: true });

      if (error) throw error;

      const computed = (data || []).map(toComputedEvent);
      setEvents(computed);
    } catch (err) {
      console.error('Error fetching health tracker events:', err);
    } finally {
      setLoading(false);
    }
  }, [petId, supabase]);

  useEffect(() => {
    fetchEvents();

    // health_schedules tablosundaki değişiklikleri dinle
    const channel = supabase
      .channel('health_schedules_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'health_schedules', filter: `pet_id=eq.${petId}` },
        () => { fetchEvents(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchEvents, petId, supabase]);

  /** Event'leri title bazında grupla, ardından kategoriye göre CategoryGroup[] döndür */
  const categoryGroups: CategoryGroup[] = useMemo(() => {
    // 1) Title bazında grupla (aynı isimli görevler bir satıra)
    const taskMap = new Map<string, TaskRow>();

    events.forEach(event => {
      const task = event.pet_care_tasks;
      if (!task) return;

      // Aynı başlıktaki görevleri grupla
      const groupKey = `${task.category}::${task.title}`;

      if (!taskMap.has(groupKey)) {
        taskMap.set(groupKey, { task, events: [] });
      }
      taskMap.get(groupKey)!.events.push(event);
    });

    // 2) Kategoriye göre grupla
    const catMap = new Map<string, CategoryGroup>();

    taskMap.forEach(taskRow => {
      const cat = taskRow.task.category || 'Diger';
      const meta = DB_CATEGORY_TO_UI[cat] || { category: cat, label: cat, icon: '📋', order: 99 };

      if (!catMap.has(cat)) {
        catMap.set(cat, { category: cat, label: meta.label, icon: meta.icon, taskRows: [] });
      }
      catMap.get(cat)!.taskRows.push(taskRow);
    });

    // 3) Sabit sıralama
    return Array.from(catMap.values()).sort((a, b) => {
      const ma = DB_CATEGORY_TO_UI[a.category];
      const mb = DB_CATEGORY_TO_UI[b.category];
      return (ma?.order ?? 99) - (mb?.order ?? 99);
    });
  }, [events]);

  const markEventStatus = async (eventId: string, newStatus: string) => {
    try {
      const updatePayload: Record<string, string> = { status: newStatus };
      const { error } = await supabase.from('health_schedules').update(updatePayload).eq('id', eventId);
      if (error) throw error;
    } catch (err) {
      console.error('Error updating event status:', err);
    }
  };

  const postponeEvent = async (eventId: string, days: number = 1) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;
      const oldDate = new Date(event.scheduled_at);
      oldDate.setDate(oldDate.getDate() + days);
      const newDueDate = oldDate.toISOString().split('T')[0];
      const { error } = await supabase.from('health_schedules').update({ due_date: newDueDate }).eq('id', eventId);
      if (error) throw error;
    } catch (err) {
      console.error('Error postponing event:', err);
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase.from('health_schedules').delete().eq('id', eventId);
      if (error) throw error;
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
