/**
 * Pet Vaccination Algorithm
 * Generates a care plan based on species and birth date.
 */

export interface VaccinationTask {
  title: string;
  description: string;
  daysAfterBirth: number;
}

const DOG_VACCINES: VaccinationTask[] = [
  { title: 'Puppy DP (Başlangıç Aşısı)', description: 'Distemper + Parvovirus (6. Hafta)', daysAfterBirth: 42 },
  { title: 'Karma Aşı (DHPPi) (1. Doz)', description: 'Distemper, Hepatitis, Parvovirus, Parainfluenza', daysAfterBirth: 49 },
  { title: 'Leptospira (L) (1. Doz)', description: 'Leptospirosis koruması (8. Hafta)', daysAfterBirth: 56 },
  { title: 'Karma Aşı (DHPPi) (2. Doz)', description: 'DHPP Booster', daysAfterBirth: 70 },
  { title: 'Corona Virüs (C) (1. Doz)', description: 'Sindirim sistemi koruması', daysAfterBirth: 77 },
  { title: 'Leptospira (L) (2. Doz)', description: 'Leptospira Booster', daysAfterBirth: 77 },
  { title: 'Boğmaca (Bordetella) (1. Doz)', description: 'Kennel Cough koruması', daysAfterBirth: 84 },
  { title: 'Corona Virüs (C) (2. Doz)', description: 'Corona Booster', daysAfterBirth: 98 },
  { title: 'Boğmaca (Bordetella) (2. Doz)', description: 'Boğmaca Booster', daysAfterBirth: 105 },
  { title: 'Kuduz Aşısı (Rabies)', description: 'Yasal zorunluluk', daysAfterBirth: 112 },
  { title: 'Karma Aşı (DHPPi) (Yıllık)', description: 'Yıllık tekrar dozu', daysAfterBirth: 365 },
  { title: 'Boğmaca (Bordetella) (Yıllık)', description: 'Yıllık tekrar dozu', daysAfterBirth: 365 },
  { title: 'Leptospira (L) (Yıllık)', description: 'Yıllık tekrar dozu', daysAfterBirth: 365 },
  { title: 'Kuduz (Rabies) (Yıllık)', description: 'Yıllık tekrar dozu', daysAfterBirth: 375 },
];

const CAT_VACCINES: VaccinationTask[] = [
  { title: 'Karma Aşı (FVRCP) (1. Doz)', description: 'Rhinotracheitis, Calicivirus, Panleukopenia', daysAfterBirth: 56 },
  { title: 'Karma Aşı (FVRCP) (2. Doz)', description: 'FVRCP Booster', daysAfterBirth: 77 },
  { title: 'Lösemi Aşısı (FeLV) (1. Doz)', description: 'Feline Leukemia koruması', daysAfterBirth: 84 },
  { title: 'Lösemi Aşısı (FeLV) (2. Doz)', description: 'Lösemi Booster', daysAfterBirth: 105 },
  { title: 'Kuduz Aşısı (Rabies)', description: 'Yasal zorunluluk', daysAfterBirth: 112 },
  { title: 'Karma Aşı (FVRCP) (Yıllık)', description: 'Yıllık tekrar dozu', daysAfterBirth: 365 },
  { title: 'Kuduz (Rabies) (Yıllık)', description: 'Yıllık tekrar dozu', daysAfterBirth: 375 },
];

export function generateVaccinationPlan(birthDateStr: string, species: string) {
  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate.getTime())) return [];

  const vaccines = species === 'Kedi' ? CAT_VACCINES : DOG_VACCINES;
  
  return vaccines.map(v => {
    const dueDate = new Date(birthDate);
    dueDate.setDate(dueDate.getDate() + v.daysAfterBirth);
    
    return {
      title: v.title,
      description: v.description,
      due_date: dueDate.toISOString(),
    };
  });
}
