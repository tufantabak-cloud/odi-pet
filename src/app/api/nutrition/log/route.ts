import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { petId, foodLogged, waterLogged, notes } = await req.json()
  if (!petId) return NextResponse.json({ error: 'Missing petId' }, { status: 400 })

  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('nutrition_logs')
    .upsert({
      pet_id: petId,
      date: today,
      food_logged: foodLogged,
      water_logged: waterLogged,
      notes: notes
    }, { onConflict: 'pet_id, date' })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })
  }

  // Trigger predictive risk in background (no await)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
  fetch(`${appUrl}/api/predictive-risk/${petId}?force=true`).catch(console.error)

  return NextResponse.json({ success: true, data })
}
