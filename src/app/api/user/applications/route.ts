import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Database } from '@/lib/database.types'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase admin credentials missing')
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
