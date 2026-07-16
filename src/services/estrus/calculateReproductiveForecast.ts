import { ReproductiveForecast } from './generateReproductiveForecast';

const PRODUCT_HEURISTIC_MAD_THRESHOLD_DAYS = 30;

export type ForecastInput = {
  pet: { species: string; gender: string; is_neutered: boolean };
  cycles: Array<{ id: string; start_date: string; end_date: string | null }>;
  observations: Array<{ observation_date: string; symptom_code: string; cycle_id: string }>;
  tests: Array<{ id: string; sampled_at: string; cycle_id: string }>;
};

export function calculateReproductiveForecast(
  input: ForecastInput,
  today: Date = new Date()
): ReproductiveForecast {
  const generatedAt = today.toISOString();
  const emptyResult: ReproductiveForecast = {
    species: 'dog',
    generatedAt,
    activeCycle: { cycleId: null, cycleDay: null, state: 'no_active_cycle' },
    nextHeatWindow: null,
    behavioralObservationWindow: null,
    reproductiveWindow: { start: null, end: null, label: 'not_available' },
    confidence: {
      nextHeat: 'none',
      behavioralObservation: 'none',
      reproductiveWindow: 'none'
    },
    calculationMethod: 'insufficient_data',
    evidenceSources: [],
    advisories: [],
    disclaimerCode: 'INSUFFICIENT_DATA'
  };

  const { pet, cycles, observations, tests } = input;
  if (!pet) return emptyResult;

  emptyResult.species = pet.species as 'dog' | 'cat';

  if (pet.gender === 'male') {
    emptyResult.advisories.push({ code: 'MALE_PET', message: 'Erkek petler için kızgınlık tahmini yapılamaz.' });
    return emptyResult;
  }

  if (pet.is_neutered) {
    emptyResult.advisories.push({ code: 'NEUTERED_ESTRUS_SIGNS_VET_REVIEW', message: 'Kısırlaştırılmış petinizde kızgınlık belirtileri gözlemliyorsanız veterinerinize danışın.' });
    return emptyResult;
  }

  if (pet.species !== 'dog' && pet.species !== 'cat') {
    emptyResult.advisories.push({ code: 'UNSUPPORTED_SPECIES', message: 'Yalnızca kedi ve köpekler desteklenmektedir.' });
    return emptyResult;
  }

  const allCycles = cycles || [];

  let activeCycle = null;
  let isFutureStart = false;
  
  for (const c of allCycles) {
    if (!c.end_date) {
      const startDate = new Date(c.start_date);
      if (startDate > today) {
        isFutureStart = true;
      } else {
        activeCycle = c;
      }
      break;
    }
  }

  if (isFutureStart) {
    emptyResult.advisories.push({ code: 'FUTURE_START_DATE', message: 'Aktif döngü başlangıç tarihi gelecekte.' });
    return emptyResult;
  }

  let activeCycleDay = null;
  let cycleState: ReproductiveForecast['activeCycle']['state'] = 'no_active_cycle';
  let behavioralObservationWindow = null;
  let evidenceSources: string[] = [];
  
  if (activeCycle) {
    const startDate = new Date(activeCycle.start_date);
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    activeCycleDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    cycleState = 'active_observation_period';

    const obs = observations.filter(o => o.cycle_id === activeCycle.id);
    if (obs.length > 0) {
      const validObs = obs.filter(o => new Date(String(o.observation_date)) <= today && new Date(String(o.observation_date)) >= startDate);
      if (validObs.length > 0) {
        validObs.sort((a,b) => new Date(String(a.observation_date)).getTime() - new Date(String(b.observation_date)).getTime());
        behavioralObservationWindow = {
          start: validObs[0].observation_date,
          end: validObs[validObs.length - 1].observation_date,
          observedSigns: Array.from(new Set(validObs.map(o => o.symptom_code)))
        };
        evidenceSources.push('owner_observations');
      }
    }

    const tsts = tests.filter(t => t.cycle_id === activeCycle.id);
    if (tsts.length > 0) {
      const validTests = tsts.filter(t => new Date(String(t.sampled_at)) <= today && new Date(String(t.sampled_at)) >= startDate);
      if (validTests.length > 0) {
        cycleState = 'test_supported_monitoring';
        evidenceSources.push('reproductive_tests');
      }
    }
  }

  if (pet.species === 'cat') {
    return {
      species: 'cat',
      generatedAt,
      activeCycle: {
        cycleId: activeCycle ? activeCycle.id : null,
        cycleDay: activeCycleDay,
        state: activeCycle ? cycleState : 'no_active_cycle'
      },
      nextHeatWindow: null,
      behavioralObservationWindow,
      reproductiveWindow: { start: null, end: null, label: 'not_available' },
      confidence: {
        nextHeat: 'none',
        behavioralObservation: activeCycle ? (behavioralObservationWindow ? 'low' : 'none') : 'none',
        reproductiveWindow: 'none'
      },
      calculationMethod: 'cat_behavioral_tracking',
      evidenceSources,
      advisories: [],
      disclaimerCode: activeCycle ? 'OWNER_OBSERVATION_ONLY' : 'INSUFFICIENT_DATA'
    };
  }

  const startDates: string[] = allCycles
    .map(c => String(c.start_date))
    .filter(d => new Date(d) <= today)
    .sort();
  
  const uniqueStartDates: string[] = Array.from(new Set(startDates));

  let confidence: ReproductiveForecast['confidence'] = {
    nextHeat: 'none',
    behavioralObservation: 'none',
    reproductiveWindow: 'none'
  };
  let calculationMethod: ReproductiveForecast['calculationMethod'] = 'insufficient_data';
  let nextHeatWindow = null;
  let disclaimerCode: ReproductiveForecast['disclaimerCode'] = 'INSUFFICIENT_DATA';

  if (uniqueStartDates.length === 0) {
    confidence.nextHeat = 'none';
  } else if (uniqueStartDates.length === 1) {
    confidence.nextHeat = 'none'; 
    calculationMethod = 'insufficient_data';
  } else if (uniqueStartDates.length === 2) {
    confidence.nextHeat = 'low';
    calculationMethod = 'single_historical_interval';
    evidenceSources.push('single_historical_interval');
    disclaimerCode = 'ESTIMATION_ONLY';
  } else if (uniqueStartDates.length === 3) {
    confidence.nextHeat = 'low';
    calculationMethod = 'historical_interval_range';
    evidenceSources.push('historical_intervals');
    disclaimerCode = 'ESTIMATION_ONLY';
    
    const int1 = (new Date(uniqueStartDates[1]).getTime() - new Date(uniqueStartDates[0]).getTime()) / 86400000;
    const int2 = (new Date(uniqueStartDates[2]).getTime() - new Date(uniqueStartDates[1]).getTime()) / 86400000;
    const min = Math.min(int1, int2);
    const max = Math.max(int1, int2);
    
    const lastDate = new Date(uniqueStartDates[2]);
    const nextStart = new Date(lastDate.getTime() + min * 86400000);
    const nextEnd = new Date(lastDate.getTime() + max * 86400000);
    
    nextHeatWindow = {
      start: nextStart.toISOString().split('T')[0],
      end: nextEnd.toISOString().split('T')[0]
    };
  } else {
    confidence.nextHeat = 'medium'; 
    calculationMethod = 'product_estimation_heuristic';
    evidenceSources.push('statistical_intervals');
    disclaimerCode = 'ESTIMATION_ONLY';

    const intervals = [];
    for (let i = 1; i < uniqueStartDates.length; i++) {
      intervals.push((new Date(uniqueStartDates[i]).getTime() - new Date(uniqueStartDates[i-1]).getTime()) / 86400000);
    }
    
    intervals.sort((a, b) => a - b);
    const mid = Math.floor(intervals.length / 2);
    const median = intervals.length % 2 !== 0 ? intervals[mid] : (intervals[mid - 1] + intervals[mid]) / 2;
    
    const mads = intervals.map(v => Math.abs(v - median)).sort((a,b) => a - b);
    const mad = mads.length % 2 !== 0 ? mads[Math.floor(mads.length / 2)] : (mads[Math.floor(mads.length / 2) - 1] + mads[Math.floor(mads.length / 2)]) / 2;
    
    if (mad > PRODUCT_HEURISTIC_MAD_THRESHOLD_DAYS) {
      confidence.nextHeat = 'low';
    }

    const lastDate = new Date(uniqueStartDates[uniqueStartDates.length - 1]);
    
    const windowMin = median - (mad * 1.5);
    const windowMax = median + (mad * 1.5);
    
    const nextStart = new Date(lastDate.getTime() + windowMin * 86400000);
    const nextEnd = new Date(lastDate.getTime() + windowMax * 86400000);

    nextHeatWindow = {
      start: nextStart.toISOString().split('T')[0],
      end: nextEnd.toISOString().split('T')[0]
    };
  }

  if (activeCycle) {
    if (cycleState === 'test_supported_monitoring') {
      confidence.behavioralObservation = 'low'; 
    } else if (cycleState === 'active_observation_period' && behavioralObservationWindow) {
      confidence.behavioralObservation = 'low';
    }
  }

  return {
    species: 'dog',
    generatedAt,
    activeCycle: {
      cycleId: activeCycle ? activeCycle.id : null,
      cycleDay: activeCycleDay,
      state: activeCycle ? cycleState : 'no_active_cycle'
    },
    nextHeatWindow,
    behavioralObservationWindow,
    reproductiveWindow: { start: null, end: null, label: 'not_available' },
    confidence,
    calculationMethod,
    evidenceSources: Array.from(new Set(evidenceSources)),
    advisories: emptyResult.advisories,
    disclaimerCode
  };
}
