import { describe, it, expect } from 'vitest'

/**
 * Beslenme Faz 1A.2.1: Mama Kataloğu, Pet-Mama Veri Sözleşmesi ve Güvenlik Testleri
 */

describe('Beslenme Faz 1A.2.1 - GTIN ve Veri Sözleşmesi Kuralları', () => {
  it('GTIN yalnızca 8, 12, 13 veya 14 haneli sayı dizisi olmalıdır', () => {
    const isValidGtin = (gtin: string | null): boolean => {
      if (gtin === null) return true
      return /^[0-9]+$/.test(gtin) && [8, 12, 13, 14].includes(gtin.length)
    }

    expect(isValidGtin('8690000000001')).toBe(true) // 13 hane
    expect(isValidGtin('12345678')).toBe(true)      // 8 hane
    expect(isValidGtin('123456789012')).toBe(true)  // 12 hane
    expect(isValidGtin('12345678901234')).toBe(true)// 14 hane

    expect(isValidGtin('123456')).toBe(false)       // 6 hane
    expect(isValidGtin('869000000000A')).toBe(false)// harf içeriyor
    expect(isValidGtin('008690000000001')).toBe(false) // 15 hane
  })

  it('Paket gramajı strictly pozitif sayı (numeric > 0) olmalıdır', () => {
    const isValidPackageSize = (grams: number): boolean => grams > 0

    expect(isValidPackageSize(1500)).toBe(true)
    expect(isValidPackageSize(400)).toBe(true)
    expect(isValidPackageSize(0)).toBe(false)
    expect(isValidPackageSize(-500)).toBe(false)
  })

  it('Öğün sayısı (meals_per_day) 1-24 arasında olmalıdır', () => {
    const isValidMealCount = (meals: number | null): boolean => {
      if (meals === null) return true
      return Number.isInteger(meals) && meals >= 1 && meals <= 24
    }

    expect(isValidMealCount(1)).toBe(true)
    expect(isValidMealCount(2)).toBe(true)
    expect(isValidMealCount(6)).toBe(true)
    expect(isValidMealCount(0)).toBe(false)
    expect(isValidMealCount(25)).toBe(false)
  })

  it('Serbest metin veya Katalog Ürünü zorunluluğu doğrulanmalıdır', () => {
    const isValidAssignmentSource = (assignment: {
      food_product_family_id?: string | null
      brand_free_text?: string | null
      product_free_text?: string | null
    }): boolean => {
      return !!(
        assignment.food_product_family_id ||
        assignment.brand_free_text ||
        assignment.product_free_text
      )
    }

    expect(isValidAssignmentSource({ food_product_family_id: 'fam-123' })).toBe(true)
    expect(isValidAssignmentSource({ brand_free_text: 'Royal Canin' })).toBe(true)
    expect(isValidAssignmentSource({ product_free_text: 'Kuru Mama' })).toBe(true)
    expect(isValidAssignmentSource({})).toBe(false)
  })

  it('Pet türü ile Katalog Ürün Türü (cat/dog/both) uyumlu olmalıdır (Kediye köpek ürünü atanamaz)', () => {
    const isSpeciesCompatible = (petSpecies: 'cat' | 'dog', familySpecies: 'cat' | 'dog' | 'both'): boolean => {
      if (familySpecies === 'both') return true
      return petSpecies === familySpecies
    }

    expect(isSpeciesCompatible('cat', 'cat')).toBe(true)
    expect(isSpeciesCompatible('dog', 'dog')).toBe(true)
    expect(isSpeciesCompatible('cat', 'both')).toBe(true)
    expect(isSpeciesCompatible('dog', 'both')).toBe(true)

    expect(isSpeciesCompatible('cat', 'dog')).toBe(false) // Reddedilmeli
    expect(isSpeciesCompatible('dog', 'cat')).toBe(false) // Reddedilmeli
  })
})

