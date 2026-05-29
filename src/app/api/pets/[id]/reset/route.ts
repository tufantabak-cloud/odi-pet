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
  const { data: ownerRecord } = await supabase
    .from('pet_owners')
    .select('role')
    .eq('pet_id', id)
    .eq('profile_id', user.id)
    .single()

  if (!ownerRecord || ownerRecord.role !== 'owner') {
    return NextResponse.json({ error: 'Sadece asıl sahip verileri temizleyebilir.' }, { status: 403 })
  }

  // Clear data from related tables
  const tables = [
    'vaccine_records_v2',
    'growth_records',
    'nutrition_logs',
    'medications',
    'disease_records',
    'care_plans',
    'payments'
  ]

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('pet_id', id)
    if (error) {
      console.error(`Error clearing ${table}:`, error)
    }
  }

  revalidatePath('/owner/dashboard')
  revalidateTag('dashboard', 'default')
  revalidatePath('/owner/pets')
  revalidatePath(`/owner/pets/${id}`)
  revalidatePath('/owner/profile')

  return NextResponse.json({ success: true })
}
