import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  const { id: petId, scheduleId } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const supabase = await createServerSupabaseClient()

  // Sadece yetkili pet_id ve schedule_id güncellenebilir (SSOT - Canonical)
  const { data, error } = await supabase
    .from('health_schedules')
    .update({ 
      status: body.status,
      completed_at: body.status === 'completed' || body.status === 'done' ? new Date().toISOString() : null
    })
    .eq('id', scheduleId)
    .eq('pet_id', petId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
