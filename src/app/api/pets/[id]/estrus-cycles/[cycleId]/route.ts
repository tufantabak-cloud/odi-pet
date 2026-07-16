import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string, cycleId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: petId, cycleId } = await context.params
    const supabase = await createServerSupabaseClient()

    // Sahiplik Doğrulaması
    const { data: ownerRecord } = await supabase
      .from('pet_owners')
      .select('role')
      .eq('pet_id', petId)
      .eq('profile_id', user.id)
      .single()

    if (!ownerRecord) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { data: existingCycle } = await supabase
      .from('pet_estrus_cycles')
      .select('start_date')
      .eq('id', cycleId)
      .eq('pet_id', petId)
      .single()

    if (!existingCycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
    }

    const body = await req.json()
    const { end_date, notes, symptoms } = body

    const todayStr = new Date().toISOString().split('T')[0]
    
    // Tarih Doğrulamaları
    if (end_date) {
      if (end_date < existingCycle.start_date) {
        return NextResponse.json({ error: 'Bitiş tarihi başlangıçtan önce olamaz' }, { status: 400 })
      }
      if (end_date > todayStr) {
        return NextResponse.json({ error: 'Bitiş tarihi bugünden sonra olamaz' }, { status: 400 })
      }
    }

    const updates: any = {}
    if (end_date !== undefined) updates.end_date = end_date || null
    if (notes !== undefined) updates.notes = notes || null
    if (symptoms !== undefined) updates.symptoms = symptoms

    const { data, error } = await supabase
      .from('pet_estrus_cycles')
      .update(updates)
      .eq('id', cycleId)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'ACTIVE_ESTRUS_CYCLE_EXISTS', message: 'Bu pet için devam eden bir kızgınlık dönemi zaten bulunuyor.' }, { status: 409 })
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
  context: { params: Promise<{ id: string, cycleId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: petId, cycleId } = await context.params
    const supabase = await createServerSupabaseClient()

    // Sahiplik Doğrulaması
    const { data: ownerRecord } = await supabase
      .from('pet_owners')
      .select('role')
      .eq('pet_id', petId)
      .eq('profile_id', user.id)
      .single()

    if (!ownerRecord) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error } = await supabase
      .from('pet_estrus_cycles')
      .delete()
      .eq('id', cycleId)
      .eq('pet_id', petId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
