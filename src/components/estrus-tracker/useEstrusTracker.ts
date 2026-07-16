'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Database } from '@/lib/database.types';

export type EstrusCycle = Database['public']['Tables']['pet_estrus_cycles']['Row'];

export function useEstrusTracker(petId: string | undefined) {
  const [cycles, setCycles] = useState<EstrusCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createBrowserSupabaseClient();

  const fetchCycles = useCallback(async () => {
    if (!petId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pet_estrus_cycles')
        .select('*')
        .eq('pet_id', petId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setCycles(data || []);
    } catch (err: any) {
      console.error('Error fetching estrus cycles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [petId, supabase]);

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  const addCycle = async (cycle: { start_date: string; end_date?: string | null; notes?: string; symptoms?: string[] }) => {
    if (!petId) return null;
    try {
      const res = await fetch(`/api/pets/${petId}/estrus-cycles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cycle)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to add cycle');
      }
      setCycles(prev => [data.data, ...prev].sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()));
      return data.data;
    } catch (err: any) {
      console.error('Error adding cycle:', err);
      throw err;
    }
  };

  const updateCycle = async (id: string, updates: Partial<EstrusCycle>) => {
    try {
      const res = await fetch(`/api/pets/${petId}/estrus-cycles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to update cycle');
      }
      setCycles(prev => prev.map(c => c.id === id ? data.data : c));
      return data.data;
    } catch (err: any) {
      console.error('Error updating cycle:', err);
      throw err;
    }
  };

  const deleteCycle = async (id: string) => {
    try {
      const res = await fetch(`/api/pets/${petId}/estrus-cycles/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to delete cycle');
      }
      setCycles(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      console.error('Error deleting cycle:', err);
      throw err;
    }
  };

  return {
    cycles,
    loading,
    error,
    addCycle,
    updateCycle,
    deleteCycle,
    refresh: fetchCycles
  };
}
