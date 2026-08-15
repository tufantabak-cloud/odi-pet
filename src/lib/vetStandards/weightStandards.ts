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

import { findBreedByIdOrName, normalizeText } from '@/lib/pets/breedsMaster';

export function findBreedStandard(
  species: string,
  breedRaw: string | null | undefined
): BreedStandard {
  const normSpecies = (species?.toLowerCase() === 'cat' || species?.toLowerCase() === 'kedi') ? 'cat' : 'dog';
  const allStandards = normSpecies === 'cat' ? CAT_STANDARDS : DOG_STANDARDS;
  const fallbackKey = normSpecies === 'cat' ? 'domestic_shorthair' : 'mixed';
  
  if (!breedRaw) {
    return allStandards.find(b => b.breedKey === fallbackKey)!;
  }

  const masterItem = findBreedByIdOrName(breedRaw, normSpecies);
  const searchCandidates = [
    breedRaw,
    masterItem?.id,
    masterItem?.name,
    masterItem?.name_tr,
    masterItem?.name_en,
    ...(masterItem?.aliases || [])
  ].filter(Boolean) as string[];

  for (const cand of searchCandidates) {
    const normCand = normalizeText(cand);
    const found = allStandards.find(b => 
      b.breedKey === normCand || 
      normalizeText(b.displayName) === normCand ||
      normCand.includes(normalizeText(b.displayName)) ||
      normalizeText(b.displayName).includes(normCand)
    );
    if (found) return found;
  }
  
  const normalized = breedRaw.toLowerCase().replace(/[^a-z0-9]/g, '_');
  
  // 1. Exact match by breedKey or displayName
  let found = allStandards.find(b => b.breedKey === normalized || b.displayName.toLowerCase() === breedRaw.toLowerCase());
  if (found) return found;

  // 2. Keyword/substring matching
  const raw = breedRaw.toLowerCase();
  const rawClean = raw.replace(/[^a-z0-9\s]/g, ' ');
  const rawWords = rawClean.split(/\s+/).filter(w => w.length >= 3);
  
  found = allStandards.find(b => {
    const key = b.breedKey.toLowerCase();
    const disp = b.displayName.toLowerCase();
    
    if (raw.includes(key) || key.includes(raw)) return true;
    if (raw.includes(disp) || disp.includes(raw)) return true;
    
    for (const word of rawWords) {
      if (word === 'kopek' || word === 'kedi' || word === 'dog' || word === 'cat' || word === 'mixed' || word === 'melez') {
        continue;
      }
      if (key.includes(word) || disp.includes(word)) return true;
    }
    return false;
  });

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
  species: any
  breed: string | null | undefined
  birthDate: string | Date | null | undefined
  weightKg: number
  isNeutered: boolean
  gender: Gender
  targetWeightKg?: number | null
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

  const normSpecies = (params.species?.toLowerCase() === 'cat' || params.species?.toLowerCase() === 'kedi') ? 'cat' : 'dog';
  const standard = findBreedStandard(normSpecies, params.breed);
  
  const fallbackKey = normSpecies === 'cat' ? 'domestic_shorthair' : 'mixed';
  const isFallback = params.breed 
    ? (standard.breedKey === fallbackKey && 
       params.breed.toLowerCase() !== fallbackKey && 
       !params.breed.toLowerCase().includes('melez') && 
       !params.breed.toLowerCase().includes('sokak') &&
       !params.breed.toLowerCase().includes('mixed')) 
    : true;

  const ageMonths = getAgeInMonths(params.birthDate);
  const profile = standard.profiles.find(p => ageMonths >= p.ageMonthMin && ageMonths <= p.ageMonthMax) || standard.profiles[standard.profiles.length - 1];

  let idealMin = profile.ideal.minKg;
  let idealMax = profile.ideal.maxKg;
  
  if (params.isNeutered) {
    idealMax = idealMax * 0.90;
  }

  if (params.targetWeightKg && params.targetWeightKg > 0) {
    const target = params.targetWeightKg;
    const margin = target * 0.05;
    idealMin = parseFloat((target - margin).toFixed(1));
    idealMax = parseFloat((target + margin).toFixed(1));
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
