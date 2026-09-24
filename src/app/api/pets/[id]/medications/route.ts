import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { hasPetCapability } from '@/lib/pets/access'

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params
    const profile = await getCurrentProfile()
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createServerSupabaseClient()

    const isAdmin = profile.role === 'admin' || profile.role === 'founder'
    if (!isAdmin) {
      const { data: ownership } = await supabase
        .from('pet_owners')
        .select('pet_id')
        .eq('pet_id', id)
        .eq('profile_id', profile.id)
        .single()
      if (!ownership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: meds, error } = await supabase
      .from('health_medications')
      .select('*')
      .eq('pet_id', id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ data: meds || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params
    const profile = await getCurrentProfile()
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createServerSupabaseClient()

    const isAdmin = profile.role === 'admin' || profile.role === 'founder'
    if (!isAdmin) {
      const { data: ownership } = await supabase
        .from('pet_owners')
        .select('pet_id')
        .eq('pet_id', id)
        .eq('profile_id', profile.id)
        .single()
      if (!ownership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const medicationName = (body.medication_name || body.name || body.title || '').trim()
    if (!medicationName) {
      return NextResponse.json({ error: 'İlaç adı zorunludur' }, { status: 400 })
    }

    const dose = body.dose || body.dosage || null
    const usageDuration = body.usage_duration || body.duration || null
    const notes = body.notes || body.note || null
    const frequency = body.frequency || body.schedule || body.freq_type || 'daily'
    const scheduledAt = body.scheduled_at || body.start_date || new Date().toISOString()
    const validScheduledAt = scheduledAt.includes('T') ? scheduledAt : `${scheduledAt}T09:00:00.000Z`

    // 1. Insert into health_medications
    const { data: medRecord, error: medError } = await supabase
      .from('health_medications')
      .insert({
        pet_id: id,
        medication_name: medicationName,
        dose,
        usage_duration: usageDuration,
        is_active: true,
        source: 'manual',
      })
      .select()
      .single()

    if (medError) throw medError

    // 2. Also create a plan in plans table so it appears on calendar and schedule views
    try {
      const { createPlan } = await import('@/lib/plans/service')
      const repeatRule = (frequency === 'none' || frequency === 'once')
        ? 'none'
        : (frequency === 'weekly' ? 'weekly' : 'daily')

      await createPlan(profile.id, {
        pet_id: id,
        category: 'saglik',
        sub_type: 'İlaç',
        title: `${medicationName}${dose ? ` (${dose})` : ''}`,
        scheduled_at: validScheduledAt,
        repeat_rule: repeatRule,
        notif_before: 10,
        notif_unit: 'minute',
        note: notes,
        extra_data: {
          record_type: 'medication',
          medication_id: medRecord.id,
          medication_name: medicationName,
          dose,
          usage_duration: usageDuration,
        },
      })
    } catch (planErr: any) {
      console.warn('[medications/route] Plan creation warning (medication saved):', planErr?.message)
    }

    return NextResponse.json({ data: medRecord }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params
    const profile = await getCurrentProfile()
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createServerSupabaseClient()

    const isAdmin = profile.role === 'admin' || profile.role === 'founder'
    if (!isAdmin) {
      const canManage = await hasPetCapability(supabase, id, 'can_manage_pet_care')
      if (!canManage) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const body = await request.json()
    const { medication_id } = body

    if (!medication_id) {
      return NextResponse.json({ error: 'İlaç ID zorunludur' }, { status: 400 })
    }

    const { error } = await supabase
      .from('health_medications')
      .update({
        is_active: false,
      })
      .eq('id', medication_id)
      .eq('pet_id', id)

    if (error) throw error

    // Also cancel or deactivate any linked plans
    try {
      await supabase
        .from('plans')
        .update({ is_active: false, status: 'cancelled' })
        .eq('pet_id', id)
        .eq('category', 'saglik')
        .eq('sub_type', 'İlaç')
        .contains('extra_data', { medication_id })
    } catch {}

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
