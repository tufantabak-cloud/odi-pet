import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

type RouteContext = {
  params: Promise<{ id: string }>
}

const ALLOWED_MEASUREMENT_METHODS = [
  'planned_estimate',
  'owner_confirmed',
  'package_scan',
  'admin_verified',
  'legacy_profile'
]

const ALLOWED_SOURCES = ['catalog', 'manual', 'scanner', 'migration']

async function verifyPetOwnership(supabase: any, petId: string, userId: string) {
  const { data: pet } = await supabase
    .from('pets')
    .select('id, species')
    .eq('id', petId)
    .maybeSingle()

  if (!pet) return { isOwner: false, pet: null }

  // Canonical pet ownership check via pet_owners table
  const { data: ownerRecord } = await supabase
    .from('pet_owners')
    .select('role')
    .eq('pet_id', petId)
    .eq('profile_id', userId)
    .maybeSingle()

  return { isOwner: !!ownerRecord, pet }
}

export async function GET(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: petId } = await context.params
  const supabase = await createServerSupabaseClient()

  const { isOwner } = await verifyPetOwnership(supabase, petId, user.id)
  if (!isOwner) {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Bu petin mama verilerine erişim yetkiniz bulunmamaktadır.' }, { status: 403 })
  }

  const { data: assignments, error } = await supabase
    .from('pet_food_assignments')
    .select(`
      *,
      food_product_family:food_product_families (
        id,
        official_name,
        food_form,
        life_stage,
        species,
        brand:food_brands (
          id,
          display_name
        )
      ),
      food_sku:food_skus (
        id,
        gtin,
        package_size_grams,
        package_type
      )
    `)
    .eq('pet_id', petId)
    .order('started_at', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[GET /api/pets/[id]/nutrition/assignments] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: assignments || [] })
}

