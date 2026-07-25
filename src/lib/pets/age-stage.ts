export const PET_AGE_STAGES = {
  junior: {
    key: 'junior',
    label: 'Yavru',
    minAgeYears: 0,
    maxAgeYearsExclusive: 1,
  },
  adult: {
    key: 'adult',
    label: 'Yetişkin',
    minAgeYears: 1,
    maxAgeYearsExclusive: 7,
  },
  senior: {
    key: 'senior',
    label: 'Yaşlı',
    minAgeYears: 7,
    maxAgeYearsExclusive: 12,
  },
  senior_12plus: {
    key: 'senior_12plus',
    label: 'Yaşlı (12+)',
    minAgeYears: 12,
    maxAgeYearsExclusive: null,
  },
} as const

export type PetAgeStageKey = keyof typeof PET_AGE_STAGES
export type PetAgeStage = (typeof PET_AGE_STAGES)[PetAgeStageKey]

/**
 * Kedi ve köpekler için ortak Odi.Pet yaş skalası.
 * Aralıklar çakışmayı önlemek için alt sınır dahil, üst sınır hariçtir.
 */
export function getPetAgeStage(ageInYears: number): PetAgeStage | null {
  if (!Number.isFinite(ageInYears) || ageInYears < 0) return null
  if (ageInYears < 1) return PET_AGE_STAGES.junior
  if (ageInYears < 7) return PET_AGE_STAGES.adult
  if (ageInYears < 12) return PET_AGE_STAGES.senior
  return PET_AGE_STAGES.senior_12plus
}

export function getCompletedPetAgeYears(
  birthDate: string | Date | null | undefined,
  referenceDate: Date = new Date()
): number | null {
  if (!birthDate) return null

  const born = birthDate instanceof Date
    ? new Date(birthDate.getTime())
    : new Date(birthDate)

  if (
    Number.isNaN(born.getTime())
    || Number.isNaN(referenceDate.getTime())
    || born > referenceDate
  ) {
    return null
  }

  let years = referenceDate.getFullYear() - born.getFullYear()
  const birthdayHasPassed =
    referenceDate.getMonth() > born.getMonth()
    || (
      referenceDate.getMonth() === born.getMonth()
      && referenceDate.getDate() >= born.getDate()
    )

  if (!birthdayHasPassed) years -= 1
  return years >= 0 ? years : null
}

export function getPetAgeStageFromBirthDate(
  birthDate: string | Date | null | undefined,
  referenceDate: Date = new Date()
): PetAgeStage | null {
  const ageInYears = getCompletedPetAgeYears(birthDate, referenceDate)
  return ageInYears === null ? null : getPetAgeStage(ageInYears)
}
