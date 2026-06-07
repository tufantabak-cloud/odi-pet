import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

// PATCH /api/notifications/read  — mark all or specific notifications as read
export async function PATCH(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()
  const body = await request.json().catch(() => ({}))
  const ids: string[] | undefined = body.ids

  let query = supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('profile_id', user.id)

  if (ids && ids.length > 0) {
    query = query.in('id', ids)
  }

  const { error } = await query

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })

  return NextResponse.json({ success: true })
}

// GET /api/notifications/read  — get unread count
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ count: 0 })

  const supabase = await createServerSupabaseClient()
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', user.id)
    .eq('is_read', false)

  return NextResponse.json({ count: count ?? 0 })
}
