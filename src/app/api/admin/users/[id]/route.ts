import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-profile'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireRole(['admin', 'founder'])
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    // Bir Admin kendi kendisini silemez
    if (actor.id === id) {
      return NextResponse.json({ error: 'Kendinizi silemezsiniz.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    // 1) Auth sisteminden kullanıcıyı tamamen uçur (Cascade ile profiller ve petler de silinmeli)
    const { error: authError } = await supabase.auth.admin.deleteUser(id)

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // Garanti olsun diye profiles'ten de silmeyi deneyelim (Eğer Cascade yoksa diye)
    await supabase.from('profiles').delete().eq('id', id)

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}
