import { createServerSupabaseClient } from '@/lib/supabase/server';
import { calculateReproductiveForecast, ForecastInput } from './calculateReproductiveForecast';

export type ReproductiveForecast = {
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

  calculationMethod:
    | 'insufficient_data'
    | 'active_cycle_tracking'
    | 'single_historical_interval'
    | 'historical_interval_range'
    | 'product_estimation_heuristic'
    | 'cat_behavioral_tracking';

  evidenceSources: string[];

  advisories: Array<{
    code: string;
    message: string;
  }>;

  disclaimerCode:
    | 'INSUFFICIENT_DATA'
    | 'ESTIMATION_ONLY'
    | 'OWNER_OBSERVATION_ONLY'
    | 'UNVERIFIED_TEST_DATA'
    | 'VETERINARY_CONFIRMATION_RECOMMENDED';
};

export async function generateReproductiveForecastWithDate(
  petId: string, 
  supabase: any,
  today: Date = new Date()
): Promise<ReproductiveForecast> {
  const { data: pet } = await supabase.from('pets').select('species, gender, is_neutered').eq('id', petId).single();
  if (!pet) {
    return calculateReproductiveForecast({ pet: null as any, cycles: [], observations: [], tests: [] }, today);
  }

  const { data: cycles } = await supabase.from('pet_estrus_cycles').select('id, start_date, end_date').eq('pet_id', petId).order('start_date', { ascending: true });
  
  let observations: any[] = [];
  let tests: any[] = [];
  
  const allCycles = cycles || [];
  let activeCycleId = null;
  for (const c of allCycles) {
    if (!c.end_date && new Date(c.start_date) <= today) {
      activeCycleId = c.id;
      break;
    }
  }

  if (activeCycleId) {
    const { data: obs } = await supabase.from('pet_estrus_observations')
      .select('observation_date, symptom_code, cycle_id')
      .eq('cycle_id', activeCycleId)
      .order('observation_date', { ascending: true });
    observations = (obs || []).map((o: any) => ({ ...o, cycle_id: o.cycle_id || activeCycleId }));

    const { data: tsts } = await supabase.from('pet_reproductive_tests')
      .select('id, sampled_at, cycle_id')
      .eq('cycle_id', activeCycleId);
    tests = (tsts || []).map((t: any) => ({ ...t, cycle_id: t.cycle_id || activeCycleId }));
  }

  const input: ForecastInput = {
    pet,
    cycles: allCycles,
    observations,
    tests
  };

  return calculateReproductiveForecast(input, today);
}

export async function generateReproductiveForecast(petId: string): Promise<ReproductiveForecast> {
  const supabase = await createServerSupabaseClient();
  return generateReproductiveForecastWithDate(petId, supabase);
}
