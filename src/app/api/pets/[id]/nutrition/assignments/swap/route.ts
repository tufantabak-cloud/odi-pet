import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: petId } = await context.params
  const supabase = await createServerSupabaseClient()

  // 1. Yetki kontrolü (Pet sahibi mi?)
  const { data: ownerRecord } = await supabase
    .from('pet_owners')
    .select('role')
    .eq('pet_id', petId)
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!ownerRecord) {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Bu pet için mama ataması yapma yetkiniz bulunmamaktadır.' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { old_assignment_id, new_assignment, new_stock_decision } = body

    if (!old_assignment_id || !new_assignment) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Eksik parametre (old_assignment_id veya new_assignment)' }, { status: 400 })
    }

    // RPC'yi çağır
    const { data: result, error } = await supabase.rpc('swap_pet_food_assignment', {
      p_pet_id: petId,
      p_old_assignment_id: old_assignment_id,
      p_new_assignment: new_assignment,
      p_new_stock: new_stock_decision || null
    })

    if (error) {
      console.error('[POST /api/.../swap] RPC error:', error)
      return NextResponse.json({ error: 'RPC_ERROR', message: error.message }, { status: 500 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[POST /api/.../swap] Server error:', error)
    return NextResponse.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 })
  }
}
