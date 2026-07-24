import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-profile'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const pageSchema = z.object({
  label: z.string().min(1).max(100),
  icon: z.string().min(1),
  href: z.string().min(1),
  is_locked: z.boolean().optional()
})

export async function POST(req: Request) {
  const profile = await requireRole(['admin', 'founder'])
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = pageSchema.parse(body)

    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('navigation_pages')
      .insert({
        label: parsed.label,
        icon: parsed.icon,
        href: parsed.href,
        is_locked: parsed.is_locked ?? false
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/owner', 'layout')

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Invalid request' }, { status: 400 })
  }
}
