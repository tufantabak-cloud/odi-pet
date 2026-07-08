import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 })

  // Pet ownership check (RLS check is automatic, but let's do a strict check on pets.owner_id)
  const { data: pet } = await supabase
    .from('pets')
    .select('id, owner_id')
    .eq('id', id)
    .maybeSingle()
    
  if (!pet || pet.owner_id !== user.id) {
    return NextResponse.json({ error: 'Can dostu bulunamadı.' }, { status: 404 })
  }

  const { setup_mode } = await req.json()
  if (!['smart_start', 'historical_import', 'fresh_start'].includes(setup_mode)) {
    return NextResponse.json({ error: 'Geçersiz kurulum seçeneği.' }, { status: 400 })
  }

  // UPSERT
  const { data, error } = await supabase
    .from('vaccine_setup_profiles')
    .upsert(
      { pet_id: id, setup_mode },
      { onConflict: 'pet_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 })

  const { data } = await supabase
    .from('vaccine_setup_profiles')
    .select('*')
    .eq('pet_id', id)
    .maybeSingle()

  return NextResponse.json(data ?? null)
}
