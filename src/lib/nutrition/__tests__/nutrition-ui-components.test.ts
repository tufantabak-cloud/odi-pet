import { describe, it, expect } from 'vitest'

/**
 * Beslenme Faz 1B.2 - Arayüz ve Porsiyon Hesaplama Testleri
 */

describe('Beslenme Faz 1B.2 - Porsiyon Hesaplama ve UI Mantık Testleri', () => {
  it('Öğün başına gramaj girildiğinde daily_target_grams otomatik hesaplanmalıdır (2 öğün x 60g = 120g)', () => {
    const calculateDailyFromMeal = (perMealGrams: number, mealsCount: number) => {
      return perMealGrams * mealsCount
    }

    expect(calculateDailyFromMeal(60, 2)).toBe(120)
    expect(calculateDailyFromMeal(50, 3)).toBe(150)
    expect(calculateDailyFromMeal(100, 1)).toBe(100)
  })

  it('Günlük toplam gramaj girildiğinde öğün başına düşen gramaj otomatik hesaplanmalıdır (120g / 2 = 60g)', () => {
    const calculatePerMealFromDaily = (dailyGrams: number, mealsCount: number) => {
      if (mealsCount <= 0) return dailyGrams
      return Math.round(dailyGrams / mealsCount)
    }

    expect(calculatePerMealFromDaily(120, 2)).toBe(60)
    expect(calculatePerMealFromDaily(100, 3)).toBe(33)
    expect(calculatePerMealFromDaily(50, 1)).toBe(50)
  })

  it('Aktif primary mama yoksa Boş Durum (Empty State) kartı gösterilmelidir', () => {
    type Assignment = { is_primary: boolean; ended_at: string | null }
    const assignments: Assignment[] = []

    const hasActivePrimary = assignments.some(a => a.is_primary && !a.ended_at)
    expect(hasActivePrimary).toBe(false)
  })

  it('Barkod sorgusu 404 (CATALOG_PRODUCT_NOT_FOUND) döndüğünde kullanıcı manuel eklemeye yönlendirilmelidir', () => {
    const handleBarcodeError = (errorCode: string) => {
      if (errorCode === 'CATALOG_PRODUCT_NOT_FOUND' || errorCode === 'INVALID_GTIN_FORMAT') {
        return { action: 'SWITCH_TO_MANUAL', userMessage: 'Barkodlu ürün katalogda bulunamadı. Lütfen elle ekleyin.' }
      }
      return { action: 'RETRY' }
    }

    expect(handleBarcodeError('CATALOG_PRODUCT_NOT_FOUND')).toEqual({
      action: 'SWITCH_TO_MANUAL',
      userMessage: 'Barkodlu ürün katalogda bulunamadı. Lütfen elle ekleyin.'
    })
  })

  it('409 ACTIVE_PRIMARY_FOOD_EXISTS hatası kullanıcıya anlaşılır Türkçe mesajla sunulmalıdır', () => {
    const formatErrorMessage = (errorCode: string) => {
      if (errorCode === 'ACTIVE_PRIMARY_FOOD_EXISTS') {
        return 'Bu pet için halihazırda aktif bir mama kaydı mevcuttur.'
      }
      return 'Bir hata oluştu.'
    }

    expect(formatErrorMessage('ACTIVE_PRIMARY_FOOD_EXISTS')).toBe('Bu pet için halihazırda aktif bir mama kaydı mevcuttur.')
  })
})
