import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { caption, pet_id } = await req.json()
  if (!caption?.trim()) return NextResponse.json({ error: 'Caption required' }, { status: 400 })

  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('social_posts').insert({
    owner_id: user.id,
    caption: caption.trim(),
    pet_id: pet_id ?? null,
  })

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })

  revalidatePath('/owner/social')
  return NextResponse.json({ success: true })
}
