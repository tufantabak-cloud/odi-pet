import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { normalizeConfidenceLevel } from '@/lib/vaccines/confidenceLevels'

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params
    const profile = await getCurrentProfile()
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = profile.role === 'admin' || profile.role === 'founder'
    const supabase = isAdmin ? createAdminSupabaseClient() : await createServerSupabaseClient()

    if (!isAdmin) {
      const { data: ownership } = await supabase
        .from('pet_owners')
        .select('pet_id')
        .eq('pet_id', id)
        .eq('profile_id', profile.id)
        .single()

      if (!ownership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: vaccineRecords, error } = await supabase
      .from('vaccine_records_v2')
      .select('*')
      .eq('pet_id', id)
      .order('administered_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data: vaccineRecords })
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

    const { data: ownership } = await supabase
      .from('pet_owners')
      .select('pet_id')
      .eq('pet_id', id)
      .eq('profile_id', profile.id)
      .single()

    if (!ownership && profile.role !== 'admin' && profile.role !== 'founder') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { vaccine_name, administered_at, next_due_at, notes, confidence_level } = body

    if (!vaccine_name) {
      return NextResponse.json({ error: 'Aşı adı zorunludur' }, { status: 400 })
    }

    const { processRecordCreation } = await import('@/lib/agenda/write-handlers/write-service')
    const adminSupabase = createAdminSupabaseClient()

    const context = {
      supabase,
      rpcSupabase: adminSupabase,
      petId: id,
      userId: profile.id,
      timeZone: 'Europe/Istanbul',
      idempotencyKey: body.idempotency_key || crypto.randomUUID(),
    }

    const adminDate = administered_at
      ? (administered_at.includes('T') ? administered_at.split('T')[0] : administered_at)
      : new Date().toISOString().split('T')[0]

    const vaccineInput = {
      pet_id: id,
      vaccine_name,
      vaccine_code: body.vaccine_code || 'CUSTOM',
      dose_number: body.dose_number ? Number(body.dose_number) : 1,
      administered_at: adminDate,
      next_due_date: next_due_at || undefined,
      notes: notes || undefined,
      brand_id: body.brand_id || undefined,
      brand_name: body.brand_name || undefined,
    }

    const { result } = await processRecordCreation(
      'asi',
      vaccineInput,
      context,
      body.plan_id || undefined
    )

    // Optional: update confidence_level if custom provided
    if (confidence_level) {
      await adminSupabase
        .from('vaccine_records_v2')
        .update({
          confidence_level: normalizeConfidenceLevel(confidence_level)
        })
        .eq('id', result.recordId)
    }

    const { data: newRecord, error: fetchError } = await adminSupabase
      .from('vaccine_records_v2')
      .select('*')
      .eq('id', result.recordId)
      .single()

    if (fetchError || !newRecord) {
      return NextResponse.json({ error: 'Aşı kaydı oluşturulamadı' }, { status: 500 })
    }

    return NextResponse.json({ data: newRecord })
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

    const { data: ownership } = await supabase
      .from('pet_owners')
      .select('pet_id')
      .eq('pet_id', id)
      .eq('profile_id', profile.id)
      .single()

    if (!ownership && profile.role !== 'admin' && profile.role !== 'founder') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const recordId = searchParams.get('recordId')

    if (!recordId) {
      return NextResponse.json({ error: 'Kayıt ID zorunludur' }, { status: 400 })
    }

    const { error } = await supabase
      .from('vaccine_records_v2')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString()
      })
      .eq('id', recordId)
      .eq('pet_id', id) // Extra safety check

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
