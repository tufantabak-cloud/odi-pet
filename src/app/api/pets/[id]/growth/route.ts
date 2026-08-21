import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { revalidatePath } from 'next/cache'
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
  const measured_at = (fd.get('measured_at') || fd.get('recorded_at'))?.toString()

  if (!weight_kg) {
    return NextResponse.json({ error: 'Kilo bilgisi zorunludur.' }, { status: 400 })
  }

  const weightValue = Number(weight_kg)
  const measuredAtIso = measured_at ? new Date(measured_at).toISOString() : new Date().toISOString()

  // ─── Tekilleştirme (aynı gün çift kayıt engeli) ─────────────────────────
  const dayStart = new Date(measuredAtIso); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(measuredAtIso); dayEnd.setHours(23, 59, 59, 999)
  const { data: dupes } = await supabase
    .from('weight_logs')
    .select('id')
    .eq('pet_id', id)
    .or('is_archived.is.null,is_archived.eq.false')
    .gte('measured_at', dayStart.toISOString())
    .lte('measured_at', dayEnd.toISOString())
    .limit(1)

  if (dupes && dupes.length > 0) {
    return NextResponse.json({
      error: 'Bu tarih için zaten bir kilo/boy ölçüm kaydı bulunmaktadır. Bir gün içinde yalnızca 1 kayıt eklenebilir.'
    }, { status: 400 })
  }

  const insertData: WeightLogInsert = {
    pet_id: id,
    weight_kg: weightValue,
    height_cm: height_cm ? Number(height_cm) : null,
    measured_at: measuredAtIso,
  }

  const { error } = await supabase
    .from('weight_logs')
    .insert(insertData)

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })

  // ─── Otomatik Kilo & Boy Hatırlatıcısı Güncelleme ──────────────
  await supabase
    .from('plans')
    .update({ status: 'completed' })
    .eq('pet_id', id)
    .eq('category', 'saglik')
    .eq('sub_type', 'Kilo & Boy Ölçümü')
    .eq('status', 'active');
    
  const logDate = new Date(measuredAtIso);
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

  revalidatePath(`/owner/pets/${id}`)
  return NextResponse.json({ success: true })
}
