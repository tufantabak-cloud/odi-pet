import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: petId } = await context.params
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

    // Profil Bariyeri (Cinsiyet, Kısırlaştırma)
    const { data: pet } = await supabase
      .from('pets')
      .select('gender, is_neutered, species')
      .eq('id', petId)
      .single()

    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 })
    
    if (pet.gender === 'male') {
      return NextResponse.json({ error: 'ESTRUS_TRACKING_FEMALE_ONLY', message: 'Erkek petler kızgınlık döngüsü kaydı oluşturamaz.' }, { status: 400 })
    }
    if (pet.is_neutered) {
      return NextResponse.json({ error: 'NEUTERED_PET', message: 'Kısırlaştırılmış bir pette kızgınlık belirtisi gözlemliyorsanız veterinerinize danışın.' }, { status: 400 })
    }

    const body = await req.json()
    const { start_date, end_date, notes, symptoms } = body

    if (!start_date) {
      return NextResponse.json({ error: 'Başlangıç tarihi zorunludur' }, { status: 400 })
    }

    // Tarih Doğrulamaları
    const todayStr = new Date().toISOString().split('T')[0]
    if (start_date > todayStr) {
      return NextResponse.json({ error: 'Başlangıç tarihi gelecekte olamaz' }, { status: 400 })
    }

    if (end_date) {
      if (end_date < start_date) {
        return NextResponse.json({ error: 'Bitiş tarihi başlangıçtan önce olamaz' }, { status: 400 })
      }
      if (end_date > todayStr) {
        return NextResponse.json({ error: 'Bitiş tarihi bugünden sonra olamaz' }, { status: 400 })
      }
    }

    // Açık dönem varken ikinci kayıt (backend check + unique index)
    if (!end_date) {
      const { data: existingActive } = await supabase
        .from('pet_estrus_cycles')
        .select('id')
        .eq('pet_id', petId)
        .is('end_date', null)
        .maybeSingle()
        
      if (existingActive) {
        return NextResponse.json({ error: 'ACTIVE_ESTRUS_CYCLE_EXISTS', message: 'Bu pet için devam eden bir kızgınlık dönemi zaten bulunuyor.' }, { status: 409 })
      }
    }

    const { data, error } = await supabase
      .from('pet_estrus_cycles')
      .insert({
        pet_id: petId,
        start_date,
        end_date: end_date || null,
        notes: notes || null,
        symptoms: symptoms || []
      })
      .select()
      .single()

    if (error) {
      // Unique index conflict check
      if (error.code === '23505') {
        return NextResponse.json({ error: 'ACTIVE_ESTRUS_CYCLE_EXISTS', message: 'Bu pet için devam eden bir kızgınlık dönemi zaten bulunuyor.' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
