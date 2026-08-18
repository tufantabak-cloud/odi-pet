import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { hasPetCapability } from '@/lib/pets/access'

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params
    const profile = await getCurrentProfile()
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = profile.role === 'admin' || profile.role === 'founder'
    const supabase = isAdmin ? createAdminSupabaseClient() : await createServerSupabaseClient()

    if (!isAdmin) {
      const canView = await hasPetCapability(supabase, id, 'can_view_pet')
      if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: allergies, error } = await supabase
      .from('health_allergies')
      .select('*')
      .eq('pet_id', id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ allergies })
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
      const canManage = await hasPetCapability(supabase, id, 'can_manage_pet_care')
      if (!canManage) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const body = await request.json()
    const { trigger_name, symptoms, treatment } = body

    if (!trigger_name) {
      return NextResponse.json({ error: 'Tetikleyici adı zorunludur' }, { status: 400 })
    }

    const { data: allergy, error } = await supabase
      .from('health_allergies')
      .insert({
        pet_id: id,
        trigger_name,
        symptoms: symptoms || null,
        treatment: treatment || null
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ allergy })
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
    const { allergy_id } = body

    if (!allergy_id) {
      return NextResponse.json({ error: 'Alerji ID zorunludur' }, { status: 400 })
    }

    const { error } = await supabase
      .from('health_allergies')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString()
      })
      .eq('id', allergy_id)
      .eq('pet_id', id) // Extra safety check

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
