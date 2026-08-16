export type PetTaskActionType =
  | 'PLAN'
  | 'LOG_RECORD'
  | 'DIRECT_DATA'
  | 'DOCUMENT'
  | 'SETTINGS'
  | 'VIEW';

export interface PetMicroTask {
  id: string;
  type: string;
  priority: number; // 1 (Highest) to 5
  actionType: PetTaskActionType;
  title: string;
  description: string;
  actionText: string;
  route: string;
  directAction?: 'WEIGHT_MODAL' | 'DAILY_MEALS_MODAL' | 'FOOD_AMOUNT_MODAL' | 'NUTRITION_TYPE_MODAL';
  icon: string;
}

interface BuildMicroTasksArgs {
  pet: {
    id: string;
    name: string;
    species?: string | null;
    avatar_url?: string | null;
    cover_url?: string | null;
    gender?: string | null;
    is_neutered?: boolean | null;
    breed?: string | null;
    sos_contacts?: any[] | null;
    birth_date?: string | null;
    birth_date_precision?: string | null;
    weight?: number | string | null;
    weight_kg?: number | string | null;
  };
  vaccinePlans?: any[] | null;
  parasitePlans?: any[] | null;
  carePlans?: any[] | null;
  latestWeight?: { weight_kg?: number | null; value?: number | null; weight?: number | null } | null;
  nutritionProfile?: any | null;
  assignments?: any[] | null;
  lastVaccineRecord?: any | null;
  inventory?: any | null;
}

