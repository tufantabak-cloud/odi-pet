import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { checkPendingReferrals } from '@/lib/referral/checkPendingReferrals'
import { requireRole } from '@/lib/auth/get-current-profile'

export async function POST(req: Request) {
  try {
    // 1. Authorization Check
    const actor = await requireRole(['admin', 'founder'])
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // 2. Input Validation
    const body = await req.json()
    const { referrerEmail, referredEmail, referralCode } = body

    if (!referrerEmail || !referredEmail || !referralCode) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    if (referrerEmail === referredEmail) {
      return NextResponse.json({ error: 'Self-referral is not allowed' }, { status: 400 })
    }

    const adminSupabase = createAdminSupabaseClient()
    
    // 3. Resolve IDs
    const { data: referrerUser } = await adminSupabase.from('profiles').select('id').eq('email', referrerEmail).single()
    const { data: referredUser } = await adminSupabase.from('profiles').select('id').eq('email', referredEmail).single()

    if (!referrerUser || !referredUser) {
      return NextResponse.json({ error: 'Users not found' }, { status: 404 })
    }

    // 4. Existing check
    const { data: existingRef } = await adminSupabase
      .from('referrals')
      .select('id, referrer_id, status')
      .eq('referred_id', referredUser.id)
      .maybeSingle()

    if (existingRef) {
      if (existingRef.referrer_id !== referrerUser.id) {
         return NextResponse.json({ error: 'User is already referred by someone else' }, { status: 400 })
      }
      
      // Attempt qualification if pending
      if (existingRef.status === 'pending') {
        const result = await checkPendingReferrals(referredUser.id)
        return NextResponse.json({ success: true, action: 'qualified', association: existingRef, qualificationResult: result })
      } else {
        return NextResponse.json({ success: true, action: 'already_qualified', association: existingRef })
      }
    }

    // 5. Association creation
    const { data: newAssoc, error: assocError } = await adminSupabase.from('referrals').insert({
      referrer_id: referrerUser.id,
      referred_id: referredUser.id,
      referral_code: referralCode,
      status: 'pending',
    }).select('*').single()
    
    if (assocError) {
      throw assocError
    }

    // 6. Qualification Evaluate
    const result = await checkPendingReferrals(referredUser.id)

    return NextResponse.json({ success: true, action: 'created_and_evaluated', association: newAssoc, qualificationResult: result })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
