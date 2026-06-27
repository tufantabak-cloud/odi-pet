import { Database } from '@/types'

export type PetRow = Database['public']['Tables']['pets']['Row']
export type VaccineRecordRow = Database['public']['Tables']['vaccine_records']['Row']
export type PetGalleryRow = Database['public']['Tables']['pet_gallery']['Row']
export type PetExpenseRow = Database['public']['Tables']['pet_expenses']['Row']
export type PetCareEventRow = Database['public']['Tables']['pet_care_events']['Row']

export interface CareScoreParams {
  pet: PetRow
  vaccineRecordsLength: number
  galleryCount: number
  currentMonthExpenses: number
  todayCompletedEvents: number
  hasRecentWeight: boolean
  hasActiveBreedingListing?: boolean
  hasApprovedMatch?: boolean
}

export interface CareScoreBreakdown {
  vaccines: boolean
  gallery: boolean
  expenses: boolean
  events: boolean
  profile: boolean
  weight: boolean
}

export interface CareScoreAction {
  label: string
  href: string
  points: number
}

export interface CareScoreResult {
  total: number
  breakdown: CareScoreBreakdown
  nextAction: CareScoreAction | null
}

export function calculatePetCareScore({
  pet,
  vaccineRecordsLength,
  galleryCount,
  currentMonthExpenses,
  todayCompletedEvents,
  hasRecentWeight,
  hasActiveBreedingListing = false,
  hasApprovedMatch = false,
}: CareScoreParams): CareScoreResult {
  let total = 0
  const breakdown: CareScoreBreakdown = {
    vaccines: false,
    gallery: false,
    expenses: false,
    events: false,
    profile: false,
    weight: false,
  }

  // 1. Aşı Kaydı (+25)
  if (vaccineRecordsLength >= 1) {
    total += 25
    breakdown.vaccines = true
  }

  // 2. Fotoğraf Yükleme (+20)
  if (galleryCount >= 1) {
    total += 20
    breakdown.gallery = true
  }

  // 3. Bütçe Girişi (+20)
  if (currentMonthExpenses >= 1) {
    total += 20
    breakdown.expenses = true
  }

  // 4. Günlük Görev (+20)
  if (todayCompletedEvents >= 1) {
    total += 20
    breakdown.events = true
  }

  // 5. Profil Tamlığı (+15)
  if (pet.is_neutered !== null && pet.birth_date) {
    total += 15
    breakdown.profile = true
  }

  // 6. Kilo Takibi (+10)
  if (hasRecentWeight) {
    total += 10
    breakdown.weight = true
  }

  // 7. Aktif Üreme İlanı (+10)
  if (hasActiveBreedingListing) {
    total += 10
  }

  // 8. Onaylı Eşleşme (+15)
  if (hasApprovedMatch) {
    total += 15
  }

  // Sınırlandırma (maks 135)
  const MAX_SCORE = 135
  if (total > MAX_SCORE) total = MAX_SCORE

  // Eksik maddeyi bul ve nextAction oluştur
  let nextAction: CareScoreAction | null = null

  if (!hasApprovedMatch) {
    nextAction = { label: 'Eşleşme başvurusu yap', href: 'social', points: 15 }
  } else if (!hasActiveBreedingListing) {
    nextAction = { label: 'Üreme ilanı oluştur', href: 'social', points: 10 }
  } else if (!breakdown.vaccines) {
    nextAction = { label: 'Aşı kaydı', href: 'vaccines', points: 25 }
  } else if (!breakdown.gallery) {
    nextAction = { label: 'Fotoğraf', href: 'gallery', points: 20 }
  } else if (!breakdown.expenses) {
    nextAction = { label: 'Harcama', href: 'budget', points: 20 }
  } else if (!breakdown.events) {
    // Profil tab'i olmadığı için görevler anchor olarak veya tab olarak açılabilir
    nextAction = { label: 'Günlük görev', href: '#tasks', points: 20 }
  } else if (!breakdown.profile) {
    // Ayarlar / Profili düzenle linki varsayımıyla (dashboard veya pet detayda genel olarak modals ile yapılıyor)
    nextAction = { label: 'Profil bilgisi', href: 'settings', points: 15 }
  } else if (!breakdown.weight) {
    nextAction = { label: 'Kilo ölç', href: '/owner/pets/[petId]/nutrition', points: 10 }
  }

  return {
    total,
    breakdown,
    nextAction,
  }
}
