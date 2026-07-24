import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

type RouteContext = {
  params: Promise<{ id: string; assignmentId: string }>
}

const ALLOWED_MEASUREMENT_METHODS = [
  'planned_estimate',
  'owner_confirmed',
  'package_scan',
  'admin_verified',
  'legacy_profile'
]

async function verifyPetOwnership(supabase: any, petId: string, userId: string) {
  // Canonical pet ownership check via pet_owners table
  const { data: ownerRecord } = await supabase
    .from('pet_owners')
    .select('role')
    .eq('pet_id', petId)
    .eq('profile_id', userId)
    .maybeSingle()

  return !!ownerRecord
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: petId, assignmentId } = await context.params
  const supabase = await createServerSupabaseClient()

  const isOwner = await verifyPetOwnership(supabase, petId, user.id)
  if (!isOwner) {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Bu petin mama verilerini güncelleme yetkiniz bulunmamaktadır.' }, { status: 403 })
  }

  // Verify target assignment exists and belongs to this pet
  const { data: existingAssignment, error: fetchErr } = await supabase
    .from('pet_food_assignments')
    .select('*')
    .eq('id', assignmentId)
    .maybeSingle()

  if (fetchErr || !existingAssignment || existingAssignment.pet_id !== petId) {
    return NextResponse.json({ error: 'ASSIGNMENT_NOT_FOUND', message: 'Güncellenmek istenen mama kaydı bulunamadı.' }, { status: 404 })
  }

  let body: any
  try {
    body = await req.json()
  } catch (e) {
    return NextResponse.json({ error: 'INVALID_JSON', message: 'Geçersiz JSON verisi' }, { status: 400 })
  }

  const allowedUpdates: any = {}

  // 1. Grams validation
  if (body.daily_target_grams !== undefined) {
    if (body.daily_target_grams === null) {
      allowedUpdates.daily_target_grams = null
    } else {
      const gramsNum = Number(body.daily_target_grams)
      if (isNaN(gramsNum) || gramsNum <= 0) {
        return NextResponse.json(
          { error: 'INVALID_DAILY_GRAMS', message: 'Günlük mama hedefi (gram) 0’dan büyük olmalıdır.' },
          { status: 400 }
        )
      }
      allowedUpdates.daily_target_grams = gramsNum
    }
  }

  // 2. Meals per day validation
  if (body.meals_per_day !== undefined) {
    if (body.meals_per_day === null) {
      allowedUpdates.meals_per_day = null
    } else {
      const mealsNum = Number(body.meals_per_day)
      if (!Number.isInteger(mealsNum) || mealsNum < 1 || mealsNum > 24) {
        return NextResponse.json(
          { error: 'INVALID_MEALS_PER_DAY', message: 'Öğün sayısı 1 ile 24 arasında tam sayı olmalıdır.' },
          { status: 400 }
        )
      }
      allowedUpdates.meals_per_day = mealsNum
    }
  }

  if (body.measurement_method !== undefined) {
    if (!ALLOWED_MEASUREMENT_METHODS.includes(body.measurement_method)) {
      return NextResponse.json(
        { error: 'INVALID_MEASUREMENT_METHOD', message: 'Geçersiz ölçüm yöntemi.' },
        { status: 400 }
      )
    }
    allowedUpdates.measurement_method = body.measurement_method
  }

  if (body.ended_at !== undefined) allowedUpdates.ended_at = body.ended_at || null
  if (body.is_primary !== undefined) allowedUpdates.is_primary = !!body.is_primary
  if (body.brand_free_text !== undefined) allowedUpdates.brand_free_text = body.brand_free_text || null
  if (body.product_free_text !== undefined) allowedUpdates.product_free_text = body.product_free_text || null
  if (body.food_form !== undefined) allowedUpdates.food_form = body.food_form

  allowedUpdates.updated_at = new Date().toISOString()

  const targetIsPrimary = allowedUpdates.is_primary !== undefined ? allowedUpdates.is_primary : existingAssignment.is_primary
  const targetEndedAt = allowedUpdates.ended_at !== undefined ? allowedUpdates.ended_at : existingAssignment.ended_at

  // 3. Active Primary Guard
  if (targetIsPrimary && !targetEndedAt) {
    const { data: otherActivePrimary } = await supabase
      .from('pet_food_assignments')
      .select('id')
      .eq('pet_id', petId)
      .eq('is_primary', true)
      .is('ended_at', null)
      .neq('id', assignmentId)
      .maybeSingle()

    if (otherActivePrimary) {
      return NextResponse.json(
        {
          error: 'ACTIVE_PRIMARY_FOOD_EXISTS',
          message: 'Bu pet için halihazırda başka bir aktif birincil (primary) mama kaydı bulunmaktadır.'
        },
        { status: 409 }
      )
    }
  }

  const { data: updated, error: updateErr } = await supabase
    .from('pet_food_assignments')
    .update(allowedUpdates)
    .eq('id', assignmentId)
    .select('*')
    .single()

  if (updateErr) {
    if (updateErr.code === '23505' || updateErr.message.includes('idx_pet_food_assignments_single_active_primary')) {
      return NextResponse.json(
        {
          error: 'ACTIVE_PRIMARY_FOOD_EXISTS',
          message: 'Bu pet için halihazırda başka bir aktif birincil (primary) mama kaydı bulunmaktadır.'
        },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: updateErr.message }, { status: 400 })
  }

  // Single Source of Truth: ZERO writes to legacy pet_nutrition_profiles table!
  return NextResponse.json({ data: updated })
}
