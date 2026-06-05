import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { revalidatePath, revalidateTag } from 'next/cache'

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET — pet'in mevcut aktif sahiplendirme ilanını getir
export async function GET(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const supabase = await createServerSupabaseClient()

  const { data: ownerRecord } = await supabase
    .from('pet_owners')
    .select('role')
    .eq('pet_id', id)
    .eq('profile_id', user.id)
    .single()

  if (!ownerRecord) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('pet_adoptions')
    .select('*')
    .eq('pet_id', id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ adoption: data })
}

// POST — ilan oluştur veya durumunu güncelle (toggle: active ↔ cancelled)
export async function POST(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const supabase = await createServerSupabaseClient()

  const { data: ownerRecord } = await supabase
    .from('pet_owners')
    .select('role')
    .eq('pet_id', id)
    .eq('profile_id', user.id)
    .single()

  if (!ownerRecord || !['owner', 'admin'].includes(ownerRecord.role)) {
    return NextResponse.json({ error: 'Sadece sahip veya admin ilan oluşturabilir.' }, { status: 403 })
  }

  const body = await req.json()
  const { action, story } = body // action: 'activate' | 'cancel'

  if (action === 'cancel') {
    // Mevcut aktif ilanı iptal et
    const { error } = await supabase
      .from('pet_adoptions')
      .update({ status: 'cancelled' })
      .eq('pet_id', id)
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    revalidatePath(`/owner/pets/${id}`)
    revalidateTag('dashboard')
    return NextResponse.json({ success: true, status: 'cancelled' })
  }

  // Yeni ilan oluştur (veya mevcut cancelled ilanı varsa yeni kayıt)
  const { data, error } = await supabase
    .from('pet_adoptions')
    .insert({
      pet_id: id,
      user_id: user.id,
      status: 'active',
      story: story || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath(`/owner/pets/${id}`)
  revalidateTag('dashboard')
  return NextResponse.json({ success: true, adoption: data })
}