export async function POST(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: petId } = await context.params
  const supabase = await createServerSupabaseClient()

  const { isOwner, pet } = await verifyPetOwnership(supabase, petId, user.id)
  if (!isOwner || !pet) {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Bu pet için mama ataması yapma yetkiniz bulunmamaktadır.' }, { status: 403 })
  }

  let body: any
  try {
    body = await req.json()
  } catch (e) {
    return NextResponse.json({ error: 'INVALID_JSON', message: 'Geçersiz JSON verisi' }, { status: 400 })
  }

  const {
    food_product_family_id,
    food_sku_id,
    brand_free_text,
    product_free_text,
    daily_target_grams,
    meals_per_day,
    started_at,
    ended_at,
    is_primary = true,
    measurement_method = 'owner_confirmed',
    source = food_product_family_id ? 'catalog' : 'manual'
  } = body

  let food_form = body.food_form

  // 1. Measurement method and source validation
  if (!ALLOWED_MEASUREMENT_METHODS.includes(measurement_method)) {
    return NextResponse.json(
      { error: 'INVALID_MEASUREMENT_METHOD', message: 'Geçersiz ölçüm yöntemi.' },
      { status: 400 }
    )
  }

  if (!ALLOWED_SOURCES.includes(source)) {
    return NextResponse.json(
      { error: 'INVALID_SOURCE', message: 'Geçersiz mama kayıt kaynağı.' },
      { status: 400 }
    )
  }

  // 2. Grams validation
  if (daily_target_grams !== undefined && daily_target_grams !== null) {
    const gramsNum = Number(daily_target_grams)
    if (isNaN(gramsNum) || gramsNum <= 0) {
      return NextResponse.json(
        { error: 'INVALID_DAILY_GRAMS', message: 'Günlük mama hedefi (gram) 0’dan büyük bir sayı olmalıdır.' },
        { status: 400 }
      )
    }
  }

  // 3. Meals per day validation (1..24)
  if (meals_per_day !== undefined && meals_per_day !== null) {
    const mealsNum = Number(meals_per_day)
    if (!Number.isInteger(mealsNum) || mealsNum < 1 || mealsNum > 24) {
      return NextResponse.json(
        { error: 'INVALID_MEALS_PER_DAY', message: 'Öğün sayısı 1 ile 24 arasında tam sayı olmalıdır.' },
        { status: 400 }
      )
    }
  }

  // 4. Catalog assignment validation
  if (food_product_family_id) {
    const { data: family, error: famError } = await supabase
      .from('food_product_families')
      .select('id, species, food_form, verification_status, is_active')
      .eq('id', food_product_family_id)
      .maybeSingle()

    if (famError || !family || !family.is_active || family.verification_status !== 'verified') {
      return NextResponse.json(
        { error: 'INVALID_CATALOG_PRODUCT', message: 'Seçilen katalog ürünü aktif veya doğrulanmış değil.' },
        { status: 400 }
      )
    }

    // Species compatibility check
    if (family.species !== 'both' && family.species !== pet.species) {
      return NextResponse.json(
        { error: 'MISMATCHED_SPECIES', message: `Bu ürün (${family.species === 'cat' ? 'Kedi' : 'Köpek'}) ile pet türü (${pet.species === 'cat' ? 'Kedi' : 'Köpek'}) uyuşmamaktadır.` },
        { status: 400 }
      )
    }

    food_form = family.food_form
  } else {
    // 5. Manual assignment validation
    if (!brand_free_text && !product_free_text) {
      return NextResponse.json(
        { error: 'MISSING_FREE_TEXT', message: 'Katalog dışı mama kaydında marka veya ürün adı girilmesi zorunludur.' },
        { status: 400 }
      )
    }

    if (!food_form) {
      return NextResponse.json(
        { error: 'MISSING_FOOD_FORM', message: 'Mama formu (kuru, yaş, ev yapımı vb.) belirtilmelidir.' },
        { status: 400 }
      )
    }
  }

  // 6. Active Primary Guard
  if (is_primary && !ended_at) {
    const { data: activePrimary } = await supabase
      .from('pet_food_assignments')
      .select('id')
      .eq('pet_id', petId)
      .eq('is_primary', true)
      .is('ended_at', null)
      .maybeSingle()

    if (activePrimary) {
      return NextResponse.json(
        {
          error: 'ACTIVE_PRIMARY_FOOD_EXISTS',
          message: 'Bu pet için halihazırda aktif bir birincil (primary) mama tanımı bulunmaktadır. Lütfen önce mevcut aktif mamayı sonlandırın veya ikincil (secondary) olarak ekleyin.'
        },
        { status: 409 }
      )
    }
  }

  // Insert assignment record directly into single source of truth: pet_food_assignments
  const payload = {
    pet_id: petId,
    food_product_family_id: food_product_family_id || null,
    food_sku_id: food_sku_id || null,
    brand_free_text: brand_free_text || null,
    product_free_text: product_free_text || null,
    food_form,
    daily_target_grams: daily_target_grams ? Number(daily_target_grams) : null,
    meals_per_day: meals_per_day ? Number(meals_per_day) : null,
    started_at: started_at || new Date().toISOString().split('T')[0],
    ended_at: ended_at || null,
    is_primary: !!is_primary,
    measurement_method,
    source,
    created_by: user.id
  }

  const { data: inserted, error: insertError } = await supabase
    .from('pet_food_assignments')
    .insert(payload)
    .select('*')
    .single()

  if (insertError) {
    if (insertError.code === '23505' || insertError.message.includes('idx_pet_food_assignments_single_active_primary')) {
      return NextResponse.json(
        {
          error: 'ACTIVE_PRIMARY_FOOD_EXISTS',
          message: 'Bu pet için halihazırda aktif bir birincil (primary) mama tanımı bulunmaktadır.'
        },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: insertError.message }, { status: 400 })
  }

  // Single Source of Truth: ZERO writes to legacy pet_nutrition_profiles table!
  return NextResponse.json({ data: inserted }, { status: 201 })
}
