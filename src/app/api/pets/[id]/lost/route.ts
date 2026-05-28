import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { revalidatePath } from 'next/cache'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createServerSupabaseClient()

  // This is intentionally allowed without auth for SOS public link usage
  const { data, error } = await supabase
    .from('lost_reports')
    .select('*')
    .eq('pet_id', id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ report: data || null })
}

export async function POST(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const { last_seen_location, contact_phone } = await req.json()
  const supabase = await createServerSupabaseClient()

  // Verify ownership or admin role
  const { data: callerRole } = await supabase.rpc('user_pet_role', { p_pet_id: id })
  if (!callerRole || !['owner', 'admin'].includes(callerRole)) {
    return NextResponse.json({ error: 'Yetkisiz: Sadece pet sahibi kayıp ilanı açabilir' }, { status: 403 })
  }

  // Check if already active
  const { data: existing } = await supabase
    .from('lost_reports')
    .select('id')
    .eq('pet_id', id)
    .eq('status', 'active')
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Bu pet için zaten aktif bir kayıp ilanı var' }, { status: 400 })
  }

  const { error } = await supabase
    .from('lost_reports')
    .insert({
      pet_id: id,
      last_seen_location,
      contact_phone,
      status: 'active'
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath(`/owner/pets/${id}`)
  
  return NextResponse.json({ success: true, message: 'Kayıp ilanı başarıyla oluşturuldu.' })
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const { status } = await req.json()
  const supabase = await createServerSupabaseClient()

  // Verify ownership or admin role
  const { data: callerRole } = await supabase.rpc('user_pet_role', { p_pet_id: id })
  if (!callerRole || !['owner', 'admin'].includes(callerRole)) {
    return NextResponse.json({ error: 'Yetkisiz işlem' }, { status: 403 })
  }

  if (status !== 'found') {
    return NextResponse.json({ error: 'Geçersiz durum' }, { status: 400 })
  }

  const { error } = await supabase
    .from('lost_reports')
    .update({ status: 'found' })
    .eq('pet_id', id)
    .eq('status', 'active')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath(`/owner/pets/${id}`)
  
  return NextResponse.json({ success: true, message: 'Petiniz bulundu olarak işaretlendi. İlan kapatıldı.' })
}
