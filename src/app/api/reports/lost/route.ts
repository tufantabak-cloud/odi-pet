import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: reports, error } = await supabase
      .from('lost_reports')
      .select(`
        id,
        pet_id,
        last_seen_location,
        last_seen_at,
        contact_phone,
        province,
        district,
        status,
        created_at,
        pets (
          id,
          name,
          species,
          breed,
          gender,
          photo_url,
          city
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching lost reports:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ reports: reports || [] })
  } catch (err: any) {
    console.error('API /api/reports/lost error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
