import { useState, useEffect, useCallback } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { PetCareEvent, ComputedEvent, ComputedStatus } from './types';

function computeEventStatus(event: PetCareEvent): ComputedStatus {
  if (event.completed_at) return 'done';
  
  const now = new Date();
  const scheduled = new Date(event.scheduled_at);
  const diffMs = scheduled.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) return 'missed';
  if (diffHours >= 0 && diffHours <= 2) return 'warning';
  
  // upcoming: today included next 3 days. We can check if diffDays <= 3 and diffDays >= 0
  if (diffDays >= 0 && diffDays <= 3) return 'upcoming';

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
        computedStatus: computeEventStatus(ev)
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
        () => {
          fetchEvents(); // refetch to get joined tasks data easily
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEvents, petId, supabase]);

  const markEventStatus = async (eventId: string, newStatus: string) => {
    try {
      const updatePayload: any = { status: newStatus };
      if (newStatus === 'done') {
        updatePayload.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('pet_care_events')
        .update(updatePayload)
        .eq('id', eventId);

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

      const { error } = await supabase
        .from('pet_care_events')
        .update({ scheduled_at: newDate.toISOString() })
        .eq('id', eventId);

      if (error) throw error;
    } catch (err) {
      console.error('Error postponing event:', err);
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('pet_care_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  return {
    events,
    loading,
    refetch: fetchEvents,
    markEventStatus,
    postponeEvent,
    deleteEvent
  };
}
