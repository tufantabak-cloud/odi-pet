import { createAdminSupabaseClient } from '@/lib/supabase/server'

export type BreedingEligibilityMessage = {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'blocking';
};

export type BreedingEligibilityResult = {
  status:
    | 'not_evaluated'
    | 'incomplete'
    | 'vet_review_required'
    | 'eligible'
    | 'temporarily_ineligible'
    | 'permanently_ineligible';
  minimumAgePassed: boolean | null;
  blockingReasons: BreedingEligibilityMessage[];
  advisories: BreedingEligibilityMessage[];
};

export async function evaluateBreedingEligibility(petId: string): Promise<BreedingEligibilityResult> {
  const supabase = createAdminSupabaseClient();

  const { data: pet } = await supabase
    .from('pets')
    .select('id, name, species, gender, birth_date, is_neutered')
    .eq('id', petId)
    .single();

  if (!pet) {
    throw new Error('Pet not found');
  }

  const { data: existingEligibility } = await supabase
    .from('pet_breeding_eligibility')
    .select('*')
    .eq('pet_id', petId)
    .single();

  const blockingReasons: BreedingEligibilityResult['blockingReasons'] = [];
  const advisories: BreedingEligibilityResult['advisories'] = [];
  let status: BreedingEligibilityResult['status'] = 'eligible';
  let minimumAgePassed: boolean | null = null;

  // 1. Permanent block: Neutered
  if (pet.is_neutered) {
    status = 'permanently_ineligible';
    blockingReasons.push({
      code: 'PET_NEUTERED',
      message: 'Kısırlaştırılmış petler için üreme ilanı açılamaz.',
      severity: 'blocking'
    });
    return await saveEligibility(petId, status, minimumAgePassed, blockingReasons, advisories, existingEligibility);
  }

  // 2. Permanent block: Species not supported
  if (pet.species !== 'dog' && pet.species !== 'cat') {
    status = 'permanently_ineligible';
    blockingReasons.push({
      code: 'UNSUPPORTED_SPECIES',
      message: 'Yalnızca kedi ve köpek türleri için üreme ilanı açılabilir.',
      severity: 'blocking'
    });
    return await saveEligibility(petId, status, minimumAgePassed, blockingReasons, advisories, existingEligibility);
  }

  // 3. Incomplete: Sex missing
  if (!pet.gender) {
    status = 'incomplete';
    blockingReasons.push({
      code: 'SEX_REQUIRED',
      message: 'Eşleştirme ilanı açmak için petinizin cinsiyet bilgisini profilinden eklemelisiniz.',
      severity: 'blocking'
    });
  }

  // 4. Incomplete: Birth date missing
  if (!pet.birth_date) {
    status = 'incomplete';
    blockingReasons.push({
      code: 'BIRTH_DATE_REQUIRED',
      message: 'Eşleştirme ilanı açmak için petinizin doğum tarihini (yaşını) eklemelisiniz.',
      severity: 'blocking'
    });
  } else {
    // Has birth date, but age rule is not yet configured.
    minimumAgePassed = null;
    advisories.push({
      code: 'AGE_RULE_NOT_CONFIGURED',
      message: 'Minimum yaş değerlendirmesi (tür/ırk bazlı) henüz sisteme işlenmedi.',
      severity: 'info'
    });
  }

  // 5. Veterinary clearance
  // Veteriner kontrolü için gerçek bir kaynak henüz yok.
  // Bu yüzden her zaman 'missing' varsayılır ve sadece teşvik mesajı eklenir.
  const vetClearanceStatus = 'missing';
  
  // Status değişmez (incomplete ise incomplete kalır, eligible ise eligible kalır)
  advisories.push({
    code: 'VETERINARY_CLEARANCE_OPTIONAL',
    message: 'Veteriner onayı ekleyerek ilanınızı öne çıkarabilir ve güven rozeti alabilirsiniz.',
    severity: 'info'
  });

  return await saveEligibility(petId, status, minimumAgePassed, blockingReasons, advisories, existingEligibility);
}

async function saveEligibility(
  petId: string, 
  status: string, 
  minimumAgePassed: boolean | null, 
  blockingReasons: BreedingEligibilityMessage[], 
  advisories: BreedingEligibilityMessage[],
  existingRecord: any
): Promise<BreedingEligibilityResult> {
  const supabase = createAdminSupabaseClient();
  
  const payload = {
    pet_id: petId,
    status,
    minimum_age_passed: minimumAgePassed,
    blocking_reasons: blockingReasons,
    advisories,
    evaluated_at: new Date().toISOString()
  };

  if (existingRecord) {
    await supabase.from('pet_breeding_eligibility').update(payload).eq('id', existingRecord.id);
  } else {
    await supabase.from('pet_breeding_eligibility').insert(payload);
  }

  return {
    status: status as BreedingEligibilityResult['status'],
    minimumAgePassed,
    blockingReasons,
    advisories
  };
}
