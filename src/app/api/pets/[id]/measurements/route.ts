import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { hasPetCapability } from '@/lib/pets/access'
import { z } from 'zod'

const measurementSchema = z.object({
  measurement_type: z.string().min(1, 'Measurement type is required'),
  value: z.number(),
  unit: z.string().min(1, 'Unit is required'),
  measured_at: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()

  const canView = await hasPetCapability(supabase, id, 'can_view_pet')
  if (!canView) {
    return NextResponse.json({ error: 'Bu pet için görüntüleme yetkiniz yok.' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('pet_id', id)
    .or('is_archived.is.null,is_archived.eq.false')
    .order('measured_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Map to measurement format for HealthTab
  const mappedData = (data || []).map(log => ({
    id: log.id,
    measurement_type: 'weight',
    value: log.weight_kg,
    unit: 'kg',
    measured_at: log.measured_at
  }))

  return NextResponse.json(mappedData)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()
  const canManage = await hasPetCapability(supabase, id, 'can_manage_pet_care')
  if (!canManage) {
    return NextResponse.json({ error: 'Bu pet için bakım yönetme yetkiniz yok.' }, { status: 403 })
  }

  const body = await req.json()
  const result = measurementSchema.safeParse(body)
  
  if (!result.success) {
    return NextResponse.json({ error: 'Validation error', details: result.error.format() }, { status: 400 })
  }

  const measuredAt = result.data.measured_at || new Date().toISOString()
  const weightValue = result.data.measurement_type === 'weight' ? result.data.value : null

  // ─── Tekilleştirme (çift gönderim koruması) ─────────────────────────
  // Aynı gün + aynı kilo değeri zaten varsa yeni ölçüm/plan oluşturma.
  if (weightValue !== null) {
    const dayStart = new Date(measuredAt); dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(measuredAt); dayEnd.setHours(23, 59, 59, 999)
    const { data: dupes } = await supabase
      .from('weight_logs')
      .select('id, measured_at')
      .eq('pet_id', id)
      .eq('weight_kg', weightValue)
      .or('is_archived.is.null,is_archived.eq.false')
      .gte('measured_at', dayStart.toISOString())
      .lte('measured_at', dayEnd.toISOString())
      .limit(1)

    if (dupes && dupes.length > 0) {
      return NextResponse.json({ success: true, idempotent: true, measurement: {
        id: dupes[0].id, measurement_type: 'weight', value: weightValue, unit: 'kg', measured_at: dupes[0].measured_at
      }})
    }
  }

  const { data: measurement, error } = await supabase
    .from('weight_logs')
    .insert({
      pet_id: id,
      weight_kg: weightValue,
      measured_at: measuredAt,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // ─── Otomatik Kilo & Boy Hatırlatıcısı Güncelleme ──────────────
  await supabase
    .from('plans')
    .update({ status: 'completed' })
    .eq('pet_id', id)
    .eq('category', 'saglik')
    .eq('sub_type', 'Kilo & Boy Ölçümü')
    .eq('status', 'active');

  const logDate = new Date(measuredAt);
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

  // 🚀 Referral Qualification Check 🚀
  try {
    const { checkPendingReferrals } = await import('@/lib/referral/checkPendingReferrals')
    await checkPendingReferrals(user.id)
  } catch (refErr) {
    console.error('[API/Measurements] checkPendingReferrals error:', refErr)
  }

  return NextResponse.json({ success: true, measurement: {
    id: measurement.id,
    measurement_type: 'weight',
    value: measurement.weight_kg,
    unit: 'kg',
    measured_at: measurement.measured_at
  }})
}
