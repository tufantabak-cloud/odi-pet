import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

type RouteContext = {
  params: Promise<{ id: string; assignmentId: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: petId, assignmentId } = await context.params
  const supabase = await createServerSupabaseClient()

  let body: any
  try {
    body = await req.json()
  } catch (e) {
    return NextResponse.json({ error: 'INVALID_JSON', message: 'Geçersiz JSON verisi' }, { status: 400 })
  }

  const stockAction = body.stock_action || 'keep'
  if (!['keep', 'mark_depleted', 'remove'].includes(stockAction)) {
    return NextResponse.json(
      { error: 'INVALID_STOCK_ACTION', message: 'Geçersiz stok işlemi. Yalnızca keep, mark_depleted veya remove kullanılabilir.' },
      { status: 400 }
    )
  }

  // Call the atomic RPC end_pet_food_assignment
  const { data, error } = await supabase.rpc('end_pet_food_assignment', {
    p_pet_id: petId,
    p_assignment_id: assignmentId,
    p_stock_action: stockAction
  })

  if (error) {
    if (error.code === '42501') {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Bu petin mama planını sonlandırma yetkiniz bulunmamaktadır.' },
        { status: 403 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ data })
}
