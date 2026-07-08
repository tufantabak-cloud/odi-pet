export interface PetMicroTask {
  id: string;
  type: 'missing_photo' | 'missing_vaccine_plan' | 'missing_parasite_plan' | 'missing_weight' | 'missing_emergency_contact' | 'missing_nutrition' | 'missing_neutered';
  title: string;
  description: string;
  actionText: string;
  route: string;
  icon: string;
}

interface BuildMicroTasksArgs {
  pet: {
    id: string;
    name: string;
    avatar_url?: string | null;
    is_neutered?: boolean | null;
    breed?: string | null;
    sos_contacts?: any[] | null;
  };
  vaccinePlans: any[];
  parasitePlans: any[];
  latestWeight?: { weight_kg?: number | null } | null;
  nutritionProfile?: any | null;
}

export function buildPetMicroTasks({
  pet,
  vaccinePlans,
  parasitePlans,
  latestWeight,
  nutritionProfile
}: BuildMicroTasksArgs): PetMicroTask[] {
  const tasks: PetMicroTask[] = [];

  // 1. Profil Fotoğrafı Eksikliği
  if (!pet.avatar_url) {
    tasks.push({
      id: `missing_photo_${pet.id}`,
      type: 'missing_photo',
      title: 'Profil Fotoğrafı Ekle',
      description: `${pet.name} için bir profil fotoğrafı ekleyerek ana ekranı kişiselleştirin.`,
      actionText: 'Ekle',
      route: `/owner/pets/${pet.id}/edit?highlight=photo`,
      icon: 'ti ti-camera'
    });
  }

  // 2. Aşı Planı Eksikliği
  if (!vaccinePlans || vaccinePlans.length === 0) {
    tasks.push({
      id: `missing_vaccine_plan_${pet.id}`,
      type: 'missing_vaccine_plan',
      title: 'Aşı Planı Eksik',
      description: 'Hatırlatmaları almak ve aşıları takip etmek için aşı planı oluşturun.',
      actionText: 'Oluştur',
      route: `/owner/pets/${pet.id}/vaccines`,
      icon: 'ti ti-shield-check'
    });
  }

  // 3. Parazit Planı Eksikliği
  if (!parasitePlans || parasitePlans.length === 0) {
    tasks.push({
      id: `missing_parasite_plan_${pet.id}`,
      type: 'missing_parasite_plan',
      title: 'Parazit Koruması Eksik',
      description: 'İç ve dış parazit takibini başlatarak can dostunuzu koruyun.',
      actionText: 'Planla',
      route: `/owner/pets/${pet.id}/parasite`,
      icon: 'ti ti-bug'
    });
  }

  // 4. Kilo Bilgisi Eksikliği
  if (!latestWeight || latestWeight.weight_kg === undefined || latestWeight.weight_kg === null) {
    tasks.push({
      id: `missing_weight_${pet.id}`,
      type: 'missing_weight',
      title: 'Kilo Bilgisi Gir',
      description: 'Gelişimini takip edebilmek için güncel kilosunu girin.',
      actionText: 'Gir',
      route: `/owner/pets/${pet.id}/journal/new/weight`,
      icon: 'ti ti-scale'
    });
  }

  // 5. Acil Durum Kişisi Eksikliği
  if (!pet.sos_contacts || !Array.isArray(pet.sos_contacts) || pet.sos_contacts.length === 0) {
    tasks.push({
      id: `missing_emergency_contact_${pet.id}`,
      type: 'missing_emergency_contact',
      title: 'Acil Durum Kişisi',
      description: 'Beklenmeyen durumlar için acil durumda ulaşılacak kişiyi ekleyin.',
      actionText: 'Ekle',
      route: `/owner/pets/${pet.id}/edit?highlight=emergencyContact`,
      icon: 'ti ti-phone-call'
    });
  }

  // 6. Beslenme Bilgisi Eksikliği
  if (!nutritionProfile) {
    tasks.push({
      id: `missing_nutrition_${pet.id}`,
      type: 'missing_nutrition',
      title: 'Beslenme Bilgisi',
      description: 'Günlük mama tüketim miktarını ve markasını kaydedin.',
      actionText: 'Kaydet',
      route: `/owner/pets/${pet.id}/nutrition`,
      icon: 'ti ti-tools'
    });
  }

  // 7. Kısırlaştırma Bilgisi Eksikliği
  if (pet.is_neutered === null || pet.is_neutered === undefined) {
    tasks.push({
      id: `missing_neutered_${pet.id}`,
      type: 'missing_neutered',
      title: 'Kısırlaştırma Bilgisi',
      description: 'Sağlık ve aşı önerilerinin doğruluğu için kısırlaştırma durumunu belirtin.',
      actionText: 'Belirt',
      route: `/owner/pets/${pet.id}/edit?highlight=neutered`,
      icon: 'ti ti-cut'
    });
  }

  return tasks;
}
