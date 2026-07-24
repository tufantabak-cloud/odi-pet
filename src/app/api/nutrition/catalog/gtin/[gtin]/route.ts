import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

type RouteContext = {
  params: Promise<{ gtin: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { gtin } = await context.params
  const cleanGtin = gtin?.trim() || ''

  // 1. GTIN format validation: digits only, length 8, 12, 13, 14
  const isValidGtin = /^[0-9]+$/.test(cleanGtin) && [8, 12, 13, 14].includes(cleanGtin.length)
  if (!isValidGtin) {
    return NextResponse.json(
      {
        error: 'INVALID_GTIN_FORMAT',
        message: 'GTIN numarası yalnızca 8, 12, 13 veya 14 rakamdan oluşmalıdır.'
      },
      { status: 400 }
    )
  }

  const supabase = await createServerSupabaseClient()

  // 2. Query food_skus by GTIN joining verified + active chain
  const { data: skuData, error } = await supabase
    .from('food_skus')
    .select(`
      id,
      gtin,
      package_size_grams,
      package_type,
      manufacturer_product_code,
      country_of_origin,
      market_status,
      verification_status,
      product_family:food_product_families!inner (
        id,
        official_name,
        species,
        food_form,
        nutritional_role,
        life_stage,
        target_attributes,
        primary_proteins,
        marketing_claims,
        verification_status,
        is_active,
        brand:food_brands!inner (
          id,
          display_name,
          official_tr_url,
          verification_status,
          is_active,
          manufacturer:food_manufacturers (
            id,
            legal_name,
            trade_name
          )
        )
      ),
      label_versions:food_label_versions (
        id,
        version_label,
        ingredients_raw,
        analytical_constituents,
        additives_raw,
        energy_kcal_per_kg,
        feeding_guide,
        verification_status
      )
    `)
    .eq('gtin', cleanGtin)
    .eq('verification_status', 'verified')
    .eq('market_status', 'active')
    .eq('product_family.verification_status', 'verified')
    .eq('product_family.is_active', true)
    .eq('product_family.brand.verification_status', 'verified')
    .eq('product_family.brand.is_active', true)
    .maybeSingle()

  if (error) {
    console.error('[GET /api/nutrition/catalog/gtin/[gtin]] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!skuData) {
    return NextResponse.json(
      {
        error: 'CATALOG_PRODUCT_NOT_FOUND',
        message: 'Katalogda bu GTIN numarasına sahip aktif ve doğrulanmış bir ürün bulunamadı.'
      },
      { status: 404 }
    )
  }

  const family: any = Array.isArray((skuData as any).product_family)
    ? (skuData as any).product_family[0]
    : (skuData as any).product_family

  const brand: any = Array.isArray(family?.brand) ? family?.brand[0] : family?.brand
  const manufacturer: any = Array.isArray(brand?.manufacturer) ? brand?.manufacturer[0] : brand?.manufacturer

  const verifiedLabel = (skuData.label_versions || []).find(
    (l: any) => l.verification_status === 'verified'
  ) || skuData.label_versions?.[0] || null

  const formattedResponse = {
    food_sku_id: skuData.id,
    gtin: skuData.gtin,
    package_size_grams: skuData.package_size_grams,
    package_type: skuData.package_type,
    country_of_origin: skuData.country_of_origin,
    product_family: family ? {
      id: family.id,
      official_name: family.official_name,
      species: family.species,
      food_form: family.food_form,
      nutritional_role: family.nutritional_role,
      life_stage: family.life_stage,
      target_attributes: family.target_attributes,
      primary_proteins: family.primary_proteins,
      marketing_claims: family.marketing_claims
    } : null,
    brand: brand ? {
      id: brand.id,
      display_name: brand.display_name,
      official_tr_url: brand.official_tr_url
    } : null,
    manufacturer: manufacturer ? {
      id: manufacturer.id,
      name: manufacturer.trade_name || manufacturer.legal_name || 'Bilinmeyen Üretici'
    } : { id: null, name: 'Bilinmeyen Üretici' },
    label: verifiedLabel ? {
      version_label: verifiedLabel.version_label,
      ingredients_raw: verifiedLabel.ingredients_raw,
      analytical_constituents: verifiedLabel.analytical_constituents,
      energy_kcal_per_kg: verifiedLabel.energy_kcal_per_kg,
      feeding_guide: verifiedLabel.feeding_guide
    } : null
  }

  return NextResponse.json({ data: formattedResponse })
}
