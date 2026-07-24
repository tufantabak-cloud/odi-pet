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
  const species = searchParams.get('species')?.trim().toLowerCase()
  const foodForm = searchParams.get('food_form')?.trim().toLowerCase()
  const limitParam = parseInt(searchParams.get('limit') || '20', 10)
  const limit = Math.min(Math.max(isNaN(limitParam) ? 20 : limitParam, 1), 20)

  // Empty query guard: do not return full catalog on empty search without species/form filter
  if (!q && !species && !foodForm) {
    return NextResponse.json({ products: [], data: [], brands: [] })
  }

  if (q && q.length < 2 && !species && !foodForm) {
    return NextResponse.json({ products: [], data: [], brands: [] })
  }

  const supabase = await createServerSupabaseClient()

  // 1. Search in brand aliases if q is present
  let matchedBrandIdsFromAliases: string[] = []
  if (q) {
    const normalizedQ = q.toLowerCase().replace(/[^a-z0-9]/g, '')
    const { data: aliasData } = await supabase
      .from('food_brand_aliases')
      .select('brand_id')
      .or(`alias.ilike.%${q}%,normalized_alias.ilike.%${normalizedQ}%`)
      .limit(20)

    if (aliasData && aliasData.length > 0) {
      matchedBrandIdsFromAliases = aliasData.map(a => a.brand_id)
    }
  }

  // 2. Brand Search (Verified and Active Brands)
  let matchedBrands: { id: string; display_name: string; normalized_name: string }[] = []
  if (q) {
    const normalizedQ = q.toLowerCase().replace(/[^a-z0-9]/g, '')
    let brandQuery = supabase
      .from('food_brands')
      .select('id, display_name, normalized_name, verification_status, is_active')
      .eq('is_active', true)
      .eq('verification_status', 'verified')

    const brandFilter = matchedBrandIdsFromAliases.length > 0
      ? `display_name.ilike.%${q}%,normalized_name.ilike.%${normalizedQ}%,id.in.(${matchedBrandIdsFromAliases.join(',')})`
      : `display_name.ilike.%${q}%,normalized_name.ilike.%${normalizedQ}%`

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

  // 3. Query food_product_families with relations (Verified Product Families)
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
    .eq('verification_status', 'verified')
    .eq('brand.is_active', true)
    .eq('brand.verification_status', 'verified')
    .limit(limit)

  // Filter species (cat / dog / both)
  if (species && (species === 'cat' || species === 'dog')) {
    query = query.in('species', [species, 'both'])
  }

  // Filter food form
  if (foodForm) {
    query = query.eq('food_form', foodForm)
  }

  // Text search on family official_name, brand display_name, or matched aliases
  if (q) {
    const searchFilter = matchedBrandIdsFromAliases.length > 0
      ? `official_name.ilike.%${q}%,brand_id.in.(${matchedBrandIdsFromAliases.join(',')})`
      : `official_name.ilike.%${q}%`

    query = query.or(searchFilter)
  }

  const { data: families, error } = await query

  if (error) {
    console.error('[GET /api/nutrition/catalog/search] Search error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Filter and format response items ensuring manufacturer active/verified if present
  const formattedResults = (families || [])
    .filter((fam: any) => {
      const m = Array.isArray(fam.brand?.manufacturer) ? fam.brand?.manufacturer[0] : fam.brand?.manufacturer
      if (m && (m.is_active === false || m.verification_status !== 'verified')) {
        return false
      }
      return true
    })
    .map((fam: any) => {
      const activeVerifiedSkus = (fam.skus || []).filter(
        (s: any) => s.verification_status === 'verified' && s.market_status === 'active'
      )

      const b = Array.isArray(fam.brand) ? fam.brand[0] : fam.brand
      const m = Array.isArray(b?.manufacturer) ? b?.manufacturer[0] : b?.manufacturer

      return {
        product_family_id: fam.id,
        official_name: fam.official_name,
        species: fam.species,
        food_form: fam.food_form,
        nutritional_role: fam.nutritional_role,
        life_stage: fam.life_stage,
        primary_proteins: fam.primary_proteins,
        marketing_claims: fam.marketing_claims,
        brand: {
          id: b?.id,
          display_name: b?.display_name
        },
        manufacturer: {
          id: m?.id,
          name: m?.trade_name || m?.legal_name || 'Bilinmeyen Üretici'
        },
        skus: activeVerifiedSkus.map((s: any) => ({
          sku_id: s.id,
          gtin: s.gtin,
          package_size_grams: s.package_size_grams,
          package_type: s.package_type
        }))
      }
    })

  return NextResponse.json({
    products: formattedResults,
    data: formattedResults,
    brands: matchedBrands
  })
}
