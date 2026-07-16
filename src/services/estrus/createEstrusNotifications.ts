import { SupabaseClient } from '@supabase/supabase-js';
import { calculateReproductiveForecast, ForecastInput } from './calculateReproductiveForecast';

const ESTRUS_UPCOMING_LEAD_DAYS = 7; // Bu değer veterinerlik standardı değildir; ürün UX sezgiseli.
const ESTRUS_ACTIVE_REVIEW_DAY = 21; // Bu değer veterinerlik standardı değildir; ürün UX sezgiseli.

export type EstrusNotificationResult = {
  evaluated: number;
  created: number;
  skipped: number;
  errors: number;
};

export async function createEstrusNotifications(
  supabase: SupabaseClient,
  options?: { dryRun?: boolean }
): Promise<EstrusNotificationResult> {
  const result: EstrusNotificationResult = { evaluated: 0, created: 0, skipped: 0, errors: 0 };
  const dryRun = options?.dryRun ?? false;
  const today = new Date();
  
  const BATCH_SIZE = 250;
  let lastId = '00000000-0000-0000-0000-000000000000';
  let hasMore = true;

  while (hasMore) {
    const { data: pets, error: petsError } = await supabase
      .from('pets')
      .select('id, owner_id, species, gender, is_neutered, name')
      .eq('gender', 'female')
      .eq('is_neutered', false)
      .in('species', ['dog', 'cat'])
      .gt('id', lastId)
      .order('id', { ascending: true })
      .limit(BATCH_SIZE);

    if (petsError) {
      console.error('[createEstrusNotifications] Failed to fetch pets:', petsError);
      break;
    }

    if (!pets || pets.length === 0) {
      hasMore = false;
      break;
    }

    lastId = pets[pets.length - 1].id;
    const petIds = pets.map(p => p.id);

    const [
      { data: prefsData },
      { data: cyclesData },
      { data: obsData },
      { data: testsData }
    ] = await Promise.all([
      supabase.from('pet_estrus_preferences').select('pet_id, reminders_enabled').in('pet_id', petIds),
      supabase.from('pet_estrus_cycles').select('id, pet_id, start_date, end_date').in('pet_id', petIds).order('start_date', { ascending: true }),
      supabase.from('pet_estrus_observations').select('observation_date, symptom_code, cycle_id, pet_estrus_cycles!inner(pet_id)').in('pet_estrus_cycles.pet_id', petIds),
      supabase.from('pet_reproductive_tests').select('id, sampled_at, cycle_id, pet_estrus_cycles!inner(pet_id)').in('pet_estrus_cycles.pet_id', petIds)
    ]);

    const cyclesByPet = groupByPet(cyclesData, 'pet_id');
    const obsByCycle = groupByCycle(obsData);
    const testsByCycle = groupByCycle(testsData);
    const prefsMap = new Map(prefsData?.map(p => [p.pet_id, p.reminders_enabled]));

    for (const pet of pets) {
      result.evaluated++;
      const remindersEnabled = prefsMap.has(pet.id) ? prefsMap.get(pet.id) : true;
      
      if (!remindersEnabled) continue;

      const cycles = cyclesByPet.get(pet.id) || [];
      const hasActive = cycles.some(c => !c.end_date);
      const closedCount = cycles.filter(c => c.end_date).length;

      if (!hasActive && (pet.species === 'cat' || closedCount < 3)) {
        continue; 
      }

      const inputCycles = cycles.map(c => ({ id: c.id, start_date: c.start_date, end_date: c.end_date }));
      let inputObs: any[] = [];
      let inputTests: any[] = [];
      
      for (const c of inputCycles) {
        inputObs = inputObs.concat(obsByCycle.get(c.id) || []);
        inputTests = inputTests.concat(testsByCycle.get(c.id) || []);
      }

      const input: ForecastInput = {
        pet,
        cycles: inputCycles,
        observations: inputObs,
        tests: inputTests
      };

      const forecast = calculateReproductiveForecast(input, today);

      const notificationsToCreate: any[] = [];

      const { activeCycle } = forecast;
      if (activeCycle.cycleId && activeCycle.cycleDay !== null && activeCycle.cycleDay >= ESTRUS_ACTIVE_REVIEW_DAY) {
        const idempotency_key = `estrus:${pet.id}:${activeCycle.cycleId}:cycle_review`;
        notificationsToCreate.push({
          profile_id: pet.owner_id,
          pet_id: pet.id,
          type: 'estrus_cycle_review',
          title: 'Kızgınlık dönemi hâlâ aktif görünüyor',
          message: `${pet.name || 'Petiniz'} için başlattığınız dönem hâlâ açık görünüyor. Dönem bittiyse bitiş tarihini kaydedebilirsiniz.`,
          idempotency_key
        });
      }

      if (pet.species === 'dog' && forecast.nextHeatWindow?.start && forecast.nextHeatWindow?.end) {
        const startHeat = new Date(forecast.nextHeatWindow.start);
        const endHeat = new Date(forecast.nextHeatWindow.end);
        const diffStartDays = (startHeat.getTime() - today.getTime()) / 86400000;
        
        if (diffStartDays <= ESTRUS_UPCOMING_LEAD_DAYS && today <= endHeat) {
          const closedCycles = cycles.filter(c => c.end_date).sort((a,b) => new Date(b.end_date!).getTime() - new Date(a.end_date!).getTime());
          const latestClosed = closedCycles[0];
          
          if (latestClosed) {
            const idempotency_key = `estrus:${pet.id}:${latestClosed.id}:forecast_upcoming`;
            notificationsToCreate.push({
              profile_id: pet.owner_id,
              pet_id: pet.id,
              type: 'estrus_forecast_upcoming',
              title: 'Tahmini kızgınlık dönemi yaklaşıyor',
              message: `${pet.name || 'Petiniz'} için geçmiş dönem kayıtlarına dayalı tahmini kızgınlık aralığı yaklaşıyor. Belirtileri gözlemleyerek dönem başladığında Odi.Pet'e kaydedebilirsiniz.`,
              idempotency_key
            });
          }
        }
      }

      for (const notif of notificationsToCreate) {
        if (dryRun) {
          console.log('[DRY RUN] Would create notif:', notif.idempotency_key);
          result.created++;
          continue;
        }

        const { error } = await supabase.from('notifications').insert(notif);
        if (error) {
          if (error.code === '23505') {
            result.skipped++;
          } else {
            console.error('[createEstrusNotifications] Insert error:', error);
            result.errors++;
          }
        } else {
          result.created++;
        }
      }
    }
  }

  return result;
}

function groupByPet(data: any[] | null, key: string) {
  const map = new Map<string, any[]>();
  if (!data) return map;
  for (const item of data) {
    const pId = item[key] || item.pet_estrus_cycles?.pet_id;
    if (!pId) continue;
    if (!map.has(pId)) map.set(pId, []);
    map.get(pId)!.push(item);
  }
  return map;
}

function groupByCycle(data: any[] | null) {
  const map = new Map<string, any[]>();
  if (!data) return map;
  for (const item of data) {
    const cId = item.cycle_id;
    if (!cId) continue;
    if (!map.has(cId)) map.set(cId, []);
    map.get(cId)!.push(item);
  }
  return map;
}
