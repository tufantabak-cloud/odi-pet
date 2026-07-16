import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string, cycleId: string, obsId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: petId, cycleId, obsId } = await context.params
    const supabase = await createServerSupabaseClient()

    // Sahiplik Doğrulaması
    const { data: ownerRecord } = await supabase.from('pet_owners').select('role').eq('pet_id', petId).eq('profile_id', user.id).single()
    if (!ownerRecord) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const body = await req.json()
    // Sadece whitelist: observation_date, symptom_code, severity, notes
    const { observation_date, symptom_code, severity, notes } = body

    const updates: any = {}
    if (severity !== undefined) {
      if (severity < 1 || severity > 3) return NextResponse.json({ error: 'Geçersiz severity' }, { status: 400 })
      updates.severity = severity
    }
    if (notes !== undefined) updates.notes = notes || null
    if (observation_date !== undefined) {
      // Date checks
      const { data: cycle } = await supabase.from('pet_estrus_cycles').select('start_date, end_date').eq('id', cycleId).single()
      if (!cycle) return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
      
      const todayDate = new Date()
      const obsDate = new Date(observation_date)
      const startDate = new Date(cycle.start_date)
      
      if (obsDate > todayDate) {
        return NextResponse.json({ error: 'Tarih gelecekte olamaz.' }, { status: 400 })
      }
      if (obsDate < startDate) {
        return NextResponse.json({ error: 'Tarih döngü başlangıcından önce olamaz.' }, { status: 400 })
      }
      if (cycle.end_date) {
        const endDate = new Date(cycle.end_date)
        endDate.setHours(23, 59, 59, 999)
        if (obsDate > endDate) {
          return NextResponse.json({ error: 'Tarih kapalı döngü bitiş tarihinden sonra olamaz.' }, { status: 400 })
        }
      }
      updates.observation_date = observation_date
    }
    if (symptom_code !== undefined) updates.symptom_code = symptom_code

    const { data, error } = await supabase
      .from('pet_estrus_observations')
      .update(updates)
      .eq('id', obsId)
      .eq('pet_id', petId)
      .eq('cycle_id', cycleId)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // unique violation
        return NextResponse.json({ error: 'Bu belirti aynı gün için zaten kayıtlı.', code: 'DUPLICATE_OBSERVATION' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ data }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string, cycleId: string, obsId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: petId, cycleId, obsId } = await context.params
    const supabase = await createServerSupabaseClient()

    // Sahiplik Doğrulaması
    const { data: ownerRecord } = await supabase.from('pet_owners').select('role').eq('pet_id', petId).eq('profile_id', user.id).single()
    if (!ownerRecord) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const { error } = await supabase
      .from('pet_estrus_observations')
      .delete()
      .eq('id', obsId)
      .eq('pet_id', petId)
      .eq('cycle_id', cycleId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
