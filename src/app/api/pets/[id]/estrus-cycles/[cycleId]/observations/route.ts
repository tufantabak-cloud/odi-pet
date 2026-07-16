import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string, cycleId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: petId, cycleId } = await context.params
    const supabase = await createServerSupabaseClient()

    // Sahiplik Doğrulaması
    const { data: ownerRecord } = await supabase.from('pet_owners').select('role').eq('pet_id', petId).eq('profile_id', user.id).single()
    if (!ownerRecord) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const { data, error } = await supabase
      .from('pet_estrus_observations')
      .select('*')
      .eq('pet_id', petId)
      .eq('cycle_id', cycleId)
      .order('observation_date', { ascending: false })

    if (error) throw error
    return NextResponse.json({ data }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string, cycleId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: petId, cycleId } = await context.params
    const supabase = await createServerSupabaseClient()

    // Sahiplik Doğrulaması
    const { data: ownerRecord } = await supabase.from('pet_owners').select('role').eq('pet_id', petId).eq('profile_id', user.id).single()
    if (!ownerRecord) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    // Pet kontrolü (Erkek/Kısır engel)
    const { data: pet } = await supabase.from('pets').select('gender, is_neutered').eq('id', petId).single()
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 })
    if (pet.gender === 'male' || pet.is_neutered) {
      return NextResponse.json({ error: 'NOT_ELIGIBLE', message: 'Bu pet için gözlem girilemez.' }, { status: 400 })
    }

    // Döngü Kontrolü (Başlangıç ve Bitiş tarihleri)
    const { data: cycle } = await supabase.from('pet_estrus_cycles').select('start_date, end_date').eq('id', cycleId).eq('pet_id', petId).single()
    if (!cycle) return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })

    const body = await req.json()
    const { observation_date, symptom_code, severity, notes } = body
    
    if (!observation_date || !symptom_code || !severity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const todayStr = new Date().toISOString().split('T')[0]
    
    if (observation_date < cycle.start_date) {
      return NextResponse.json({ error: 'Gözlem tarihi döngü başlangıcından önce olamaz.' }, { status: 400 })
    }
    
    if (cycle.end_date) {
      if (observation_date > cycle.end_date) {
        return NextResponse.json({ error: 'Gözlem tarihi kapalı döngü bitiş tarihinden sonra olamaz.' }, { status: 400 })
      }
    } else {
      if (observation_date > todayStr) {
        return NextResponse.json({ error: 'Gözlem tarihi gelecekte olamaz.' }, { status: 400 })
      }
    }

    if (severity < 1 || severity > 3) {
      return NextResponse.json({ error: 'Geçersiz severity (1-3 olmalı).' }, { status: 400 })
    }

    const { data, error } = await supabase.from('pet_estrus_observations').insert({
      pet_id: petId,
      cycle_id: cycleId,
      observation_date,
      symptom_code,
      severity,
      notes: notes || null,
      source: 'owner_observation',
      created_by: user.id
    }).select().single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'ALREADY_EXISTS', message: 'Bu tarihte bu semptom zaten kaydedilmiş.' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
