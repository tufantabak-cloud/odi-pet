import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { revalidatePath, revalidateTag } from 'next/cache'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  // Verify ownership
  const { data: ownerRecord, error: ownerError } = await supabase
    .from('pet_owners')
    .select('role')
    .eq('pet_id', id)
    .eq('profile_id', user.id)
    .single()

  console.log('[API/Pets/Reset] ownerRecord:', ownerRecord, 'ownerError:', ownerError, 'petId:', id, 'userId:', user.id)

  if (!ownerRecord || ownerRecord.role !== 'owner') {
    console.error('[API/Pets/Reset] Access denied. ownerRecord:', ownerRecord)
    return NextResponse.json({ error: 'Sadece asıl sahip verileri temizleyebilir.' }, { status: 403 })
  }

  // Clear data from related tables
  const tables = [
    'plans',
    'health_schedules',
    'vaccine_records_v2',
    'weight_logs',
    'nutrition_logs',
    'health_medications',
    'health_diseases',
    'health_allergies',
    'pet_care_events',
    'pet_care_tasks',
    'care_plans',
    'payments',
    'pet_care_plans',
    'pet_health_schedules'
  ]

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('pet_id', id)
    if (error) {
      console.error(`Error clearing ${table}:`, error)
    }
  }

  revalidatePath('/owner/dashboard')
  // @ts-expect-error
  revalidateTag('dashboard')
  revalidatePath('/owner/pets')
  revalidatePath(`/owner/pets/${id}`)
  revalidatePath('/owner/profile')

  return NextResponse.json({ success: true })
}
