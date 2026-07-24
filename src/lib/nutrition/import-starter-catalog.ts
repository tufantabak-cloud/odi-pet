import { createAdminSupabaseClient } from '../supabase/server'
import { assertSafeDatabaseTarget } from './db-safety-barrier'
import {
  STARTER_MANUFACTURERS,
  STARTER_BRANDS,
  STARTER_PRODUCT_FAMILIES,
  getStarterSkuNaturalKey
} from './starter-catalog-data'

export interface ImportResult {
  manufacturersInserted: number
  manufacturersUpdated: number
  manufacturersUnchanged: number

  brandsInserted: number
  brandsUpdated: number
  brandsUnchanged: number

  aliasesInserted: number
  aliasesUpdated: number
  aliasesUnchanged: number

  productFamiliesInserted: number
  productFamiliesUpdated: number
  productFamiliesUnchanged: number

  skusInserted: number
  skusUpdated: number
  skusUnchanged: number

  verifiedWithoutSourceCount: number
  errors: string[]
}

/**
 * GTIN Kontrol Hanesi (EAN/UPC Check Digit) Validatörü
 */
export function isValidGtin(gtin: string | null): boolean {
  if (!gtin) return true
  const clean = gtin.trim()
  if (!/^[0-9]+$/.test(clean) || ![8, 12, 13, 14].includes(clean.length)) {
    return false
  }

  const digits = clean.split('').map(Number)
  const checkDigit = digits.pop()!
  
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    const weight = (digits.length % 2 === 0) ? (i % 2 === 1 ? 3 : 1) : (i % 2 === 0 ? 3 : 1)
    sum += digits[i] * weight
  }
  const calculatedCheck = (10 - (sum % 10)) % 10
  return checkDigit === calculatedCheck
}

function areArraysEqual(arr1: string[] = [], arr2: string[] = []): boolean {
  if (arr1.length !== arr2.length) return false
  const s1 = [...arr1].sort()
  const s2 = [...arr2].sort()
  return s1.every((val, idx) => val === s2[idx])
}

