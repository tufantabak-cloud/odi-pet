import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  const { id, recordId } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()

  // Pet sahipliği doğrulama
  const { data: ownership } = await supabase
    .from('pet_owners')
    .select('profile_id')
    .eq('pet_id', id)
    .eq('profile_id', user.id)
    .single()

  if (!ownership) {
    return NextResponse.json(
      { error: 'Bu işlem için yetkiniz yok.' },
      { status: 403 }
    )
  }

  const { error } = await supabase
    .from('health_records')
    .delete()
    .eq('id', recordId)
    .eq('pet_id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
