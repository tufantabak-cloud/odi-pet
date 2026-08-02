import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params
    const profile = await getCurrentProfile()
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createServerSupabaseClient()

    const { data: ownership } = await supabase
      .from('pet_owners')
      .select('pet_id')
      .eq('pet_id', id)
      .eq('profile_id', profile.id)
      .single()

    if (!ownership && profile.role !== 'admin' && profile.role !== 'founder') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { medication_id } = body

    if (!medication_id) {
      return NextResponse.json({ error: 'İlaç ID zorunludur' }, { status: 400 })
    }

    const { error } = await supabase
      .from('health_medications')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString()
      })
      .eq('id', medication_id)
      .eq('pet_id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
