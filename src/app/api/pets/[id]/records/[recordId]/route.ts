import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

import { hasPetCapability } from '@/lib/pets/access'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  const { id, recordId } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()

  // Pet bakım yetkisi doğrulama
  const canManage = await hasPetCapability(supabase, id, 'can_manage_pet_care')
  if (!canManage) {
    return NextResponse.json(
      { error: 'Bu işlem için yetkiniz yok.' },
      { status: 403 }
    )
  }

  const { error } = await supabase
    .from('health_records')
    .update({
      is_archived: true,
      archived_at: new Date().toISOString()
    })
    .eq('id', recordId)
    .eq('pet_id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
