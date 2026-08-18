export type TakvimCategoryKey = 'asi' | 'parazit' | 'bakim' | 'beslenme' | 'randevu' | 'diger'

/**
 * Takvimdeki aktif kategori filtresine ve seçili can dostuna (petId) göre
 * hedef planlama URL'ini oluşturur.
 */
export function getPlanTargetUrl(category: 'tumu' | TakvimCategoryKey, petId?: string | null): string {
  const query = petId ? `?pet_id=${petId}` : ''
  switch (category) {
    case 'asi':
      return `/owner/plan-yap/asi${query}`
    case 'parazit':
      return `/owner/plan-yap/parazit${query}`
    case 'bakim':
      return `/owner/plan-yap/bakim${query}`
    case 'randevu':
      return `/owner/plan-yap/kontrol${query}`
    case 'beslenme':
      return `/owner/plan-yap/beslenme${query}`
    case 'tumu':
    case 'diger':
    default:
      return `/owner/plan-yap${query}`
  }
}

/**
 * Takvimdeki aktif kategoriye göre kullanıcı dostu aksiyon buton etiketini döner.
 */
export function getPlanActionLabel(category: 'tumu' | TakvimCategoryKey): string {
  switch (category) {
    case 'asi':
      return 'Aşı Planla'
    case 'parazit':
      return 'Parazit Planla'
    case 'bakim':
      return 'Bakım Planla'
    case 'randevu':
      return 'Randevu Planla'
    case 'beslenme':
      return 'Beslenme Planla'
    case 'tumu':
    case 'diger':
    default:
      return 'Rutin Planla'
  }
}
