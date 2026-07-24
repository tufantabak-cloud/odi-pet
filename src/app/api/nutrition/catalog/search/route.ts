import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() || ''
  const brandParam = searchParams.get('brand')?.trim() || ''
  const species = searchParams.get('species')?.trim().toLowerCase()
  const foodForm = searchParams.get('food_form')?.trim().toLowerCase()
  const includePending = searchParams.get('include_pending') === 'true'
  const limitParam = parseInt(searchParams.get('limit') || '20', 10)
  const limit = Math.min(Math.max(isNaN(limitParam) ? 20 : limitParam, 1), 20)

  const searchTarget = q || brandParam

  // Empty query guard: do not return full catalog on empty search without species/form filter
  if (!searchTarget && !species && !foodForm) {
    return NextResponse.json({ products: [], data: [], brands: [] })
  }

  if (searchTarget && searchTarget.length < 2 && !species && !foodForm) {
    return NextResponse.json({ products: [], data: [], brands: [] })
  }

  const supabase = await createServerSupabaseClient()

  // 1. Search in brand aliases if searchTarget is present
  let matchedBrandIdsFromAliases: string[] = []
  if (searchTarget) {
    const normalizedQ = searchTarget.toLowerCase().replace(/[^a-z0-9]/g, '')
    const { data: aliasData } = await supabase
      .from('food_brand_aliases')
      .select('brand_id')
      .or(`alias.ilike.%${searchTarget}%,normalized_alias.ilike.%${normalizedQ}%`)
      .limit(20)

    if (aliasData && aliasData.length > 0) {
      matchedBrandIdsFromAliases = aliasData.map(a => a.brand_id)
    }
  }

  // 2. Brand Search (Verified and Active Brands by default)
  let matchedBrands: { id: string; display_name: string; normalized_name: string }[] = []
  if (searchTarget) {
    const normalizedQ = searchTarget.toLowerCase().replace(/[^a-z0-9]/g, '')
    let brandQuery = supabase
      .from('food_brands')
      .select('id, display_name, normalized_name, verification_status, is_active')
      .eq('is_active', true)

    if (!includePending) {
      brandQuery = brandQuery.eq('verification_status', 'verified')
    } else {
      brandQuery = brandQuery.in('verification_status', ['verified', 'pending'])
    }

    const brandFilter = matchedBrandIdsFromAliases.length > 0
      ? `display_name.ilike.%${searchTarget}%,normalized_name.ilike.%${normalizedQ}%,id.in.(${matchedBrandIdsFromAliases.join(',')})`
      : `display_name.ilike.%${searchTarget}%,normalized_name.ilike.%${normalizedQ}%`

    brandQuery = brandQuery.or(brandFilter).limit(10)
    const { data: brandData } = await brandQuery

    if (brandData && brandData.length > 0) {
      matchedBrands = brandData.map(b => ({
        id: b.id,
        display_name: b.display_name,
        normalized_name: b.normalized_name
      }))
    }
  }

  // 3. Query food_product_families with relations
  let query = supabase
    .from('food_product_families')
    .select(`
      id,
      official_name,
      normalized_name,
      species,
      food_form,
      nutritional_role,
      life_stage,
      primary_proteins,
      marketing_claims,
      verification_status,
      is_active,
      brand:food_brands!inner (
        id,
        display_name,
        normalized_name,
        verification_status,
        is_active,
        manufacturer:food_manufacturers (
          id,
          legal_name,
          trade_name,
          verification_status,
          is_active
        )
      ),
      skus:food_skus (
        id,
        gtin,
        package_size_grams,
        package_type,
        market_status,
        verification_status
      )
    `)
    .eq('is_active', true)
    .eq('brand.is_active', true)
    .limit(limit)

  if (includePending) {
    query = query
      .in('verification_status', ['verified', 'pending'])
      .in('brand.verification_status', ['verified', 'pending'])
  } else {
    query = query
      .eq('verification_status', 'verified')
      .eq('brand.verification_status', 'verified')
  }

  // Filter species (cat / dog / both)
  if (species && (species === 'cat' || species === 'dog')) {
    query = query.in('species', [species, 'both'])
  }

  // Filter food form
  if (foodForm) {
    query = query.eq('food_form', foodForm)
  }

  // Text search on family official_name, brand display_name, or matched aliases
  if (searchTarget) {
    const searchFilter = matchedBrandIdsFromAliases.length > 0
      ? `official_name.ilike.%${searchTarget}%,brand_id.in.(${matchedBrandIdsFromAliases.join(',')})`
      : `official_name.ilike.%${searchTarget}%`

    query = query.or(searchFilter)
  }

  const { data: families, error } = await query

  if (error) {
    console.error('[GET /api/nutrition/catalog/search] Search error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Filter and format response items
  const formattedResults = (families || [])
    .filter((fam: any) => {
      const m = Array.isArray(fam.brand?.manufacturer) ? fam.brand?.manufacturer[0] : fam.brand?.manufacturer
      if (!includePending && m && (m.is_active === false || m.verification_status !== 'verified')) {
        return false
      }
      return true
    })
    .map((fam: any) => {
      const activeSkus = (fam.skus || []).filter(
        (s: any) => includePending || (s.verification_status === 'verified' && s.market_status === 'active')
      )

      const b = Array.isArray(fam.brand) ? fam.brand[0] : fam.brand
      const m = Array.isArray(b?.manufacturer) ? b?.manufacturer[0] : b?.manufacturer

      return {
        product_family_id: fam.id,
        official_name: fam.official_name,
        species: fam.species,
        food_form: fam.food_form,
        verification_status: fam.verification_status,
        nutritional_role: fam.nutritional_role,
        life_stage: fam.life_stage,
        primary_proteins: fam.primary_proteins,
        marketing_claims: fam.marketing_claims,
        brand: {
          id: b?.id,
          display_name: b?.display_name,
          verification_status: b?.verification_status
        },
        manufacturer: {
          id: m?.id,
          name: m?.trade_name || m?.legal_name || 'Bilinmeyen Üretici'
        },
        skus: activeSkus.map((s: any) => ({
          sku_id: s.id,
          gtin: s.gtin,
          package_size_grams: s.package_size_grams,
          package_type: s.package_type,
          verification_status: s.verification_status
        }))
      }
    })

  // Sort verified first, then pending, then alphabetical
  formattedResults.sort((a: any, b: any) => {
    if (a.verification_status === 'verified' && b.verification_status === 'pending') return -1
    if (a.verification_status === 'pending' && b.verification_status === 'verified') return 1
    return a.official_name.localeCompare(b.official_name)
  })

  return NextResponse.json({
    products: formattedResults,
    data: formattedResults,
    brands: matchedBrands
  })
}
