import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'

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
    const { vaccine_name, administered_at, next_due_at, notes, administered_by } = body

    if (!vaccine_name) {
      return NextResponse.json({ error: 'Aşı adı zorunludur' }, { status: 400 })
    }

    const { data: newRecord, error } = await supabase
      .from('vaccine_records_v2')
      .insert({
        pet_id: id,
        vaccine_name,
        administered_at: administered_at || null,
        next_due_at: next_due_at || null,
        notes: notes || null,
        administered_by: administered_by || null,
        status: 'done',
        confidence_level: 'high',
        source: 'manual',
        vaccine_code: 'CUSTOM'
      })
      .select()
      .single()

    if (error) throw error

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
      .delete()
      .eq('id', recordId)
      .eq('pet_id', id) // Extra safety check

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
