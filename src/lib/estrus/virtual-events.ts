import { calculateReproductiveForecast, ForecastInput } from '@/services/estrus/calculateReproductiveForecast'

// Isomorphic helper for fetching estrus virtual events
export async function fetchEstrusVirtualEvents(supabase: any, pets: any[], fromDate?: Date, toDate?: Date) {
  const candidatePets = pets.filter(p => 
    p && 
    (p.species === 'dog' || p.species === 'Köpek') && 
    (p.gender === 'female' || p.gender === 'Dişi') && 
    !p.is_neutered
  );
  const candidatePetIds = candidatePets.map(p => p.id);
  const events: any[] = [];

  if (candidatePetIds.length > 0) {
    try {
      const [
        { data: cyclesData },
        { data: obsData },
        { data: testsData }
      ] = await Promise.all([
        supabase.from('pet_estrus_cycles').select('id, pet_id, start_date, end_date').in('pet_id', candidatePetIds).order('start_date', { ascending: true }),
        supabase.from('pet_estrus_observations').select('observation_date, symptom_code, cycle_id, pet_estrus_cycles!inner(pet_id)').in('pet_estrus_cycles.pet_id', candidatePetIds),
        supabase.from('pet_reproductive_tests').select('id, sampled_at, cycle_id, pet_estrus_cycles!inner(pet_id)').in('pet_estrus_cycles.pet_id', candidatePetIds)
      ]);

      const cyclesByPet = groupBy(cyclesData, 'pet_id', (item) => item.pet_id || item.pet_estrus_cycles?.pet_id);
      const obsByCycle = groupBy(obsData, 'cycle_id', (item) => item.cycle_id);
      const testsByCycle = groupBy(testsData, 'cycle_id', (item) => item.cycle_id);
      const today = new Date();

      for (const pet of candidatePets) {
        const cycles = cyclesByPet.get(pet.id) || [];
        const inputCycles = cycles.map(c => ({ id: c.id, start_date: c.start_date, end_date: c.end_date }));
        let inputObs: any[] = [];
        let inputTests: any[] = [];
        
        for (const c of inputCycles) {
          inputObs = inputObs.concat(obsByCycle.get(c.id) || []);
          inputTests = inputTests.concat(testsByCycle.get(c.id) || []);
        }

        const input: ForecastInput = {
          pet: { species: 'dog', gender: 'female', is_neutered: false },
          cycles: inputCycles,
          observations: inputObs,
          tests: inputTests
        };

        const forecast = calculateReproductiveForecast(input, today);

        if (forecast.nextHeatWindow?.start && forecast.nextHeatWindow?.end) {
          const forecastStart = new Date(forecast.nextHeatWindow.start);
          const forecastEnd = new Date(forecast.nextHeatWindow.end);
          
          const isInRange = (!fromDate || forecastEnd >= fromDate) && (!toDate || forecastStart <= toDate);
          if (isInRange) {
            const closedCycles = cycles.filter(c => c.end_date).sort((a,b) => new Date(b.end_date!).getTime() - new Date(a.end_date!).getTime());
            const latestClosed = closedCycles[0];
            
            if (latestClosed) {
              events.push({
                id: `virtual_estrus_forecast_${pet.id}_${latestClosed.id}`,
                _source: 'estrus',
                type: 'estrus_forecast',
                plan_type: 'kizginlik',
                title: `${pet.name} — Tahmini kızgınlık dönemi`,
                date: forecast.nextHeatWindow.start, // for backward compatibility
                due_date: forecast.nextHeatWindow.start, // for useHealthTracker compatibility
                due_time: '12:00:00',
                start_date: forecast.nextHeatWindow.start,
                end_date: forecast.nextHeatWindow.end,
                all_day: true,
                is_virtual: true,
                _is_virtual: true, // for useHealthTracker
                readonly: true,
                pet_id: pet.id,
                pet_name: pet.name,
                pet_species: pet.species,
                category: 'Saglik',
                sub_category: 'Kızgınlık',
                status: 'upcoming',
                assignment_status: 'unassigned',
                escalation_level: 'none',
                priority: 'normal',
                assigned_to: null,
                assignee_name: null,
                href: `/owner/pets/${pet.id}?tab=estrus`,
                frequency_days: 0,
                frequency_label: 'Kızgınlık Dönemi'
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('[VirtualEvents] Error generating estrus virtual events:', err);
    }
  }
  return events;
}

function groupBy(data: any[] | null, key: string, idResolver: (item: any) => string) {
  const map = new Map<string, any[]>();
  if (!data) return map;
  for (const item of data) {
    const pId = idResolver(item);
    if (!pId) continue;
    if (!map.has(pId)) map.set(pId, []);
    map.get(pId)!.push(item);
  }
  return map;
}
