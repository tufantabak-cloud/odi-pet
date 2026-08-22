import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { revalidatePath } from 'next/cache'
import { hasPetCapability } from '@/lib/pets/access'

type Params = { params: Promise<{ id: string }> }

async function assertOwner(petId: string, userId: string) {
  const supabase = await createServerSupabaseClient()
  const canManage = await hasPetCapability(supabase, petId, 'can_manage_pet_care')
  if (canManage) return true

  const { data } = await supabase
    .from('pet_owners')
    .select('role')
    .eq('pet_id', petId)
    .eq('profile_id', userId)
    .maybeSingle()

  return !!data
}

// GET — weight log history (last 20 entries, ascending for chart)
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!(await assertOwner(id, user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('pet_id', id)
    .or('is_archived.is.null,is_archived.eq.false')
    .order('measured_at', { ascending: true })
    .limit(20)

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })
  return NextResponse.json({ logs: data ?? [] })
}

// POST — add weight log
export async function POST(req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!(await assertOwner(id, user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const supabase = await createServerSupabaseClient()

  const weightKg = body.weight_kg != null ? Number(body.weight_kg) : NaN
  if (!body.weight_kg || isNaN(weightKg) || weightKg <= 0) {
    return NextResponse.json({ error: 'Geçerli bir kilo değeri giriniz.' }, { status: 400 })
  }

  // ─── Aynı Gün Çift Kayıt Engeli ──────────────
  const measuredAtIso = body.measured_at ? new Date(body.measured_at).toISOString() : new Date().toISOString()
  const dayStart = new Date(measuredAtIso); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(measuredAtIso); dayEnd.setHours(23, 59, 59, 999)

  const { data: existingSameDay } = await supabase
    .from('weight_logs')
    .select('id')
    .eq('pet_id', id)
    .or('is_archived.is.null,is_archived.eq.false')
    .gte('measured_at', dayStart.toISOString())
    .lte('measured_at', dayEnd.toISOString())
    .limit(1)

  if (existingSameDay && existingSameDay.length > 0) {
    return NextResponse.json({
      error: 'Bu tarih için zaten bir kilo/boy ölçüm kaydı bulunmaktadır. Bir gün içinde yalnızca 1 kayıt eklenebilir. Mevcut kaydı değiştirmek isterseniz aşağıdaki "Geçmiş Ölçümler" listesindeki Düzenle (✏️) butonunu kullanabilirsiniz.'
    }, { status: 400 })
  }

  const { data, error } = await supabase

    .from('weight_logs')
    .insert({
      pet_id: id,
      weight_kg: weightKg,
      height_cm: body.height_cm ? Number(body.height_cm) : null,
      body_condition_score: body.body_condition_score ? Number(body.body_condition_score) : null,
      measured_at: body.measured_at ?? new Date().toISOString(),
      notes: body.notes ?? null,
    })
    .select()
    .single()

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
  const logDate = body.measured_at ? new Date(body.measured_at) : new Date();
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

  // Track event
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/analytics/onboarding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'weight_logged', payload: { pet_id: id, weight_kg: body.weight_kg } }),
  }).catch(() => {})

  revalidatePath(`/owner/pets/${id}/nutrition`)
  return NextResponse.json({ log: data })
}
