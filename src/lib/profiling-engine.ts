export interface SmartQuestion {
  id: string;
  petId: string;
  petName: string;
  type: 'weight' | 'breed' | 'daily_review';
  title: string;
  message: string;
  ctaText: string;
  icon?: string;
  gradient?: string;
  iconBg?: string;
}

export function getDailyQuestion(
  pets: any[],
  surveyStats: any | null,
  weightLogs: any[] = []
): SmartQuestion | null {
  // Check Ad-Fatigue (Max 1 question per day)
  if (surveyStats && surveyStats.last_question_asked_at) {
    const lastDate = new Date(surveyStats.last_question_asked_at);
    const today = new Date();
    
    // If asked today and count >= 1
    if (
      lastDate.getDate() === today.getDate() &&
      lastDate.getMonth() === today.getMonth() &&
      lastDate.getFullYear() === today.getFullYear()
    ) {
      if (surveyStats.daily_questions_asked >= 1) {
        return null; // Fatigued
      }
    }
  }

  if (!pets || pets.length === 0) return null;

  // 1. Missing or Outdated Weight (Ayda 1 kez kilo güncelleme istenecek)
  const petMissingWeight = pets.find(p => {
    // Evcil hayvana ait kilo kayıtlarını filtrele ve tarihe göre sırala
    const petLogs = weightLogs
      .filter(log => log.pet_id === p.id)
      .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime());
    
    // Eğer hiç kilo kaydı yoksa, kilo bilgisi eksiktir
    if (petLogs.length === 0) {
      return true;
    }

    // En son kilo kaydı
    const latestLog = petLogs[0];
    const latestDate = new Date(latestLog.measured_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // En son girilen kilo kaydı 30 günden daha eski ise kilo bilgisi eksik/güncellenmeli kabul edilir
    return latestDate < thirtyDaysAgo;
  });

  if (petMissingWeight) {
    return {
      id: `weight_missing_${petMissingWeight.id}`,
      petId: petMissingWeight.id,
      petName: petMissingWeight.name,
      type: 'weight',
      title: 'Kilo Bilgisi Eksik',
      message: `${petMissingWeight.name}'in güncel kilosunu girerek mama porsiyonunu doğru hesaplamamıza yardımcı olun.`,
      ctaText: 'Kilo Gir',
      icon: '⚖️',
      gradient: 'from-blue-50 to-indigo-50',
      iconBg: 'bg-blue-100 text-blue-700'
    };
  }

  // 2. Missing Breed
  const petMissingBreed = pets.find(p => !p.breed || p.breed.trim() === '');
  if (petMissingBreed) {
    return {
      id: `breed_missing_${petMissingBreed.id}`,
      petId: petMissingBreed.id,
      petName: petMissingBreed.name,
      type: 'breed',
      title: 'Irk/Cins Bilgisi Eksik',
      message: `${petMissingBreed.name}'in ırkını belirterek ona özel genetik sağlık yatkınlıklarını takip edelim.`,
      ctaText: 'Irk Belirt',
      icon: '🐕',
      gradient: 'from-amber-50 to-orange-50',
      iconBg: 'bg-amber-100 text-amber-700'
    };
  }

  // 3. Evening Review (Only if it's after 20:00)
  const now = new Date();
  if (now.getHours() >= 20) {
    // Just pick the first pet for the review, or cycle.
    const firstPet = pets[0];
    return {
      id: `daily_review_${firstPet.id}_${now.toISOString().split('T')[0]}`,
      petId: firstPet.id,
      petName: firstPet.name,
      type: 'daily_review',
      title: 'Gün Sonu Değerlendirmesi',
      message: `Bugün ${firstPet.name} ile gününüz nasıl geçti? Enerjisi ve iştahı yerinde miydi?`,
      ctaText: 'Değerlendir',
      icon: '🌙',
      gradient: 'from-indigo-50 to-violet-50',
      iconBg: 'bg-indigo-100 text-indigo-700'
    };
  }

  return null;
}
