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
    gender?: string | null;
    is_neutered?: boolean | null;
    breed?: string | null;
    sos_contacts?: any[] | null;
    birth_date?: string | null;
    birth_date_precision?: string | null;
  };
  vaccinePlans: any[] | null;
  parasitePlans: any[] | null;
  carePlans?: any[] | null;
  latestWeight?: { weight_kg?: number | null } | null;
  nutritionProfile?: any | null;
}

export function buildPetMicroTasks({
  pet,
  vaccinePlans,
  parasitePlans,
  carePlans = [],
  latestWeight,
  nutritionProfile
}: BuildMicroTasksArgs): PetMicroTask[] {
  const allTasks: PetMicroTask[] = [];

  // Helper checks
  const hasActiveVaccinePlan = Array.isArray(vaccinePlans) && vaccinePlans.some(p => p.status === 'active' || p.status === 'scheduled');
  const hasActiveParasitePlan = Array.isArray(parasitePlans) && parasitePlans.some(p => p.status === 'active' || p.status === 'scheduled');
  const hasValidWeight = latestWeight?.weight_kg != null;

  const hasBirthDate = !!pet.birth_date && pet.birth_date_precision !== 'unknown';
  const hasGender = !!pet.gender;
  const hasNeuteredStatus = pet.is_neutered !== null && pet.is_neutered !== undefined;

  // Basic profile completeness for unlocking Nutrition tasks
  const isBasicProfileComplete = hasBirthDate && hasGender && hasNeuteredStatus;
  const isPhase1HealthComplete = hasActiveVaccinePlan && hasActiveParasitePlan && hasValidWeight;

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
      title: 'Kilo Bilgisi Gir',
      description: 'Gelişimini takip edebilmek için güncel kilosunu girin.',
      actionText: 'Bilgi Gir',
      route: `/owner/pets/${pet.id}`,
      directAction: 'WEIGHT_MODAL',
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
  // Kilit açılma koşulu: Temel profil bilgileri + Aşama 1 sağlık tamamlanmış olmalı
  // ─────────────────────────────────────────────────────────────
  const isNutritionUnlocked = isBasicProfileComplete && isPhase1HealthComplete;

  const hasMealsPerDay = nutritionProfile?.meals_per_day != null;
  const hasDailyGrams = nutritionProfile?.daily_grams != null;
  const hasFoodType = nutritionProfile?.food_type != null;

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
  // Kilit açılma koşulu: 3 beslenme alanı da (öğün, gram, tip) tamamlanmış olmalı
  // ─────────────────────────────────────────────────────────────
  const isAllNutritionComplete = hasMealsPerDay && hasDailyGrams && hasFoodType;
  const activeCarePlans = Array.isArray(carePlans) ? carePlans.filter(p => p.status === 'active') : [];

  const hasBrushingPlan = activeCarePlans.some(p => p.sub_type === 'Tüy Bakımı' || p.sub_type === 'Tüy Tarama');
  const hasDentalPlan = activeCarePlans.some(p => p.sub_type === 'Diş Fırçalama' || p.sub_type === 'Diş Bakımı');
  const hasNailPlan = activeCarePlans.some(p => p.sub_type === 'Tırnak Kesimi');

  if (isNutritionUnlocked && isAllNutritionComplete) {
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

  // 13. Acil Durum Kişisi
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
      route: `/owner/pets/${pet.id}/edit?highlight=emergencyContact`,
      icon: 'ti ti-phone-call'
    });
  }

  // Sort strictly by priority (1 to 5) and slice max 3 tasks
  allTasks.sort((a, b) => a.priority - b.priority);

  return allTasks.slice(0, 3);
}
