import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminSupabaseClient()

  const { data: listings, error } = await supabase
    .from('breeding_listings')
    .select('*, pets(id, name, species, breed, birth_date, avatar_url, gender, city)')
    .eq('status', 'active')
    .eq('purpose', 'breeding')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ listings: listings || [] })
}
