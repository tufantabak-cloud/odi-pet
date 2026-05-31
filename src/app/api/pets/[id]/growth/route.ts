import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { revalidatePath, revalidateTag } from 'next/cache'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const fd = await req.formData()
  const supabase = await createServerSupabaseClient()

  const { data: ownerRecord } = await supabase
    .from('pet_owners')
    .select('role')
    .eq('pet_id', id)
    .eq('profile_id', user.id)
    .single()

  if (!ownerRecord) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const weight_kg = fd.get('weight_kg')?.toString().replace(',', '.')
  const height_cm = fd.get('height_cm')?.toString().replace(',', '.')
  const recorded_at = fd.get('recorded_at')?.toString()
  
  if (!weight_kg) {
    return NextResponse.json({ error: 'Kilo bilgisi zorunludur.' }, { status: 400 })
  }

  const insertData: any = {
    pet_id: id,
    weight_kg: Number(weight_kg),
    height_cm: height_cm ? Number(height_cm) : null
  }

  if (recorded_at) {
    insertData.recorded_at = new Date(recorded_at).toISOString()
  }

  const { error } = await supabase
    .from('growth_records')
    .insert(insertData)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/owner/dashboard')
  revalidateTag('dashboard', 'default')
  revalidatePath('/owner/pets')
  revalidatePath(`/owner/pets/${id}`)

  return NextResponse.json({ success: true })
}