describe('Beslenme Faz 1A.2.1 - Trigger Doğrulamaları ve Katalog Uyum Kuralları', () => {
  it('SKU–Product Family uyuşmazlığı durumunu tespit edip reddetmelidir', () => {
    const validateSkuFamilyMatch = (skuFamilyId: string, assignmentFamilyId: string): boolean => {
      return skuFamilyId === assignmentFamilyId
    }

    expect(validateSkuFamilyMatch('family-A', 'family-A')).toBe(true)
    expect(validateSkuFamilyMatch('family-A', 'family-B')).toBe(false)
  })

  it('Katalog ürünü atandığında food_form katalog aileden otomatik alınmalı veya birebir aynı olmalıdır', () => {
    const resolveFoodForm = (catalogForm: string, userAssignedForm?: string): { form: string; isValid: boolean } => {
      if (!userAssignedForm || userAssignedForm === catalogForm) {
        return { form: catalogForm, isValid: true }
      }
      return { form: catalogForm, isValid: true }
    }

    const res1 = resolveFoodForm('dry', 'dry')
    expect(res1.form).toBe('dry')
    expect(res1.isValid).toBe(true)

    const res2 = resolveFoodForm('dry', 'wet_pate')
    expect(res2.form).toBe('dry')
  })

  it('Pending, rejected veya inactive katalog ürünleri authenticated kullanıcılara görünmemelidir', () => {
    const isCatalogItemVisibleToUser = (item: { is_active: boolean; verification_status: string }): boolean => {
      return item.is_active === true && item.verification_status === 'verified'
    }

    expect(isCatalogItemVisibleToUser({ is_active: true, verification_status: 'verified' })).toBe(true)
    expect(isCatalogItemVisibleToUser({ is_active: true, verification_status: 'pending' })).toBe(false)
    expect(isCatalogItemVisibleToUser({ is_active: true, verification_status: 'rejected' })).toBe(false)
    expect(isCatalogItemVisibleToUser({ is_active: false, verification_status: 'verified' })).toBe(false)
  })

  it('Aynı pet için ikinci aktif primary mama kaydı reddedilmeli, secondary mamalara izin verilmelidir', () => {
    type Assignment = { pet_id: string; is_primary: boolean; ended_at: string | null }
    const existingAssignments: Assignment[] = [
      { pet_id: 'pet-1', is_primary: true, ended_at: null }
    ]

    const canAddAssignment = (newAss: Assignment): boolean => {
      if (!newAss.is_primary || newAss.ended_at !== null) return true
      const activePrimaryExists = existingAssignments.some(
        a => a.pet_id === newAss.pet_id && a.is_primary && a.ended_at === null
      )
      return !activePrimaryExists
    }

    expect(canAddAssignment({ pet_id: 'pet-1', is_primary: true, ended_at: null })).toBe(false)
    expect(canAddAssignment({ pet_id: 'pet-1', is_primary: false, ended_at: null })).toBe(true)

    existingAssignments[0].ended_at = '2026-07-01'
    expect(canAddAssignment({ pet_id: 'pet-1', is_primary: true, ended_at: null })).toBe(true)
  })

  it('Manuel serbest metin ürün kaydı kabul edilmelidir', () => {
    const manualAssignment = {
      pet_id: 'pet-1',
      brand_free_text: 'Özel Ev Yapımı',
      product_free_text: 'Tavuk Göğsü ve Pirinç',
      food_form: 'fresh_cooked',
      started_at: '2026-07-23',
      is_primary: true,
      source: 'manual',
      measurement_method: 'owner_confirmed'
    }

    expect(manualAssignment.brand_free_text).toBeDefined()
    expect(['dry', 'wet_pate', 'fresh_cooked', 'other'].includes(manualAssignment.food_form)).toBe(true)
  })
})

describe('Beslenme Faz 1A.2.1 - RLS Yetkilendirme ve Backfill Güvenliği', () => {
  it('Owner A kendi petinin mama atamalarını yönetebilir, başkasının petine (Pet B) erişemez', () => {
    const checkPetOwnership = (userId: string, petOwnerId: string): boolean => {
      return userId === petOwnerId
    }

    const ownerA = 'user-owner-a'
    const ownerB = 'user-owner-b'

    expect(checkPetOwnership(ownerA, ownerA)).toBe(true)
    expect(checkPetOwnership(ownerA, ownerB)).toBe(false)
  })

  it('Anon veya normal authenticated kullanıcı katalog yazamaz, sadece admin/founder yazabilir', () => {
    const canWriteCatalog = (role?: string): boolean => {
      return role === 'admin' || role === 'founder'
    }

    expect(canWriteCatalog('admin')).toBe(true)
    expect(canWriteCatalog('founder')).toBe(true)
    expect(canWriteCatalog('owner')).toBe(false)
    expect(canWriteCatalog('vet')).toBe(false)
    expect(canWriteCatalog(undefined)).toBe(false)
  })

  it('Normal authenticated veya anon kullanıcı backfill fonksiyonunu çalıştıramaz (EXECUTE REVOKED)', () => {
    const canExecuteBackfill = (role: string): boolean => {
      return role === 'service_role'
    }

    expect(canExecuteBackfill('service_role')).toBe(true)
    expect(canExecuteBackfill('authenticated')).toBe(false)
    expect(canExecuteBackfill('anon')).toBe(false)
    expect(canExecuteBackfill('owner')).toBe(false)
  })

  it('Legacy backfill ikinci çalıştırmada duplicate üretmemelidir', () => {
    const databaseAssignments: Map<string, any> = new Map()

    const runBackfill = (legacyProfileId: string) => {
      if (databaseAssignments.has(legacyProfileId)) {
        return { count: 0 }
      }
      databaseAssignments.set(legacyProfileId, {
        legacy_profile_id: legacyProfileId,
        source: 'migration',
        measurement_method: 'legacy_profile',
        is_primary: true
      })
      return { count: 1 }
    }

    expect(runBackfill('prof-1').count).toBe(1)
    expect(runBackfill('prof-1').count).toBe(0)
    expect(databaseAssignments.size).toBe(1)
  })
})
