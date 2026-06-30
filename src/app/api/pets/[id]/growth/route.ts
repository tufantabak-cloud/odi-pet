import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { revalidatePath, revalidateTag } from 'next/cache'
import { Database } from '@/lib/database.types'

type WeightLogInsert = Database['public']['Tables']['weight_logs']['Insert']

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
  const measured_at = fd.get('measured_at')?.toString()
  
  if (!weight_kg) {
    return NextResponse.json({ error: 'Kilo bilgisi zorunludur.' }, { status: 400 })
  }

  const insertData: WeightLogInsert = {
    pet_id: id,
    weight_kg: Number(weight_kg),
    height_cm: height_cm ? Number(height_cm) : null
  }

  if (measured_at) {
    insertData.measured_at = new Date(measured_at).toISOString()
  }

  const { error } = await supabase
    .from('weight_logs')
    .insert(insertData)

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })

  // ─── Otomatik Kilo & Boy Hatırlatıcısı Güncelleme ──────────────
  // 1. Varsa eski hatırlatıcıyı tamamlandı olarak işaretle
  await supabase
    .from('plans')
    .update({ status: 'completed' })
    .eq('pet_id', id)
    .eq('category', 'saglik')
    .eq('sub_type', 'Kilo & Boy Ölçümü')
    .eq('status', 'active');
    
  // 2. Yeni ölçüm tarihi + 1 ay sonrasına yeni hatırlatıcı kur
  const logDate = measured_at ? new Date(measured_at) : new Date();
  logDate.setMonth(logDate.getMonth() + 1);
  
  await supabase
    .from('plans')
    .insert({
      user_id: user.id,
      pet_id: id,
      category: 'saglik',
      sub_type: 'Kilo & Boy Ölçümü',
      scheduled_at: logDate.toISOString(),
      status: 'active',
      extra_data: { source: 'system', auto_generated: true }
    });

  revalidatePath('/owner/dashboard')
  // @ts-expect-error
  revalidateTag('dashboard')
  revalidatePath('/owner/pets')
  revalidatePath(`/owner/pets/${id}`)

  return NextResponse.json({ success: true })
}
