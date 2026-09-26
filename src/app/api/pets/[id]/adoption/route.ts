import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'

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

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })

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
  const { action, story, requirements, city, special_needs, additional_photos } = body // action: 'activate' | 'cancel' | 'complete'

  if (city && typeof city === 'string') {
    await supabase.from('pets').update({ city: city.trim() }).eq('id', id)
  }

  if (action === 'cancel') {
    // Mevcut aktif ilanı iptal et
    const { error } = await supabase
      .from('pet_adoptions')
      .update({ status: 'cancelled' })
      .eq('pet_id', id)
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })

    revalidatePath(`/owner/pets/${id}`)
    revalidateTag(`dashboard-${user.id}`, 'default')
    revalidateTag('dashboard', 'default')
    return NextResponse.json({ success: true, status: 'cancelled' })
  }

  if (action === 'complete') {
    // Mevcut aktif ilanı tamamlandı olarak işaretle
    const { error } = await supabase
      .from('pet_adoptions')
      .update({ status: 'completed' })
      .eq('pet_id', id)
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })

    revalidatePath(`/owner/pets/${id}`)
    revalidateTag(`dashboard-${user.id}`, 'default')
    revalidateTag('dashboard', 'default')
    return NextResponse.json({ success: true, status: 'completed' })
  }

  // Aktif ilan kontrolü
  const { data: existingAdoption } = await supabase
    .from('pet_adoptions')
    .select('id')
    .eq('pet_id', id)
    .eq('status', 'active')
    .single()

  if (existingAdoption) {
    return NextResponse.json(
      { error: 'Bu pet için zaten aktif bir sahiplendirme ilanı var.' },
      { status: 400 }
    )
  }

  // Yeni ilan oluştur (veya mevcut cancelled ilanı varsa yeni kayıt)
  const { data, error } = await supabase
    .from('pet_adoptions')
    .insert({
      pet_id: id,
      user_id: user.id,
      status: 'active',
      story: story || null,
      requirements: requirements || [],
      special_needs: special_needs || null,
      additional_photos: Array.isArray(additional_photos) ? additional_photos : [],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })

  revalidatePath(`/owner/pets/${id}`)
  revalidateTag(`dashboard-${user.id}`, 'default')
  revalidateTag('dashboard', 'default')
  return NextResponse.json({ success: true, adoption: data })
}

const putSchema = z.object({
  story: z.string().min(20, 'Hikaye en az 20 karakter olmalıdır').max(500, 'Hikaye en fazla 500 karakter olmalıdır').optional(),
  requirements: z.array(z.string()).optional(),
  city: z.string().optional(),
  special_needs: z.string().max(500).optional(),
  additional_photos: z.array(z.string()).optional(),
})

// PUT — aktif ilanı düzenle
export async function PUT(req: NextRequest, context: RouteContext) {
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
    return NextResponse.json({ error: 'Sadece sahip veya admin ilanı düzenleyebilir.' }, { status: 403 })
  }

  const body = await req.json()
  const result = putSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json({ error: 'Validation error', details: result.error.format() }, { status: 400 })
  }

  const { story, requirements, city, special_needs, additional_photos } = result.data

  if (city) {
    await supabase.from('pets').update({ city: city.trim() }).eq('id', id)
  }

  const updateData: Record<string, any> = {
    story: story || null, 
    requirements: requirements || [] 
  }
  if (special_needs !== undefined) {
    updateData.special_needs = special_needs || null
  }
  if (additional_photos !== undefined) {
    updateData.additional_photos = additional_photos
  }

  const { data, error } = await supabase
    .from('pet_adoptions')
    .update(updateData)
    .eq('pet_id', id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .select()
    .single()

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })

  revalidatePath(`/owner/pets/${id}`)
  revalidateTag(`dashboard-${user.id}`, 'default')
  revalidateTag('dashboard', 'default')
  
  return NextResponse.json({ success: true, adoption: data })
}
