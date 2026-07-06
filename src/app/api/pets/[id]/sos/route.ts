import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { revalidatePath } from 'next/cache'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const { sos_contacts } = await req.json()
  const supabase = await createServerSupabaseClient()

  // Verify ownership or admin role
  const { data: callerRole } = await supabase.rpc('user_pet_role', { p_pet_id: id })
  if (!callerRole || !['owner', 'admin'].includes(callerRole)) {
    return NextResponse.json({ error: 'Yetkisiz: Sadece sahip veya admin SOS ayarlarını değiştirebilir' }, { status: 403 })
  }

  const { error } = await supabase
    .from('pets')
    .update({ sos_contacts })
    .eq('id', id)

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })

  // Acil durum kişisi başarıyla eklendiğinde onboarding adımını true olarak işaretle
  try {
    await supabase.rpc('update_onboarding_step', {
      p_pet_id: id,
      p_step: 'emergency_contact',
      p_value: true,
    })
  } catch (opErr) {
    console.error('Onboarding step emergency_contact could not be marked:', opErr)
  }

  revalidatePath(`/owner/pets/${id}`)
  
  return NextResponse.json({ success: true, message: 'Acil durum ağı başarıyla güncellendi.' })
}
