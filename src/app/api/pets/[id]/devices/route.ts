import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { revalidatePath, revalidateTag } from 'next/cache'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const supabase = await createServerSupabaseClient()

  // Verify pet access
  const { data: ownerRecord } = await supabase
    .from('pet_owners')
    .select('role')
    .eq('pet_id', id)
    .eq('profile_id', user.id)
    .single()

  if (!ownerRecord) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { type, name, status, wifi_name, motion_alerts_enabled, sensitivity_level } = body

  // Check if device already exists for this pet and type
  const { data: existingDevice } = await supabase
    .from('devices')
    .select('id')
    .eq('pet_id', id)
    .eq('type', type)
    .maybeSingle()

  let error
  if (existingDevice) {
    // Update existing device settings
    const { error: updateError } = await supabase
      .from('devices')
      .update({
        status: status ?? 'online',
        wifi_name,
        motion_alerts_enabled,
        sensitivity_level,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingDevice.id)
    error = updateError
  } else {
    // Insert new device
    const { error: insertError } = await supabase
      .from('devices')
      .insert({
        pet_id: id,
        type,
        name: name || `${type === 'camera' ? 'Kamera' : 'TAG'} Cihazı`,
        status: status || 'online',
        wifi_name,
        motion_alerts_enabled: motion_alerts_enabled ?? true,
        sensitivity_level: sensitivity_level || 'medium'
      })
    error = insertError
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/owner/dashboard')
  revalidatePath('/owner/pets')
  revalidatePath(`/owner/pets/${id}`)

  return NextResponse.json({ success: true })
}
