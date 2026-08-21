import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';
import { PetAIContext, DataStatus, IntentType } from '@/app/owner/ai-vet/ai-vet-types';
import { determineIntent } from './intent-router';

export async function buildPetAIContext(
  supabase: SupabaseClient<Database>,
  petId: string,
  query: string
): Promise<PetAIContext> {
  // Check authorization and basic identity
  const { data: pet, error: petError } = await supabase
    .from('pets')
    .select('id, name, species, breed, gender, is_neutered, birth_date, target_weight_kg')
    .eq('id', petId)
    .single();

  if (petError || !pet) {
    throw new Error('Pet not found or unauthorized');
  }

  // Enforce Product Invariant (ONLY CAT OR DOG)
  if (pet.species !== 'cat' && pet.species !== 'dog') {
    throw new Error('Unsupported species');
  }

  // Calculate age
  const today = new Date();
  let ageMonths = 0;
  if (pet.birth_date) {
    const birth = new Date(pet.birth_date);
    ageMonths = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
  }
  const lifeStage = ageMonths <= 12 ? 'puppy_kitten' : (ageMonths > 84 ? 'senior' : 'adult');

  const intent = determineIntent(query);

  const context: PetAIContext = {
    core: {
      petId: pet.id,
      identity: {
        name: pet.name,
        species: pet.species as 'cat' | 'dog',
        breed: pet.breed,
        gender: pet.gender,
        isNeutered: pet.is_neutered,
        ageMonths,
        lifeStage
      },
      weight: {
        valueKg: null,
        targetKg: pet.target_weight_kg,
        recordedAt: null,
        status: 'not_recorded'
      },
      medicalStatus: {
        conditionsStatus: 'not_recorded',
        activeConditions: [],
        medicationsStatus: 'not_recorded',
        activeMedications: [],
        allergiesStatus: 'not_recorded',
        knownAllergies: []
      }
    }
  };

  // 1. Fetch Weight (SSOT: weight_logs)
  const { data: weightLogs } = await supabase
    .from('weight_logs')
    .select('weight_kg, measured_at')
    .eq('pet_id', petId)
    .or('is_archived.is.null,is_archived.eq.false')
    .order('measured_at', { ascending: false })
    .limit(1);

  if (weightLogs && weightLogs.length > 0 && weightLogs[0].weight_kg != null) {
    const latest = weightLogs[0];
    const recDate = latest.measured_at ? new Date(latest.measured_at) : new Date();
    const diffDays = (today.getTime() - recDate.getTime()) / (1000 * 3600 * 24);
    
    // Freshness rule
    const staleThreshold = lifeStage === 'puppy_kitten' ? 30 : 90;
    
    context.core.weight = {
      valueKg: latest.weight_kg,
      targetKg: pet.target_weight_kg,
      recordedAt: latest.measured_at,
      status: diffDays > staleThreshold ? 'stale' : 'known_positive'
    };
  }

  // 2. Fetch Active Medical Conditions (SSOT: health_diseases)
  const { data: conditions } = await supabase
    .from('health_diseases')
    .select('disease_name, diagnosis_date')
    .eq('pet_id', petId)
    .eq('is_resolved', false);
  
  if (conditions && conditions.length > 0) {
    context.core.medicalStatus.conditionsStatus = 'known_positive';
    context.core.medicalStatus.activeConditions = conditions.map(c => ({
      name: c.disease_name,
      diagnosedAt: c.diagnosis_date
    }));
  }

  // 3. Fetch Active Medications (SSOT: health_medications)
  const { data: medications } = await supabase
    .from('health_medications')
    .select('medication_name, dose, usage_duration')
    .eq('pet_id', petId)
    .eq('is_active', true);
  
  if (medications && medications.length > 0) {
    context.core.medicalStatus.medicationsStatus = 'known_positive';
    context.core.medicalStatus.activeMedications = medications.map(m => ({
      name: m.medication_name,
      dose: m.dose,
      duration: m.usage_duration
    }));
  }

  // 4. Fetch Allergies (SSOT: health_allergies)
  const { data: allergies } = await supabase
    .from('health_allergies')
    .select('trigger_name, symptoms')
    .eq('pet_id', petId);
  
  if (allergies && allergies.length > 0) {
    context.core.medicalStatus.allergiesStatus = 'known_positive';
    context.core.medicalStatus.knownAllergies = allergies.map(a => ({
      allergen: a.trigger_name,
      reaction: a.symptoms
    }));
  }

  // --- INTENT SPECIFIC CONTEXT ---
  if (intent !== 'INTENT_GENERAL') {
    context.intentSpecific = { intent };

    if (intent === 'INTENT_VACCINE' || intent === 'INTENT_MEDICAL') {
      const { data: pastVaccines } = await supabase
        .from('vaccine_records_v2')
        .select('vaccine_name, administered_at')
        .eq('pet_id', petId)
        .in('status', ['completed', 'done'])
        .order('administered_at', { ascending: false })
        .limit(10);
      
      const { data: upcomingVaccines } = await supabase
        .from('plans')
        .select('sub_type, scheduled_at, status')
        .eq('pet_id', petId)
        .eq('category', 'asi')
        .in('status', ['active', 'pending', 'overdue']);
      
      context.intentSpecific.vaccines = {
        history: (pastVaccines || []).map(v => ({ name: v.vaccine_name, administeredAt: v.administered_at || '' })),
        upcomingOrOverdue: (upcomingVaccines || []).map(v => ({
          name: v.sub_type,
          dueDate: v.scheduled_at,
          isOverdue: new Date(v.scheduled_at) < today || v.status === 'overdue'
        }))
      };
    }

    if (intent === 'INTENT_PARASITE' || intent === 'INTENT_MEDICAL') {
      const { data: parasiteRecords } = await supabase
        .from('parasite_records')
        .select('product_free_text, administered_at, protection_duration_days')
        .eq('pet_id', petId)
        .order('administered_at', { ascending: false })
        .limit(1);

      let status: 'PROTECTED' | 'OVERDUE' | 'NOT_RECORDED' | 'STALE' = 'NOT_RECORDED';
      let lastAdmin = null;
      let lastProduct = null;
      if (parasiteRecords && parasiteRecords.length > 0) {
        lastAdmin = parasiteRecords[0].administered_at;
        lastProduct = parasiteRecords[0].product_free_text;
        
        const protectionDays = parasiteRecords[0].protection_duration_days;
        
        if (protectionDays != null) {
          const recDate = new Date(lastAdmin);
          const diffDays = (today.getTime() - recDate.getTime()) / (1000 * 3600 * 24);
          
          if (diffDays <= protectionDays) {
            status = 'PROTECTED';
          } else if (diffDays <= protectionDays + 30) {
            status = 'OVERDUE';
          } else {
            status = 'STALE';
          }
        }
      }

      context.intentSpecific.parasites = {
        protectionStatus: status,
        lastAdministeredAt: lastAdmin,
        lastProduct
      };
    }

    if (intent === 'INTENT_NUTRITION' || intent === 'INTENT_WEIGHT') {
      const { data: foodAssigns } = await supabase
        .from('pet_food_assignments')
        .select('product_free_text, daily_target_grams, meals_per_day')
        .eq('pet_id', petId)
        .eq('is_primary', true)
        .limit(1); // MaybeSingle equivalent safely
      
      const foodAssign = foodAssigns && foodAssigns.length > 0 ? foodAssigns[0] : null;

      context.intentSpecific.nutrition = {
        primaryFood: foodAssign?.product_free_text || null,
        dailyGramsTarget: foodAssign?.daily_target_grams || null,
        mealsPerDay: foodAssign?.meals_per_day || null
      };
    }

    if (intent === 'INTENT_REPRODUCTIVE' && !pet.is_neutered && (pet.gender === 'female' || pet.gender === 'dişi')) {
      const { data: cycles } = await supabase
        .from('pet_estrus_cycles')
        .select('start_date, symptoms')
        .eq('pet_id', petId)
        .order('start_date', { ascending: false })
        .limit(1);
      
      const { data: obs } = await supabase
        .from('pet_estrus_observations')
        .select('symptom_code')
        .eq('pet_id', petId)
        .order('observation_date', { ascending: false })
        .limit(5);

      context.intentSpecific.reproductive = {
        isEligible: true,
        lastEstrusStart: cycles && cycles.length > 0 ? cycles[0].start_date : null,
        activeSymptoms: (obs || []).map(o => o.symptom_code)
      };
    } else if (intent === 'INTENT_REPRODUCTIVE') {
      context.intentSpecific.reproductive = {
        isEligible: false,
        lastEstrusStart: null,
        activeSymptoms: []
      };
    }

    if (intent === 'INTENT_CARE') {
      const { data: careEvents } = await supabase
        .from('pet_care_events')
        .select('notes, completed_at, scheduled_at')
        .eq('pet_id', petId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(5);
      
      context.intentSpecific.care = {
        recentEvents: (careEvents || []).map(e => ({ title: e.notes || 'Bakım', completedAt: e.completed_at || e.scheduled_at }))
      };
    }
  }

  return context;
}
