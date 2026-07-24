import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-profile'
import { revalidatePath } from 'next/cache'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(['admin', 'founder'])
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const resolvedParams = await params

  try {
    const body = await req.json()
    const supabase = createAdminSupabaseClient()

    const updateData: any = {}
    if (body.label !== undefined) updateData.label = body.label
    if (body.icon !== undefined) updateData.icon = body.icon
    if (body.href !== undefined) updateData.href = body.href
    if (body.is_locked !== undefined) updateData.is_locked = body.is_locked

    const { data, error } = await supabase
      .from('navigation_pages')
      .update(updateData)
      .eq('id', resolvedParams.id)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/owner', 'layout')

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(['admin', 'founder'])
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const resolvedParams = await params

  try {
    const supabase = createAdminSupabaseClient()

    // First check if the page is locked
    const { data: page, error: fetchError } = await supabase
      .from('navigation_pages')
      .select('is_locked')
      .eq('id', resolvedParams.id)
      .single()

    if (fetchError) throw fetchError
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    if (page.is_locked) {
      return NextResponse.json({ error: 'Kilitli sayfalar silinemez' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('navigation_pages')
      .delete()
      .eq('id', resolvedParams.id)

    if (deleteError) throw deleteError

    revalidatePath('/owner', 'layout')

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Invalid request' }, { status: 400 })
  }
}
