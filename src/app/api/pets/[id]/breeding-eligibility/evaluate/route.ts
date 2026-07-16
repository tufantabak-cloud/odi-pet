import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { evaluateBreedingEligibility } from '@/services/breeding/evaluateBreedingEligibility'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: petId } = await context.params
    const supabase = await createServerSupabaseClient()

    const { data: ownerRecord } = await supabase
      .from('pet_owners')
      .select('role')
      .eq('pet_id', petId)
      .eq('profile_id', user.id)
      .single()

    if (!ownerRecord) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const eligibility = await evaluateBreedingEligibility(petId)

    return NextResponse.json({
      status: eligibility.status,
      minimum_age_passed: eligibility.minimumAgePassed,
      blocking_reasons: eligibility.blockingReasons,
      advisories: eligibility.advisories
    }, { status: 200 })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
