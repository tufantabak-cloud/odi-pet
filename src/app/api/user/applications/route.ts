import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    const { data: applications, error: applicationsError } = await supabase
      .from('breeding_applications')
      .select(`
        id,
        status,
        message,
        created_at,
        applicant_pet:pets!breeding_applications_applicant_pet_id_fkey (
          id,
          name,
          avatar_url,
          species,
          breed,
          gender,
          birth_date
        ),
        listing:breeding_listings (
          id,
          title,
          listing_pet:pets!breeding_listings_pet_id_fkey (
            id,
            name,
            avatar_url,
            species,
            breed,
            gender,
            birth_date
          )
        )
      `)
      .eq('applicant_user_id', user.id)
      .order('created_at', { ascending: false })

    if (applicationsError) {
      console.error('Error fetching applications:', applicationsError)
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
    }

    return NextResponse.json({ data: applications })
  } catch (err) {
    console.error('API Error (user/applications):', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
