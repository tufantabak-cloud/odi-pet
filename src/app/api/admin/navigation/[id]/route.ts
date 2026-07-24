import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-profile'
import { revalidatePath } from 'next/cache'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(['admin', 'founder'])
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const resolvedParams = await params;

  try {
    const body = await req.json()
    const supabase = createAdminSupabaseClient()

    // Handle bulk reordering
    if (body.items && Array.isArray(body.items)) {
      // Supabase JS doesn't have a direct bulk update method that's simple without RPC,
      // so we can loop over them or create a custom function.
      // For this implementation, we will update them sequentially.
      const updatePromises = body.items.map((item: any) =>
        supabase
          .from('navigation_items')
          .update({ order_index: item.order_index })
          .eq('id', item.id)
      )
      
      await Promise.all(updatePromises)
      
      revalidatePath('/owner', 'layout')
      return NextResponse.json({ success: true })
    }

    // Handle single item update
    const updateData: any = {}
    if (body.label !== undefined) updateData.label = body.label
    if (body.icon !== undefined) updateData.icon = body.icon
    if (body.href !== undefined) updateData.href = body.href
    if (body.order_index !== undefined) updateData.order_index = body.order_index
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    if (body.match_type !== undefined) updateData.match_type = body.match_type

    const { data, error } = await supabase
      .from('navigation_items')
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
  const resolvedParams = await params;

  try {
    const supabase = createAdminSupabaseClient()
    const { error } = await supabase
      .from('navigation_items')
      .delete()
      .eq('id', resolvedParams.id)

    if (error) throw error

    revalidatePath('/owner', 'layout')

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Invalid request' }, { status: 400 })
  }
}
