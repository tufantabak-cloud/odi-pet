import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { estimateNextRefillDate } from '@/lib/nutrition/refill-engine'
import { revalidatePath } from 'next/cache'

type Params = { params: Promise<{ id: string }> }

async function assertOwner(petId: string, userId: string) {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('pet_owners')
    .select('role')
    .eq('pet_id', petId)
    .eq('profile_id', userId)
    .single()
  return !!data
}

// GET — current inventory
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('food_inventory')
    .select('*')
    .eq('pet_id', id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ inventory: data ?? null })
}

// PATCH — update inventory (stock + daily usage)
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!(await assertOwner(id, user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const supabase = await createServerSupabaseClient()

  const currentStock = Number(body.current_stock_grams ?? 0)
  const dailyUsage = Number(body.estimated_daily_usage ?? 0)
  const nextRefill = estimateNextRefillDate(currentStock, dailyUsage)

  const payload = {
    pet_id: id,
    current_stock_grams: currentStock,
    estimated_daily_usage: dailyUsage || null,
    last_refill_date: body.last_refill_date ?? null,
    next_refill_estimate: nextRefill?.toISOString() ?? null,
    low_stock_threshold_days: body.low_stock_threshold_days
      ? Number(body.low_stock_threshold_days)
      : 5,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('food_inventory')
    .upsert(payload, { onConflict: 'pet_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fire refill_risk event if critical
  if (dailyUsage > 0) {
    const daysLeft = currentStock / dailyUsage
    if (daysLeft <= 3) {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/analytics/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'refill_risk_triggered',
          payload: { pet_id: id, days_left: Math.floor(daysLeft), risk: 'CRITICAL' },
        }),
      }).catch(() => {})
    }
  }

  revalidatePath(`/owner/pets/${id}/nutrition`)
  return NextResponse.json({ inventory: data })
}