export async function importStarterCatalog(): Promise<ImportResult> {
  // P0 Güvenlik Bariyeri: Bağlantı oluşturulmadan ÖNCE hedef doğrulaması
  const targetUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  assertSafeDatabaseTarget(targetUrl, 'import')

  // Check for duplicate SKUs in starter data
  const skuKeys = new Set<string>()
  for (const family of STARTER_PRODUCT_FAMILIES) {
    const familyKey = `${family.brand_normalized_name}:${family.normalized_name}`
    for (const sku of family.skus) {
      const key = getStarterSkuNaturalKey(familyKey, sku.package_size_grams, sku.package_type, sku.gtin)
      if (skuKeys.has(key)) {
        throw new Error(`DUPLICATE_STARTER_SKU_KEY: ${key}`)
      }
      skuKeys.add(key)
    }
  }

  const supabase = createAdminSupabaseClient()
  const result: ImportResult = {
    manufacturersInserted: 0,
    manufacturersUpdated: 0,
    manufacturersUnchanged: 0,

    brandsInserted: 0,
    brandsUpdated: 0,
    brandsUnchanged: 0,

    aliasesInserted: 0,
    aliasesUpdated: 0,
    aliasesUnchanged: 0,

    productFamiliesInserted: 0,
    productFamiliesUpdated: 0,
    productFamiliesUnchanged: 0,

    skusInserted: 0,
    skusUpdated: 0,
    skusUnchanged: 0,

    verifiedWithoutSourceCount: 0,
    errors: []
  }

  // Pre-fetch all tables with content fields for diff calculation
  const [
    { data: existingManuf },
    { data: existingBrands },
    { data: existingAliases },
    { data: existingFamilies },
    { data: existingSkus }
  ] = await Promise.all([
    supabase.from('food_manufacturers').select('*'),
    supabase.from('food_brands').select('*'),
    supabase.from('food_brand_aliases').select('*'),
    supabase.from('food_product_families').select('*'),
    supabase.from('food_skus').select('*')
  ])

  const manufMap = new Map<string, any>((existingManuf || []).map(m => [m.trade_name, m]))
  const brandMap = new Map<string, any>((existingBrands || []).map(b => [b.normalized_name, b]))
  const aliasMap = new Map<string, any>((existingAliases || []).map(a => [a.normalized_alias, a]))
  const familyMap = new Map<string, any>((existingFamilies || []).map(f => [`${f.brand_id}:${f.normalized_name}`, f]))
  const skuGtinMap = new Map<string, any>((existingSkus || []).filter(s => s.gtin).map(s => [s.gtin!, s]))
  const skuPkgMap = new Map<string, any>((existingSkus || []).map(s => [`${s.product_family_id}:${s.package_size_grams}`, s]))

  // ── 1. IMPORT MANUFACTURERS ──
  for (const mData of STARTER_MANUFACTURERS) {
    try {
      if (mData.verification_status === 'verified' && !mData.source_url) {
        result.verifiedWithoutSourceCount++
      }

      const existing = manufMap.get(mData.trade_name)
      if (existing) {
        const targetStatus = existing.verification_status === 'pending'
          ? 'pending'
          : mData.verification_status

        const isChanged =
          existing.legal_name !== mData.legal_name ||
          existing.country_code !== mData.country_code ||
          existing.official_url !== mData.official_url ||
          existing.source_url !== mData.source_url ||
          existing.verification_status !== targetStatus

        if (isChanged) {
          await supabase
            .from('food_manufacturers')
            .update({
              legal_name: mData.legal_name,
              country_code: mData.country_code,
              official_url: mData.official_url,
              source_url: mData.source_url,
              verification_status: targetStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)

          existing.legal_name = mData.legal_name
          existing.country_code = mData.country_code
          existing.official_url = mData.official_url
          existing.source_url = mData.source_url
          existing.verification_status = targetStatus
          result.manufacturersUpdated++
        } else {
          result.manufacturersUnchanged++
        }
      } else {
        const { data: inserted, error } = await supabase
          .from('food_manufacturers')
          .insert({
            legal_name: mData.legal_name,
            trade_name: mData.trade_name,
            country_code: mData.country_code,
            official_url: mData.official_url,
            source_url: mData.source_url,
            verification_status: mData.verification_status,
            is_active: true
          })
          .select('*')
          .single()

        if (error) throw error
        manufMap.set(mData.trade_name, inserted)
        result.manufacturersInserted++
      }
    } catch (err: any) {
      result.errors.push(`Manufacturer [${mData.trade_name}] error: ${err.message}`)
    }
  }

  // ── 2. IMPORT BRANDS & ALIASES ──
  for (const bData of STARTER_BRANDS) {
    try {
      if (bData.verification_status === 'verified' && !bData.source_url) {
        result.verifiedWithoutSourceCount++
      }

      const m = manufMap.get(bData.manufacturer_trade_name)
      if (!m) {
        result.errors.push(`Manufacturer not found for brand [${bData.display_name}]`)
        continue
      }
      const mId = m.id

      const existing = brandMap.get(bData.normalized_name)
      let brandId: string

      if (existing) {
        brandId = existing.id
        const targetStatus = existing.verification_status === 'pending'
          ? 'pending'
          : bData.verification_status

        const isChanged =
          existing.manufacturer_id !== mId ||
          existing.display_name !== bData.display_name ||
          existing.official_tr_url !== bData.official_tr_url ||
          existing.source_url !== bData.source_url ||
          existing.verification_status !== targetStatus

        if (isChanged) {
          await supabase
            .from('food_brands')
            .update({
              manufacturer_id: mId,
              display_name: bData.display_name,
              official_tr_url: bData.official_tr_url,
              source_url: bData.source_url,
              verification_status: targetStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)

          existing.manufacturer_id = mId
          existing.display_name = bData.display_name
          existing.official_tr_url = bData.official_tr_url
          existing.source_url = bData.source_url
          existing.verification_status = targetStatus
          result.brandsUpdated++
        } else {
          result.brandsUnchanged++
        }
      } else {
        const { data: inserted, error } = await supabase
          .from('food_brands')
          .insert({
            manufacturer_id: mId,
            display_name: bData.display_name,
            normalized_name: bData.normalized_name,
            official_tr_url: bData.official_tr_url,
            source_url: bData.source_url,
            verification_status: bData.verification_status,
            is_active: true
          })
          .select('*')
          .single()

        if (error) throw error
        brandId = inserted.id
        brandMap.set(bData.normalized_name, inserted)
        result.brandsInserted++
      }

      // Import Aliases
      for (const aliasText of bData.aliases) {
        const normalizedAlias = aliasText.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (!normalizedAlias) continue

        const existingAlias = aliasMap.get(normalizedAlias)
        if (existingAlias) {
          if (existingAlias.brand_id !== brandId || existingAlias.alias !== aliasText) {
            await supabase
              .from('food_brand_aliases')
              .update({ brand_id: brandId, alias: aliasText })
              .eq('id', existingAlias.id)

            existingAlias.brand_id = brandId
            existingAlias.alias = aliasText
            result.aliasesUpdated++
          } else {
            result.aliasesUnchanged++
          }
        } else {
          const { data: insertedAlias } = await supabase
            .from('food_brand_aliases')
            .insert({ brand_id: brandId, alias: aliasText, normalized_alias: normalizedAlias })
            .select('*')
            .single()

          if (insertedAlias) aliasMap.set(normalizedAlias, insertedAlias)
          result.aliasesInserted++
        }
      }
    } catch (err: any) {
      result.errors.push(`Brand [${bData.display_name}] error: ${err.message}`)
    }
  }

  // ── 3. IMPORT PRODUCT FAMILIES & SKUS ──
  for (const pfData of STARTER_PRODUCT_FAMILIES) {
    try {
      if (pfData.verification_status === 'verified' && !pfData.source_url) {
        result.verifiedWithoutSourceCount++
      }

      const b = brandMap.get(pfData.brand_normalized_name)
      if (!b) {
        result.errors.push(`Brand not found for family [${pfData.official_name}]`)
        continue
      }
      const brandId = b.id

      const familyKey = `${brandId}:${pfData.normalized_name}`
      const existingFamily = familyMap.get(familyKey)
      let familyId: string

      if (existingFamily) {
        familyId = existingFamily.id
        const targetStatus = existingFamily.verification_status === 'pending'
          ? 'pending'
          : pfData.verification_status

        const isChanged =
          existingFamily.official_name !== pfData.official_name ||
          existingFamily.species !== pfData.species ||
          existingFamily.food_form !== pfData.food_form ||
          existingFamily.nutritional_role !== pfData.nutritional_role ||
          existingFamily.life_stage !== pfData.life_stage ||
          !areArraysEqual(existingFamily.primary_proteins, pfData.primary_proteins) ||
          !areArraysEqual(existingFamily.marketing_claims, pfData.marketing_claims) ||
          existingFamily.source_url !== pfData.source_url ||
          existingFamily.verification_status !== targetStatus

        if (isChanged) {
          await supabase
            .from('food_product_families')
            .update({
              official_name: pfData.official_name,
              species: pfData.species,
              food_form: pfData.food_form,
              nutritional_role: pfData.nutritional_role,
              life_stage: pfData.life_stage,
              primary_proteins: pfData.primary_proteins,
              marketing_claims: pfData.marketing_claims,
              source_url: pfData.source_url,
              verification_status: targetStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingFamily.id)

          existingFamily.official_name = pfData.official_name
          existingFamily.species = pfData.species
          existingFamily.food_form = pfData.food_form
          existingFamily.nutritional_role = pfData.nutritional_role
          existingFamily.life_stage = pfData.life_stage
          existingFamily.primary_proteins = pfData.primary_proteins
          existingFamily.marketing_claims = pfData.marketing_claims
          existingFamily.source_url = pfData.source_url
          existingFamily.verification_status = targetStatus
          result.productFamiliesUpdated++
        } else {
          result.productFamiliesUnchanged++
        }
      } else {
        const { data: inserted, error } = await supabase
          .from('food_product_families')
          .insert({
            brand_id: brandId,
            official_name: pfData.official_name,
            normalized_name: pfData.normalized_name,
            species: pfData.species,
            food_form: pfData.food_form,
            nutritional_role: pfData.nutritional_role,
            life_stage: pfData.life_stage,
            primary_proteins: pfData.primary_proteins,
            marketing_claims: pfData.marketing_claims,
            source_url: pfData.source_url,
            verification_status: pfData.verification_status,
            is_active: true
          })
          .select('*')
          .single()

        if (error) throw error
        familyId = inserted.id
        familyMap.set(familyKey, inserted)
        result.productFamiliesInserted++
      }

      // Import SKUs
      for (const skuData of pfData.skus) {
        if (skuData.verification_status === 'verified' && !skuData.source_url) {
          result.verifiedWithoutSourceCount++
        }

        if (skuData.gtin && !isValidGtin(skuData.gtin)) {
          result.errors.push(`Invalid GTIN check digit for [${skuData.gtin}] in family [${pfData.official_name}]`)
          continue
        }

        const existingSku = skuData.gtin
          ? skuGtinMap.get(skuData.gtin)
          : skuPkgMap.get(`${familyId}:${skuData.package_size_grams}`)

        if (existingSku) {
          const targetStatus = existingSku.verification_status === 'pending'
            ? 'pending'
            : skuData.verification_status

          const isChanged =
            existingSku.gtin !== skuData.gtin ||
            Number(existingSku.package_size_grams) !== Number(skuData.package_size_grams) ||
            existingSku.package_type !== skuData.package_type ||
            existingSku.source_url !== skuData.source_url ||
            existingSku.verification_status !== targetStatus

          if (isChanged) {
            await supabase
              .from('food_skus')
              .update({
                gtin: skuData.gtin,
                package_size_grams: skuData.package_size_grams,
                package_type: skuData.package_type,
                source_url: skuData.source_url,
                verification_status: targetStatus,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingSku.id)

            existingSku.gtin = skuData.gtin
            existingSku.package_size_grams = skuData.package_size_grams
            existingSku.package_type = skuData.package_type
            existingSku.source_url = skuData.source_url
            existingSku.verification_status = targetStatus
            result.skusUpdated++
          } else {
            result.skusUnchanged++
          }
        } else {
          const { data: insertedSku, error: skuErr } = await supabase
            .from('food_skus')
            .insert({
              product_family_id: familyId,
              gtin: skuData.gtin,
              package_size_grams: skuData.package_size_grams,
              package_type: skuData.package_type,
              market_status: 'active',
              source_url: skuData.source_url,
              verification_status: skuData.verification_status
            })
            .select('*')
            .single()

          if (skuErr) {
            result.errors.push(`SKU error in [${pfData.official_name}]: ${skuErr.message}`)
          } else if (insertedSku) {
            if (skuData.gtin) skuGtinMap.set(skuData.gtin, insertedSku)
            skuPkgMap.set(`${familyId}:${skuData.package_size_grams}`, insertedSku)
            result.skusInserted++
          }
        }
      }
    } catch (err: any) {
      result.errors.push(`Family [${pfData.official_name}] error: ${err.message}`)
    }
  }

  return result
}
