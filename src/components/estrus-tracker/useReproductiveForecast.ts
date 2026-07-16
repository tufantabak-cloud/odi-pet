import { useState, useEffect, useCallback } from 'react';

export type ReproductiveForecastData = {
  species: 'dog' | 'cat';
  generatedAt: string;
  activeCycle: {
    cycleId: string | null;
    cycleDay: number | null;
    state:
      | 'no_active_cycle'
      | 'active_observation_period'
      | 'test_supported_monitoring'
      | 'cycle_ended'
      | 'insufficient_data';
  };
  nextHeatWindow: {
    start: string | null;
    end: string | null;
  } | null;
  behavioralObservationWindow: {
    start: string | null;
    end: string | null;
    observedSigns: string[];
  } | null;
  reproductiveWindow: {
    start: null;
    end: null;
    label: 'not_available';
  };
  confidence: {
    nextHeat: 'none' | 'low' | 'medium';
    behavioralObservation: 'none' | 'low' | 'medium';
    reproductiveWindow: 'none';
  };
  calculationMethod: string;
  evidenceSources: string[];
  advisories: Array<{ code: string; message: string }>;
  disclaimerCode: string;
};

export function useReproductiveForecast(petId: string) {
  const [forecast, setForecast] = useState<ReproductiveForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = useCallback(async () => {
    if (!petId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pets/${petId}/reproductive-forecast`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'NETWORK_ERROR');
      setForecast(data.data);
    } catch (err: any) {
      console.error('Error fetching forecast:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [petId]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  return { forecast, loading, error, refetch: fetchForecast };
}
