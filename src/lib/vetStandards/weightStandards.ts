export type Species = 'cat' | 'dog'
export type Gender  = 'male' | 'female' | 'unknown'
export type WeightStatus = 'underweight' | 'ideal' | 'overweight' | 'unknown'

export interface WeightRange {
  minKg: number
  maxKg: number
  label: string
}

export interface AgeWeightProfile {
  ageMonthMin: number
  ageMonthMax: number   // 999 = sınırsız
  ideal: WeightRange
  overweight: number
  underweight: number
}

export interface BreedStandard {
  breedKey: string       // lowercase, normalize edilmiş
  displayName: string
  species: Species
  profiles: AgeWeightProfile[]
}

export interface WeightAssessment {
  status: WeightStatus
  idealMin: number
  idealMax: number
  overweightThreshold: number
  underweightThreshold: number
  diffKg: number         // pozitif = fazla, negatif = eksik, 0 = ideal
  isFallback: boolean    // ırk bulunamadı, genel profil kullanıldı
}

function generateProfiles(
  adultMin: number, adultMax: number, adultOver: number, adultUnder: number
): AgeWeightProfile[] {
  return [
    {
      ageMonthMin: 0, ageMonthMax: 2,
      ideal: { minKg: adultMin * 0.2, maxKg: adultMax * 0.2, label: '0-2 ay' },
      overweight: adultOver * 0.2,
      underweight: adultUnder * 0.2
    },
    {
      ageMonthMin: 3, ageMonthMax: 5,
      ideal: { minKg: adultMin * 0.5, maxKg: adultMax * 0.5, label: '3-5 ay' },
      overweight: adultOver * 0.5,
      underweight: adultUnder * 0.5
    },
    {
      ageMonthMin: 6, ageMonthMax: 11,
      ideal: { minKg: adultMin * 0.8, maxKg: adultMax * 0.8, label: '6-11 ay' },
      overweight: adultOver * 0.8,
      underweight: adultUnder * 0.8
    },
    {
      ageMonthMin: 12, ageMonthMax: 999,
      ideal: { minKg: adultMin, maxKg: adultMax, label: '12 ay+' },
      overweight: adultOver,
      underweight: adultUnder
    }
  ]
}

export const CAT_STANDARDS: BreedStandard[] = [
  { breedKey: 'domestic_shorthair', displayName: 'Tekir / Karışık', species: 'cat', profiles: generateProfiles(3.5, 5.5, 6.0, 3.0) },
  { breedKey: 'persian', displayName: 'İran Kedisi', species: 'cat', profiles: generateProfiles(3.0, 5.5, 6.5, 2.5) },
  { breedKey: 'maine_coon', displayName: 'Maine Coon', species: 'cat', profiles: generateProfiles(4.5, 8.0, 9.0, 4.0) },
  { breedKey: 'british_shorthair', displayName: 'British Shorthair', species: 'cat', profiles: generateProfiles(4.0, 7.0, 8.0, 3.5) }
]

export const DOG_STANDARDS: BreedStandard[] = [
  { breedKey: 'golden_retriever', displayName: 'Golden Retriever', species: 'dog', profiles: generateProfiles(25.0, 34.0, 36.0, 22.0) },
  { breedKey: 'labrador_retriever', displayName: 'Labrador Retriever', species: 'dog', profiles: generateProfiles(25.0, 36.0, 38.0, 23.0) },
  { breedKey: 'german_shepherd', displayName: 'Alman Çoban', species: 'dog', profiles: generateProfiles(22.0, 40.0, 43.0, 20.0) },
  { breedKey: 'beagle', displayName: 'Beagle', species: 'dog', profiles: generateProfiles(9.0, 11.5, 13.0, 8.0) },
  { breedKey: 'poodle_miniature', displayName: 'Minyatür Kaniş', species: 'dog', profiles: generateProfiles(3.5, 7.0, 8.0, 3.0) },
  { breedKey: 'chihuahua', displayName: 'Chihuahua', species: 'dog', profiles: generateProfiles(1.5, 3.0, 3.5, 1.2) },
  { breedKey: 'border_collie', displayName: 'Border Collie', species: 'dog', profiles: generateProfiles(14.0, 20.0, 23.0, 12.0) },
  { breedKey: 'mixed', displayName: 'Melez / Sokak', species: 'dog', profiles: generateProfiles(10.0, 30.0, 35.0, 8.0) }
]

export function findBreedStandard(
  species: Species,
  breedRaw: string | null | undefined
): BreedStandard {
  const allStandards = species === 'cat' ? CAT_STANDARDS : DOG_STANDARDS;
  const fallbackKey = species === 'cat' ? 'domestic_shorthair' : 'mixed';
  
  if (!breedRaw) {
    return allStandards.find(b => b.breedKey === fallbackKey)!;
  }
  
  const normalized = breedRaw.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const found = allStandards.find(b => b.breedKey === normalized || b.displayName.toLowerCase() === breedRaw.toLowerCase());
  
  if (found) return found;
  
  return allStandards.find(b => b.breedKey === fallbackKey)!;
}

export function getAgeInMonths(birthDate: string | Date): number {
  const bDate = new Date(birthDate);
  const now = new Date();
  let months = (now.getFullYear() - bDate.getFullYear()) * 12 + (now.getMonth() - bDate.getMonth());
  if (now.getDate() < bDate.getDate()) {
    months--;
  }
  return Math.max(0, months);
}

export function assessWeight(params: {
  species: Species
  breed: string | null | undefined
  birthDate: string | Date | null | undefined
  weightKg: number
  isNeutered: boolean
  gender: Gender
}): WeightAssessment {
  if (!params.birthDate) {
    return {
      status: 'unknown',
      idealMin: 0,
      idealMax: 0,
      overweightThreshold: 0,
      underweightThreshold: 0,
      diffKg: 0,
      isFallback: false
    }
  }

  const allStandards = params.species === 'cat' ? CAT_STANDARDS : DOG_STANDARDS;
  const normalized = params.breed ? params.breed.toLowerCase().replace(/[^a-z0-9]/g, '_') : '';
  const exactMatch = params.breed ? allStandards.some(b => b.breedKey === normalized || b.displayName.toLowerCase() === params.breed?.toLowerCase()) : false;
  const isFallback = !params.breed || !exactMatch;

  const standard = findBreedStandard(params.species, params.breed);
  const ageMonths = getAgeInMonths(params.birthDate);
  const profile = standard.profiles.find(p => ageMonths >= p.ageMonthMin && ageMonths <= p.ageMonthMax) || standard.profiles[standard.profiles.length - 1];

  const idealMin = profile.ideal.minKg;
  let idealMax = profile.ideal.maxKg;
  
  if (params.isNeutered) {
    idealMax = idealMax * 0.90;
  }

  const overweightThreshold = profile.overweight;
  const underweightThreshold = profile.underweight;

  let status: WeightStatus = 'ideal';
  let diffKg = 0;

  if (params.weightKg > idealMax) {
    status = 'overweight';
    diffKg = params.weightKg - idealMax;
  } else if (params.weightKg < idealMin) {
    status = 'underweight';
    diffKg = params.weightKg - idealMin;
  }

  return {
    status,
    idealMin,
    idealMax,
    overweightThreshold,
    underweightThreshold,
    diffKg,
    isFallback
  }
}
