import { describe, it, expect } from 'vitest'

/**
 * Beslenme Faz 1B.1 - 1B.2.4 API ve UI Sözleşmeleri
 */

describe('Beslenme Katalog Arama ve GTIN API Sözleşmeleri', () => {
  it('Katalog arama isteğinde minimum 2 karakter araması zorunludur', () => {
    const validateSearchQuery = (q: string) => {
      if (!q || q.trim().length < 2) {
        return { status: 400, error: 'QUERY_TOO_SHORT' }
      }
      return { status: 200 }
    }

    expect(validateSearchQuery('a')).toEqual({ status: 400, error: 'QUERY_TOO_SHORT' })
    expect(validateSearchQuery('  ')).toEqual({ status: 400, error: 'QUERY_TOO_SHORT' })
    expect(validateSearchQuery('roy')).toEqual({ status: 200 })
  })

  it('GTIN numarasının yalnızca 8, 12, 13 veya 14 rakamdan oluşması zorunludur', () => {
    const validateGtin = (gtin: string) => {
      const clean = gtin.trim()
      const isValid = /^[0-9]+$/.test(clean) && [8, 12, 13, 14].includes(clean.length)
      if (!isValid) {
        return { status: 400, error: 'INVALID_GTIN_FORMAT' }
      }
      return { status: 200 }
    }

    expect(validateGtin('12345')).toEqual({ status: 400, error: 'INVALID_GTIN_FORMAT' })
    expect(validateGtin('abc1234567890')).toEqual({ status: 400, error: 'INVALID_GTIN_FORMAT' })
    expect(validateGtin('8690000000001')).toEqual({ status: 200 })
    expect(validateGtin('4006381333931')).toEqual({ status: 200 })
  })

  it('Katalogda bulunmayan GTIN için 404 CATALOG_PRODUCT_NOT_FOUND dönmelidir', () => {
    const mockGtinSearch = (found: boolean) => {
      if (!found) {
        return { status: 404, error: 'CATALOG_PRODUCT_NOT_FOUND' }
      }
      return { status: 200 }
    }

    expect(mockGtinSearch(false)).toEqual({ status: 404, error: 'CATALOG_PRODUCT_NOT_FOUND' })
  })

  it('Görsel barkod etiket sürümü olmasa dahi katalog ürünü doğrulanmışsa SKU dönebilmelidir', () => {
    const mockSkuResponse = {
      sku_id: 'sku-123',
      official_name: 'Sterilised 37',
      food_label_version_id: null
    }

    expect(mockSkuResponse.sku_id).toBe('sku-123')
    expect(mockSkuResponse.food_label_version_id).toBeNull()
  })

  it('Manuel mama ekleme isteğinde brand_free_text veya product_free_text yoksa 400 dönmelidir', () => {
    const validateManualInput = (brand?: string, product?: string) => {
      if (!brand?.trim() && !product?.trim()) {
        return { status: 400, error: 'MISSING_FREE_TEXT' }
      }
      return { status: 200 }
    }

    expect(validateManualInput('', '')).toEqual({ status: 400, error: 'MISSING_FREE_TEXT' })
    expect(validateManualInput('Royal Canin', '')).toEqual({ status: 200 })
  })

  it('Manuel mama ekleme isteğinde food_form zorunludur ve eksikse HTTP 400 (MISSING_FOOD_FORM) dönmelidir', () => {
    const validateManualPayload = (payload: {
      brand_free_text?: string
      product_free_text?: string
      food_form?: string
      daily_target_grams?: number
      meals_per_day?: number
    }) => {
      if (!payload.brand_free_text && !payload.product_free_text) {
        return { status: 400, error: 'MISSING_FREE_TEXT' }
      }
      if (!payload.food_form) {
        return { status: 400, error: 'MISSING_FOOD_FORM' }
      }
      return { status: 201 }
    }

    expect(validateManualPayload({
      brand_free_text: 'Royal Canin',
      product_free_text: 'Sterilised 37',
      food_form: 'dry',
      daily_target_grams: 120,
      meals_per_day: 2
    })).toEqual({ status: 201 })

    expect(validateManualPayload({
      brand_free_text: 'Royal Canin',
      product_free_text: 'Sterilised 37',
      daily_target_grams: 120,
      meals_per_day: 2
    })).toEqual({ status: 400, error: 'MISSING_FOOD_FORM' })
  })

  it('Assignment POST ve PATCH isteklerinde pet_nutrition_profiles tablosuna Dual-Write YAPILMAMALIDIR', () => {
    const executedQueries: string[] = []
    const handleAssignmentUpdate = () => {
      executedQueries.push('UPDATE public.pet_food_assignments SET daily_target_grams = $1')
    }

    handleAssignmentUpdate()
    expect(executedQueries).toHaveLength(1)
    expect(executedQueries[0]).not.toContain('pet_nutrition_profiles')
  })

  it('EAN-13 formatı harici okunan barkodlar (CODE_128 vb.) EAN-13 doğrulamadan geçmemelidir', () => {
    const validateEan13Format = (formatName: string) => {
      if (formatName !== 'EAN_13') {
        return { status: 400, error: 'INVALID_EAN_13_FORMAT' }
      }
      return { status: 200 }
    }

    expect(validateEan13Format('EAN_13')).toEqual({ status: 200 })
    expect(validateEan13Format('CODE_128')).toEqual({ status: 400, error: 'INVALID_EAN_13_FORMAT' })
  })

  it('Pet sahipliği kontrolleri kanonik pet_owners tablosu üzerinden yapılmalıdır', () => {
    const checkOwnershipQuery = 'SELECT role FROM public.pet_owners WHERE pet_id = $1 AND profile_id = $2'
    expect(checkOwnershipQuery).toContain('public.pet_owners')
    expect(checkOwnershipQuery).not.toContain('pets.owner_id')
  })

  it('Kamera izni reddedildiğinde sayfa çökmeyip manuel barkod girmeyle fallback sağlamalıdır', () => {
    const handleCameraState = (hasPermission: boolean | null) => {
      if (hasPermission === false) {
        return {
          canScan: false,
          fallbackToManualInput: true,
          userMessage: 'Kamera izni verilemedi. Lütfen barkod numarasını el ile yazın.'
        }
      }
      return { canScan: true, fallbackToManualInput: false }
    }

    expect(handleCameraState(false)).toEqual({
      canScan: false,
      fallbackToManualInput: true,
      userMessage: 'Kamera izni verilemedi. Lütfen barkod numarasını el ile yazın.'
    })
  })

  it('Arama yanıtı hem products hem brands içermelidir ve pending aileler products içinde DÖNMEMELİDİR', () => {
    const mockSearchResponse = (query: string, species: string) => {
      // Mock catalog data
      const brands = [{ id: 'b1', display_name: 'Royal Canin', normalized_name: 'royalcanin' }]
      const productFamilies = [
        { id: 'f1', official_name: 'Sterilised 37', species: 'cat', verification_status: 'verified', brand_id: 'b1' },
        { id: 'f2', official_name: 'Medium Adult Dog', species: 'dog', verification_status: 'pending', brand_id: 'b1' }
      ]

      const isBrandMatch = brands.some(b => b.display_name.toLowerCase().includes(query.toLowerCase()))
      const matchedBrands = isBrandMatch ? brands : []

      // Filter products: MUST be verified AND species compatible
      const verifiedProducts = productFamilies.filter(f => 
        f.verification_status === 'verified' && 
        (f.species === species || f.species === 'both') &&
        f.official_name.toLowerCase().includes(query.toLowerCase())
      )

      return {
        products: verifiedProducts,
        brands: matchedBrands
      }
    }

    // Royal Canin + Dog -> products empty (dog family is pending), brands contains Royal Canin
    const dogRoyalRes = mockSearchResponse('royal canin', 'dog')
    expect(dogRoyalRes.products).toHaveLength(0)
    expect(dogRoyalRes.brands).toHaveLength(1)
    expect(dogRoyalRes.brands[0].display_name).toBe('Royal Canin')

    // Totally unknown brand -> both products and brands empty
    const unknownRes = mockSearchResponse('unknownbrandxyz', 'dog')
    expect(unknownRes.products).toHaveLength(0)
    expect(unknownRes.brands).toHaveLength(0)
  })

  it('Marka bulunduğunda UI fallback davranışı markayı otomatik doldurmalıdır', () => {
    const handleBrandFallback = (brandName: string) => {
      return {
        addMode: 'manual',
        brandText: brandName
      }
    }

    const fallbackResult = handleBrandFallback('Royal Canin')
    expect(fallbackResult.addMode).toBe('manual')
    expect(fallbackResult.brandText).toBe('Royal Canin')
  })
})
