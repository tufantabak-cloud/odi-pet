import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { estimateNextRefillDate } from '@/lib/nutrition/refill-engine'
import { revalidatePath } from 'next/cache'
import { Database } from '@/lib/database.types'
import { hasPetCapability } from '@/lib/pets/access'

type FoodInventoryInsert = Database['public']['Tables']['food_inventory']['Insert']

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

// GET — current inventory with server-side estimated calculations
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const [{ data: inv, error }, { data: assignments }] = await Promise.all([
    supabase.from('food_inventory').select('*').eq('pet_id', id).maybeSingle(),
    supabase.from('pet_food_assignments').select('daily_target_grams').eq('pet_id', id).is('ended_at', null)
  ])

  if (error) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })
  }

  if (!inv) {
    return NextResponse.json({
      inventory: null,
      estimated_remaining_grams: null,
      days_left: null,
      stock_status: 'unknown'
    })
  }

  const dailyUsage = (assignments || []).reduce((sum, a) => sum + Number(a.daily_target_grams || 0), 0)
  
  if (dailyUsage <= 0) {
    return NextResponse.json({
      inventory: inv,
      estimated_remaining_grams: Number(inv.current_stock_grams || 0),
      days_left: null,
      stock_status: 'paused'
    })
  }

  const rawStock = Number(inv.current_stock_grams || 0)
  const lastRefill = inv.last_refill_date ? new Date(inv.last_refill_date).getTime() : Date.now()
  const now = Date.now()

  let passedDays = 0
  if (lastRefill < now) {
    passedDays = Math.max(0, Math.floor((now - lastRefill) / (1000 * 60 * 60 * 24)))
  }

  const estRemaining = Math.max(0, rawStock - (passedDays * dailyUsage))

  if (estRemaining <= 0) {
    return NextResponse.json({
      inventory: inv,
      estimated_remaining_grams: 0,
      days_left: 0,
      stock_status: 'depleted'
    })
  }

  const daysLeft = Math.round((estRemaining / dailyUsage) * 10) / 10

  return NextResponse.json({
    inventory: inv,
    estimated_remaining_grams: estRemaining,
    days_left: daysLeft,
    stock_status: 'available'
  })
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

  // Fetch current inventory and assignments to calculate usage
  const [{ data: currentInv }, { data: assignments }] = await Promise.all([
    supabase.from('food_inventory').select('*').eq('pet_id', id).single(),
    supabase.from('pet_food_assignments').select('daily_target_grams').eq('pet_id', id).is('ended_at', null)
  ]);

  const dailyUsage = (assignments || []).reduce((sum, a) => sum + (a.daily_target_grams || 0), 0);
  
  let newStockGrams = 0;
  
  if (body.action === 'add_package') {
    // Calculate current estimated stock
    const prevStock = currentInv?.current_stock_grams || 0;
    const lastRefill = currentInv?.last_refill_date;
    
    let estimatedStock = prevStock;
    if (lastRefill && dailyUsage > 0) {
      const passedMs = Date.now() - new Date(lastRefill).getTime();
      const passedDays = Math.max(0, Math.floor(passedMs / (1000 * 60 * 60 * 24)));
      estimatedStock = Math.max(0, prevStock - (passedDays * dailyUsage));
    }
    
    const addedGrams = Number(body.package_size_grams || 0) * Number(body.package_count || 1);
    newStockGrams = estimatedStock + addedGrams;
  } else if (body.action === 'set_stock') {
    newStockGrams = Number(body.current_stock_grams || 0);
  } else {
    // Fallback for direct update
    newStockGrams = Number(body.current_stock_grams || 0);
  }

  const nextRefill = estimateNextRefillDate({ stockGrams: newStockGrams, dailyUsage })

  const payload: FoodInventoryInsert = {
    pet_id: id,
    current_stock_grams: newStockGrams,
    estimated_daily_usage: dailyUsage || null,
    last_refill_date: new Date().toISOString(),
    low_stock_threshold_days: body.low_stock_threshold_days
      ? Number(body.low_stock_threshold_days)
      : (currentInv?.low_stock_threshold_days || 5)
  }

  if (nextRefill) {
    payload.next_refill_estimate = nextRefill.toISOString()
  } else {
    payload.next_refill_estimate = null
  }

  const { data, error } = await supabase
    .from('food_inventory')
    .upsert(payload, { onConflict: 'pet_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })

  // Fire refill_risk event if critical
  if (dailyUsage > 0) {
    const daysLeft = newStockGrams / dailyUsage
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

// DELETE — delete inventory
export async function DELETE(req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!(await assertOwner(id, user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServerSupabaseClient()
  
  const { error } = await supabase
    .from('food_inventory')
    .delete()
    .eq('pet_id', id)

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })

  revalidatePath(`/owner/pets/${id}/nutrition`)
  return NextResponse.json({ success: true })
}
