import { useState, useEffect, useCallback, useMemo } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { PetCareEvent, ComputedEvent, ComputedStatus, CategoryGroup, TaskRow } from './types';

/** Frekans gün sayısından okunabilir Türkçe etiket üret */
function formatFrequency(days: number, label?: string | null): string {
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

/** Kategori meta bilgisi */
const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  care:       { label: 'Bakım takibi',  icon: '♡' },
  health:     { label: 'Sağlık takibi', icon: '🛡' },
  medication: { label: 'İlaç takibi',   icon: '💊' },
};

function computeEventStatus(event: PetCareEvent): ComputedStatus {
  if (event.completed_at) return 'done';

  const now = new Date();
  const scheduled = new Date(event.scheduled_at);

  // Takvim günü bazlı fark
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const scheduledDate = new Date(scheduled.getFullYear(), scheduled.getMonth(), scheduled.getDate());
  const diffDays = Math.round((scheduledDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'missed';
  if (diffDays === 0) return 'today';
  if (diffDays <= 3) return 'upcoming';
  return 'future';
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

      const { data, error } = await supabase
        .from('pet_care_events')
        .select('*, pet_care_tasks(*)')
        .eq('pet_id', petId)
        .gte('scheduled_at', past30.toISOString())
        .lte('scheduled_at', future90.toISOString())
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      const computed = (data as unknown as PetCareEvent[]).map(ev => ({
        ...ev,
        computedStatus: computeEventStatus(ev),
      }));
      setEvents(computed);
    } catch (err) {
      console.error('Error fetching health tracker events:', err);
    } finally {
      setLoading(false);
    }
  }, [petId, supabase]);

  useEffect(() => {
    fetchEvents();

    const channel = supabase
      .channel('pet_care_events_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pet_care_events', filter: `pet_id=eq.${petId}` },
        () => { fetchEvents(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchEvents, petId, supabase]);

  /** Event'leri task bazında grupla, ardından kategoriye göre CategoryGroup[] döndür */
  const categoryGroups: CategoryGroup[] = useMemo(() => {
    // 1) Task bazında grupla
    const taskMap = new Map<string, TaskRow>();

    events.forEach(event => {
      const taskId = event.task_id;
      const task = event.pet_care_tasks;
      if (!task) return;

      if (!taskMap.has(taskId)) {
        taskMap.set(taskId, { task, events: [] });
      }
      taskMap.get(taskId)!.events.push(event);
    });

    // 2) Kategoriye göre grupla
    const catMap = new Map<string, CategoryGroup>();

    taskMap.forEach(taskRow => {
      const cat = taskRow.task.category || 'care';
      const meta = CATEGORY_META[cat] || { label: cat, icon: '📋' };

      if (!catMap.has(cat)) {
        catMap.set(cat, { category: cat, label: meta.label, icon: meta.icon, taskRows: [] });
      }
      catMap.get(cat)!.taskRows.push(taskRow);
    });

    // 3) Sabit sıralama: care → health → medication → diğer
    const order = ['care', 'health', 'medication'];
    return Array.from(catMap.values()).sort((a, b) => {
      const ia = order.indexOf(a.category);
      const ib = order.indexOf(b.category);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }, [events]);

  const markEventStatus = async (eventId: string, newStatus: string) => {
    try {
      const updatePayload: Record<string, string> = { status: newStatus };
      if (newStatus === 'done') {
        updatePayload.completed_at = new Date().toISOString();
      }
      const { error } = await supabase.from('pet_care_events').update(updatePayload).eq('id', eventId);
      if (error) throw error;
    } catch (err) {
      console.error('Error updating event status:', err);
    }
  };

  const postponeEvent = async (eventId: string, days: number = 1) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;
      const newDate = new Date(event.scheduled_at);
      newDate.setDate(newDate.getDate() + days);
      const { error } = await supabase.from('pet_care_events').update({ scheduled_at: newDate.toISOString() }).eq('id', eventId);
      if (error) throw error;
    } catch (err) {
      console.error('Error postponing event:', err);
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase.from('pet_care_events').delete().eq('id', eventId);
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
