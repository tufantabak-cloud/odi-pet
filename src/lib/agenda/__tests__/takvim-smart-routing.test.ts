import { describe, it, expect } from 'vitest'
import { getPlanTargetUrl, getPlanActionLabel } from '../takvim-navigation'

describe('Takvim Akıllı Hibrit Yönlendirme (takvim-navigation)', () => {
  describe('getPlanTargetUrl', () => {
    it('Aşı filtresi ve pet_id varken doğrudan /owner/plan-yap/asi?pet_id=... üretmelidir', () => {
      const url = getPlanTargetUrl('asi', 'pet-123')
      expect(url).toBe('/owner/plan-yap/asi?pet_id=pet-123')
    })

    it('Aşı filtresi ve pet_id yokken /owner/plan-yap/asi üretmelidir', () => {
      const url = getPlanTargetUrl('asi', null)
      expect(url).toBe('/owner/plan-yap/asi')
    })

    it('Parazit filtresi ve pet_id varken /owner/plan-yap/parazit?pet_id=... üretmelidir', () => {
      const url = getPlanTargetUrl('parazit', 'pet-456')
      expect(url).toBe('/owner/plan-yap/parazit?pet_id=pet-456')
    })

    it('Bakım filtresi ve pet_id varken /owner/plan-yap/bakim?pet_id=... üretmelidir', () => {
      const url = getPlanTargetUrl('bakim', 'pet-789')
      expect(url).toBe('/owner/plan-yap/bakim?pet_id=pet-789')
    })

    it('Randevu filtresi plan-yap tarafındaki "kontrol" slug ile eşleşmeli ve pet_id aktarılmalıdır', () => {
      const url = getPlanTargetUrl('randevu', 'pet-abc')
      expect(url).toBe('/owner/plan-yap/kontrol?pet_id=pet-abc')
    })

    it('Beslenme filtresi /owner/plan-yap/beslenme?pet_id=... üretmelidir', () => {
      const url = getPlanTargetUrl('beslenme', 'pet-xyz')
      expect(url).toBe('/owner/plan-yap/beslenme?pet_id=pet-xyz')
    })

    it('Tümü seçiliyken ve pet_id varken /owner/plan-yap?pet_id=... üretmelidir', () => {
      const url = getPlanTargetUrl('tumu', 'pet-123')
      expect(url).toBe('/owner/plan-yap?pet_id=pet-123')
    })

    it('Tümü seçiliyken ve pet_id yokken /owner/plan-yap üretmelidir', () => {
      const url = getPlanTargetUrl('tumu', null)
      expect(url).toBe('/owner/plan-yap')
    })
  })

  describe('getPlanActionLabel', () => {
    it('Kategoriye özel doğru etiketleri üretmelidir', () => {
      expect(getPlanActionLabel('asi')).toBe('Aşı Planla')
      expect(getPlanActionLabel('parazit')).toBe('Parazit Planla')
      expect(getPlanActionLabel('bakim')).toBe('Bakım Planla')
      expect(getPlanActionLabel('randevu')).toBe('Randevu Planla')
      expect(getPlanActionLabel('beslenme')).toBe('Beslenme Planla')
      expect(getPlanActionLabel('tumu')).toBe('Rutin Planla')
      expect(getPlanActionLabel('diger')).toBe('Rutin Planla')
    })
  })
})
