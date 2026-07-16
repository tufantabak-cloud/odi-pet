import { useState, useEffect, useCallback } from 'react';

export type EstrusObservation = {
  id: string;
  pet_id: string;
  cycle_id: string;
  observation_date: string;
  symptom_code: string;
  severity: number;
  notes: string | null;
  source: string;
  created_at: string;
};

export type ReproductiveTest = {
  id: string;
  pet_id: string;
  cycle_id: string;
  test_type: 'progesterone' | 'vaginal_cytology';
  sampled_at: string;
  progesterone_value: number | null;
  progesterone_unit: string | null;
  cytology_superficial_percent: number | null;
  cytology_result: string | null;
  veterinarian_name: string | null;
  clinic_name: string | null;
  laboratory_name?: string | null;
  assay_method?: string | null;
  analyzer_name?: string | null;
  reference_range?: string | null;
  sample_identifier?: string | null;
  document_storage_path: string | null;
  verification_status: 'unverified' | 'document_attached' | 'verified' | 'rejected';
  created_at: string;
};

export function useEstrusDetails(petId: string, cycleId: string) {
  const [observations, setObservations] = useState<EstrusObservation[]>([]);
  const [tests, setTests] = useState<ReproductiveTest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDetails = useCallback(async () => {
    if (!petId || !cycleId) return;
    setLoading(true);
    try {
      const [obsRes, testsRes] = await Promise.all([
        fetch(`/api/pets/${petId}/estrus-cycles/${cycleId}/observations`),
        fetch(`/api/pets/${petId}/estrus-cycles/${cycleId}/reproductive-tests`)
      ]);
      
      const obsData = await obsRes.json();
      const testsData = await testsRes.json();
      
      if (obsRes.ok) setObservations(obsData.data || []);
      if (testsRes.ok) setTests(testsData.data || []);
    } catch (err) {
      console.error('Error fetching estrus details:', err);
    } finally {
      setLoading(false);
    }
  }, [petId, cycleId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const addObservation = async (obs: Partial<EstrusObservation>) => {
    const res = await fetch(`/api/pets/${petId}/estrus-cycles/${cycleId}/observations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(obs)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'NETWORK_ERROR');
    setObservations(prev => [data.data, ...prev].sort((a, b) => new Date(b.observation_date).getTime() - new Date(a.observation_date).getTime()));
    return data.data;
  };

  const updateObservation = async (id: string, updates: Partial<EstrusObservation>) => {
    const res = await fetch(`/api/pets/${petId}/estrus-cycles/${cycleId}/observations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'NETWORK_ERROR');
    setObservations(prev => prev.map(o => o.id === id ? data.data : o));
    return data.data;
  };

  const deleteObservation = async (id: string) => {
    const res = await fetch(`/api/pets/${petId}/estrus-cycles/${cycleId}/observations/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'NETWORK_ERROR');
    setObservations(prev => prev.filter(o => o.id !== id));
  };

  const addTest = async (test: Partial<ReproductiveTest>) => {
    const res = await fetch(`/api/pets/${petId}/estrus-cycles/${cycleId}/reproductive-tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(test)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'NETWORK_ERROR');
    setTests(prev => [data.data, ...prev].sort((a, b) => new Date(b.sampled_at).getTime() - new Date(a.sampled_at).getTime()));
    return data.data;
  };

  const updateTest = async (id: string, updates: Partial<ReproductiveTest>) => {
    const res = await fetch(`/api/pets/${petId}/estrus-cycles/${cycleId}/reproductive-tests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'NETWORK_ERROR');
    setTests(prev => prev.map(t => t.id === id ? data.data : t));
    return data.data;
  };

  const deleteTest = async (id: string) => {
    const res = await fetch(`/api/pets/${petId}/estrus-cycles/${cycleId}/reproductive-tests/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'NETWORK_ERROR');
    setTests(prev => prev.filter(t => t.id !== id));
  };

  return { observations, tests, loading, addObservation, updateObservation, deleteObservation, addTest, updateTest, deleteTest };
}
