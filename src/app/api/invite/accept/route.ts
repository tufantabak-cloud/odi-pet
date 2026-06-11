import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { Database } from '@/lib/database.types'

type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', requiresAuth: true }, { status: 401 })

  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Token gerekli' }, { status: 400 })

  const supabase = await createServerSupabaseClient()

  // 1. Validate invite token
  const { data: invite, error: inviteErr } = await supabase
    .from('pet_invites')
    .select('*, pets(id, name, owner_id, species, breed)')
    .eq('token', token)
    .single()

  if (inviteErr || !invite) return NextResponse.json({ error: 'Geçersiz davet bağlantısı' }, { status: 404 })
  if (invite.status === 'accepted') return NextResponse.json({ error: 'Bu davet zaten kullanılmış', code: 'ALREADY_USED' }, { status: 409 })
  if (invite.status === 'revoked') return NextResponse.json({ error: 'Bu davet iptal edilmiş', code: 'REVOKED' }, { status: 410 })
  if (new Date(invite.expires_at) < new Date()) {
    await supabase.from('pet_invites').update({ status: 'expired' }).eq('id', invite.id)
    return NextResponse.json({ error: 'Davet süresi dolmuş', code: 'EXPIRED' }, { status: 410 })
  }

  // 2. Fraud guards
  // Block self-invite
  if (invite.invited_by === user.id) {
    return NextResponse.json({ error: 'Kendi kendinizi davet edemezsiniz', code: 'SELF_INVITE' }, { status: 400 })
  }
  // Block owner trying to join own pet via invite
  if (invite.pets?.owner_id === user.id) {
    return NextResponse.json({ error: 'Kendi petinizin davetini kullanamazsınız', code: 'OWN_PET' }, { status: 400 })
  }
  // Block duplicate membership
  const { data: existing } = await supabase
    .from('pet_members')
    .select('id')
    .eq('pet_id', invite.pet_id)
    .eq('profile_id', user.id)
    .single()
  if (existing) return NextResponse.json({ error: 'Bu pete zaten erişiminiz var', code: 'ALREADY_MEMBER', petId: invite.pet_id }, { status: 409 })

  // 3. Accept: add to pet_members
  const { error: memberErr } = await supabase.from('pet_members').insert({
    pet_id: invite.pet_id,
    profile_id: user.id,
    role: invite.role,
    invited_by: invite.invited_by,
    joined_at: new Date().toISOString(),
  })
  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 })

  // 4. Mark invite accepted
  await supabase.from('pet_invites').update({ status: 'accepted' }).eq('id', invite.id)

  // 5. Activity log
  await supabase.from('pet_activity_log').insert({
    pet_id: invite.pet_id,
    actor_id: user.id,
    action: 'joined_family',
    entity_type: 'pet_member',
    description: `Bakım ekibine katıldı (${invite.role} olarak)`,
  })

  // 6. Referral rewards (idempotent - UNIQUE constraint prevents double rewards)
  // Check if rewards already given for this invite
  const { data: existingReward } = await supabase
    .from('referral_rewards')
    .select('id')
    .eq('invite_id', invite.id)
    .limit(1)

  if (!existingReward || existingReward.length === 0) {
    // Inviter: +50 Care Points
    try {
      const { error: rpcErr1 } = await supabase.rpc('increment_care_points', { p_profile_id: invite.invited_by, p_amount: 50 })
      if (rpcErr1) throw rpcErr1
    } catch {
      // Fallback if RPC doesn't exist yet
      await supabase.from('profiles').update({ care_points: 50 } as ProfileUpdate).eq('id', invite.invited_by)
    }

    // Invited: +25 Care Points
    try {
      const { error: rpcErr2 } = await supabase.rpc('increment_care_points', { p_profile_id: user.id, p_amount: 25 })
      if (rpcErr2) throw rpcErr2
    } catch {
      await supabase.from('profiles').update({ care_points: 25 } as ProfileUpdate).eq('id', user.id)
    }

    // Log rewards
    await supabase.from('referral_rewards').insert([
      { invite_id: invite.id, rewarded_profile_id: invite.invited_by, reward_type: 'care_points', amount: 50 },
      { invite_id: invite.id, rewarded_profile_id: user.id, reward_type: 'care_points', amount: 25 },
    ])
  }

  return NextResponse.json({
    success: true,
    pet: invite.pets,
    role: invite.role,
    rewards: { inviter: 50, invited: 25 },
  })
}

// GET: validate token without accepting (for preview page)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token gerekli' }, { status: 400 })

  const supabase = await createServerSupabaseClient()
  const { data: invite } = await supabase
    .from('pet_invites')
    .select('status, expires_at, role, email, pet_id, pets(name, species, breed, owner_id, profiles!pets_owner_id_fkey(first_name, last_name))')
    .eq('token', token)
    .single()

  if (!invite) return NextResponse.json({ valid: false, error: 'Geçersiz davet' }, { status: 404 })
  if (invite.status !== 'pending') return NextResponse.json({ valid: false, status: invite.status, error: `Davet durumu: ${invite.status}` })
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ valid: false, status: 'expired', error: 'Davet süresi dolmuş' })

  return NextResponse.json({ valid: true, invite })
}

