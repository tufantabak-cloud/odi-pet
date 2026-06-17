export interface SmartInsight {
  id: string;
  petId: string;
  petName: string;
  type: 'appetite_loss' | 'weight_loss' | 'other';
  title: string;
  message: string;
  ctaText: string;
  actionUrl: string;
  icon: string;
  gradient: string;
  iconBg: string;
}

export function detectAnomalies(pets: any[], feedingLogs: any[], weightLogs: any[]): SmartInsight | null {
  if (!pets || pets.length === 0) return null;

  for (const pet of pets) {
    // 1. Düşük İştah Tespiti (Son 3 gündeki kayıtlar)
    const petFeedingLogs = feedingLogs.filter(log => log.pet_id === pet.id);
    if (petFeedingLogs.length >= 3) {
      // Sort by date desc (assuming they are already, but just to be sure)
      const recentLogs = [...petFeedingLogs].sort((a, b) => new Date(b.meal_time).getTime() - new Date(a.meal_time).getTime()).slice(0, 3);
      
      const isLowAppetite = recentLogs.every(log => (log.appetite_score || 0) <= 2);
      
      if (isLowAppetite) {
        return {
          id: `insight_appetite_${pet.id}_${new Date().toISOString().split('T')[0]}`,
          petId: pet.id,
          petName: pet.name,
          type: 'appetite_loss',
          title: 'Dikkat: İştah Düşüklüğü',
          message: `${pet.name} son 3 öğününde iştahsız görünüyor. AI Veterinerimize danışmak veya bir not bırakmak ister misiniz?`,
          ctaText: 'AI Veteriner\'e Sor',
          actionUrl: `/owner/ai-vet?pet=${pet.id}&topic=appetite`,
          icon: '⚠️',
          gradient: 'from-orange-50 to-red-50',
          iconBg: 'bg-orange-100 text-orange-700'
        };
      }
    }

    // 2. Kilo Kaybı Tespiti
    const petWeightLogs = weightLogs.filter(log => log.pet_id === pet.id);
    if (petWeightLogs.length >= 2) {
      // Sort by date desc
      const recentWeights = [...petWeightLogs].sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime());
      
      const currentWeight = recentWeights[0].weight_kg;
      const previousWeight = recentWeights[1].weight_kg;

      if (currentWeight > 0 && previousWeight > 0) {
        const dropPercentage = ((previousWeight - currentWeight) / previousWeight) * 100;
        
        if (dropPercentage >= 5) {
          return {
            id: `insight_weight_${pet.id}_${new Date().toISOString().split('T')[0]}`,
            petId: pet.id,
            petName: pet.name,
            type: 'weight_loss',
            title: 'Hızlı Kilo Kaybı',
            message: `${pet.name} son ölçümünden bu yana %${dropPercentage.toFixed(1)} oranında kilo kaybetmiş. Beslenme planını gözden geçirelim mi?`,
            ctaText: 'Beslenme Modülü',
            actionUrl: `/owner/pets/${pet.id}/nutrition`,
            icon: '📉',
            gradient: 'from-rose-50 to-red-50',
            iconBg: 'bg-rose-100 text-rose-700'
          };
        }
      }
    }
  }

  return null;
}