export function buildPetMicroTasks({
  pet,
  vaccinePlans,
  parasitePlans,
  carePlans = [],
  latestWeight,
  nutritionProfile,
  assignments = [],
  lastVaccineRecord,
  inventory,
}: BuildMicroTasksArgs): PetMicroTask[] {
  const allTasks: PetMicroTask[] = [];

  // Helper checks across all tab data sources
  const hasActiveVaccinePlan =
    (Array.isArray(vaccinePlans) && vaccinePlans.some(p => p && p.status !== 'cancelled' && p.status !== 'deleted')) ||
    lastVaccineRecord != null;

  const hasActiveParasitePlan =
    Array.isArray(parasitePlans) && parasitePlans.some(p => p && p.status !== 'cancelled' && p.status !== 'deleted');

  const rawPetWeight = pet.weight ?? pet.weight_kg;
  const numPetWeight = typeof rawPetWeight === 'string' ? parseFloat(rawPetWeight) : rawPetWeight;

  const hasValidWeight =
    (latestWeight?.weight_kg != null && Number(latestWeight.weight_kg) > 0) ||
    (latestWeight?.value != null && Number(latestWeight.value) > 0) ||
    (latestWeight?.weight != null && Number(latestWeight.weight) > 0) ||
    (numPetWeight != null && !isNaN(numPetWeight) && numPetWeight > 0);

  const hasBirthDate = !!pet.birth_date && pet.birth_date_precision !== 'unknown';
  const hasGender = !!pet.gender;
  const hasNeuteredStatus = pet.is_neutered !== null && pet.is_neutered !== undefined;

  // Progressive profiling unlock
  const isNutritionUnlocked = true;

  // ─────────────────────────────────────────────────────────────
  // AŞAMA 1 — Temel Sağlık Güvenliği (Priority 1)
  // ─────────────────────────────────────────────────────────────

  // 1. Aşı Planı Eksik
  if (vaccinePlans !== null && !hasActiveVaccinePlan) {
    allTasks.push({
      id: `missing_vaccine_plan_${pet.id}`,
      type: 'missing_vaccine_plan',
      priority: 1,
      actionType: 'PLAN',
      title: 'Aşı Planı Eksik',
      description: 'Hatırlatmaları almak ve aşıları takip etmek için aşı planı oluşturun.',
      actionText: 'Planla',
      route: `/owner/plan-yap/asi?pet_id=${pet.id}`,
      icon: 'ti ti-shield-check'
    });
  }

  // 2. Parazit Koruması Eksik
  if (parasitePlans !== null && !hasActiveParasitePlan) {
    allTasks.push({
      id: `missing_parasite_plan_${pet.id}`,
      type: 'missing_parasite_plan',
      priority: 1,
      actionType: 'PLAN',
      title: 'Parazit Koruması Eksik',
      description: 'İç ve dış parazit takibini başlatarak can dostunuzu koruyun.',
      actionText: 'Planla',
      route: `/owner/plan-yap/parazit?pet_id=${pet.id}`,
      icon: 'ti ti-bug'
    });
  }

  // 3. Kilo Bilgisi Gir
  if (!hasValidWeight) {
    allTasks.push({
      id: `missing_weight_${pet.id}`,
      type: 'missing_weight',
      priority: 1,
      actionType: 'DIRECT_DATA',
      directAction: 'WEIGHT_MODAL',
      title: 'Kilo Bilgisi Gir',
      description: 'Gelişimini takip edebilmek için güncel kilosunu girin.',
      actionText: 'Bilgi Gir',
      route: `/owner/pets/${pet.id}/nutrition?tab=kilo`,
      icon: 'ti ti-scale'
    });
  }

  // ─────────────────────────────────────────────────────────────
  // AŞAMA 2 — Temel Pet Bilgileri (Priority 2)
  // ─────────────────────────────────────────────────────────────

  // 4. Doğum Tarihi Eksik
  if (!hasBirthDate) {
    allTasks.push({
      id: `missing_birth_date_${pet.id}`,
      type: 'missing_birth_date',
      priority: 2,
      actionType: 'DIRECT_DATA',
      title: 'Doğum Tarihi Eksik',
      description: 'Aşı ve bakım önerilerini doğru hesaplamak için doğum tarihini ekleyin.',
      actionText: 'Bilgi Gir',
      route: `/owner/pets/${pet.id}/edit?highlight=birthDate`,
      icon: 'ti ti-cake'
    });
  }

  // 5. Kısırlaştırma Bilgisi Eksik
  if (!hasNeuteredStatus) {
    allTasks.push({
      id: `missing_neutered_${pet.id}`,
      type: 'missing_neutered',
      priority: 2,
      actionType: 'DIRECT_DATA',
      title: 'Kısırlaştırma Bilgisi Eksik',
      description: 'Sağlık ve aşı önerilerinin doğruluğu için kısırlaştırma durumunu belirtin.',
      actionText: 'Bilgi Gir',
      route: `/owner/pets/${pet.id}/edit?highlight=neutered`,
      icon: 'ti ti-cut'
    });
  }

  // ─────────────────────────────────────────────────────────────
  // AŞAMA 3 — Beslenme Temel Bilgileri (Priority 3)
  // ─────────────────────────────────────────────────────────────

  const hasFoodAssignment = Array.isArray(assignments) && assignments.length > 0;
  const activeAssignment = hasFoodAssignment
    ? (assignments.find((a: any) => a && a.is_active !== false) || assignments[0])
    : null;

  const hasMealsPerDay =
    nutritionProfile?.meals_per_day != null ||
    (activeAssignment != null && (activeAssignment.meals_per_day != null || activeAssignment.daily_meals != null || activeAssignment.portion_grams != null));

  const hasDailyGrams =
    nutritionProfile?.daily_grams != null ||
    (activeAssignment != null && (activeAssignment.daily_target_grams != null || activeAssignment.daily_grams != null || activeAssignment.portion_grams != null)) ||
    inventory?.daily_target_grams != null;

  const hasFoodType =
    nutritionProfile?.food_type != null ||
    (activeAssignment != null && (
      activeAssignment.food_type != null ||
      activeAssignment.food_product_family?.food_form != null ||
      activeAssignment.food_form != null ||
      activeAssignment.food_product_family?.official_name != null ||
      activeAssignment.custom_name != null ||
      activeAssignment.custom_brand != null
    ));

  if (isNutritionUnlocked) {
    // 6. Günlük Öğün Sayısını Belirle
    if (!hasMealsPerDay) {
      allTasks.push({
        id: `missing_daily_meals_${pet.id}`,
        type: 'missing_daily_meals',
        priority: 3,
        actionType: 'DIRECT_DATA',
        title: 'Günlük Öğün Sayısını Belirle',
        description: 'Günde kaç kez beslendiğini kaydedelim.',
        actionText: 'Bilgi Gir',
        route: `/owner/pets/${pet.id}`,
        directAction: 'DAILY_MEALS_MODAL',
        icon: 'ti ti-bowl'
      });
    }

    // 7. Günlük Mama Miktarını Gir
    if (!hasDailyGrams) {
      allTasks.push({
        id: `missing_daily_food_amount_${pet.id}`,
        type: 'missing_daily_food_amount',
        priority: 3,
        actionType: 'DIRECT_DATA',
        title: 'Günlük Mama Miktarını Gir',
        description: 'Bir günde yaklaşık ne kadar mama tükettiğini kaydedelim.',
        actionText: 'Bilgi Gir',
        route: `/owner/pets/${pet.id}`,
        directAction: 'FOOD_AMOUNT_MODAL',
        icon: 'ti ti-report-medical'
      });
    }

    // 8. Beslenme Tipini Belirle
    if (!hasFoodType) {
      allTasks.push({
        id: `missing_nutrition_type_${pet.id}`,
        type: 'missing_nutrition_type',
        priority: 3,
        actionType: 'DIRECT_DATA',
        title: 'Beslenme Tipini Belirle',
        description: 'Kuru mama, yaş mama veya özel diyet tipini belirtin.',
        actionText: 'Bilgi Gir',
        route: `/owner/pets/${pet.id}`,
        directAction: 'NUTRITION_TYPE_MODAL',
        icon: 'ti ti-salad'
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // AŞAMA 4 — Bakım Rutinleri (Priority 4)
  // ─────────────────────────────────────────────────────────────
  const activeCarePlans = Array.isArray(carePlans) ? carePlans.filter(p => p && p.status !== 'cancelled' && p.status !== 'deleted') : [];

  const hasBrushingPlan = activeCarePlans.some(p => {
    const text = `${p.sub_type || ''} ${p.sub_category || ''} ${p.title || ''}`.toLowerCase();
    return text.includes('tüy') || text.includes('tarama') || text.includes('grooming');
  });
  const hasDentalPlan = activeCarePlans.some(p => {
    const text = `${p.sub_type || ''} ${p.sub_category || ''} ${p.title || ''}`.toLowerCase();
    return text.includes('diş') || text.includes('dental');
  });
  const hasNailPlan = activeCarePlans.some(p => {
    const text = `${p.sub_type || ''} ${p.sub_category || ''} ${p.title || ''}`.toLowerCase();
    return text.includes('tırnak') || text.includes('nail');
  });

  if (isNutritionUnlocked) {
    // 9. Tüy Tarama Rutini Eksik
    if (!hasBrushingPlan) {
      allTasks.push({
        id: `missing_grooming_brushing_${pet.id}`,
        type: 'missing_grooming_brushing',
        priority: 4,
        actionType: 'PLAN',
        title: 'Tüy Tarama Rutini Eksik',
        description: 'Düzenli tüy tarama ve bakım rutini oluşturun.',
        actionText: 'Planla',
        route: `/owner/plan-yap/bakim?pet_id=${pet.id}&subCat=T%C3%BCy%20Bak%C4%B1m%C4%B1`,
        icon: 'ti ti-scissors'
      });
    }

    // 10. Diş Bakımı Rutini Eksik
    if (!hasDentalPlan) {
      allTasks.push({
        id: `missing_dental_care_${pet.id}`,
        type: 'missing_dental_care',
        priority: 4,
        actionType: 'PLAN',
        title: 'Diş Bakımı Rutini Eksik',
        description: 'Ağız ve diş sağlığı için düzenli fırçalama rutini ekleyin.',
        actionText: 'Planla',
        route: `/owner/plan-yap/bakim?pet_id=${pet.id}&subCat=Di%C5%9F%20F%C4%B1r%C3%A7alama`,
        icon: 'ti ti-sparkles'
      });
    }

    // 11. Tırnak Kesimi Rutini Eksik
    if (!hasNailPlan) {
      allTasks.push({
        id: `missing_nail_trimming_${pet.id}`,
        type: 'missing_nail_trimming',
        priority: 4,
        actionType: 'PLAN',
        title: 'Tırnak Kesimi Rutini Eksik',
        description: 'Pati sağlığı için düzenli tırnak kesimi rutini oluşturun.',
        actionText: 'Planla',
        route: `/owner/plan-yap/bakim?pet_id=${pet.id}&subCat=T%C4%B1rnak%20Kesimi`,
        icon: 'ti ti-cut'
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // AŞAMA 5 — İsteğe Bağlı & Ek Bilgiler (Priority 5)
  // ─────────────────────────────────────────────────────────────

  // 12. Profil Fotoğrafı Ekle
  if (!pet.avatar_url) {
    allTasks.push({
      id: `missing_photo_${pet.id}`,
      type: 'missing_photo',
      priority: 5,
      actionType: 'DIRECT_DATA',
      title: 'Profil Fotoğrafı Ekle',
      description: `${pet.name} için bir profil fotoğrafı ekleyin.`,
      actionText: 'Fotoğraf Ekle',
      route: `/owner/pets/${pet.id}/edit?highlight=photo`,
      icon: 'ti ti-camera'
    });
  }

  // 13. Kapak Fotoğrafı Ekle
  if (!pet.cover_url) {
    allTasks.push({
      id: `missing_cover_photo_${pet.id}`,
      type: 'missing_cover_photo',
      priority: 5,
      actionType: 'DIRECT_DATA',
      title: 'Kapak Fotoğrafı Ekle',
      description: `${pet.name} için kişiselleştirilmiş bir kapak fotoğrafı ekleyin.`,
      actionText: 'Kapak Ekle',
      route: `/owner/pets/${pet.id}/edit?highlight=cover`,
      icon: 'ti ti-photo'
    });
  }

  // 14. Acil Durum Kişisi
  const hasValidContact = Array.isArray(pet.sos_contacts) && 
    pet.sos_contacts.some(c => c && typeof c.name === 'string' && c.name.trim() && typeof c.phone === 'string' && c.phone.trim());

  if (!hasValidContact) {
    allTasks.push({
      id: `missing_emergency_contact_${pet.id}`,
      type: 'missing_emergency_contact',
      priority: 5,
      actionType: 'DIRECT_DATA',
      title: 'Acil Durum Kişisi',
      description: 'Beklenmeyen durumlar için acil durumda ulaşılacak kişiyi ekleyin.',
      actionText: 'Kişi Ekle',
      route: `/owner/pets/${pet.id}/edit?highlight=emergencyContact#sos-section`,
      icon: 'ti ti-phone-call'
    });
  }

  // Sort strictly by priority (1 to 5) and slice max 3 tasks
  allTasks.sort((a, b) => a.priority - b.priority);

  return allTasks.slice(0, 3);
}
