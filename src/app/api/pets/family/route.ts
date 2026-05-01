import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pet_id, email, role } = await req.json()
  if (!pet_id || !email || !role) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (!['admin', 'editor', 'viewer'].includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  const supabase = await createServerSupabaseClient()

  // Verify caller has owner or admin role
  const { data: callerRole } = await supabase.rpc('user_pet_role', { p_pet_id: pet_id })
  if (!callerRole || !['owner', 'admin'].includes(callerRole)) {
    return NextResponse.json({ error: 'Yetkisiz: Sadece sahip veya admin davet gönderebilir' }, { status: 403 })
  }

  // Check subscription plan limits
  const { data: sub } = await supabase.from('user_subscriptions').select('plan').eq('profile_id', user.id).single()
  const { count: memberCount } = await supabase.from('pet_members').select('id', { count: 'exact', head: true }).eq('pet_id', pet_id)
  const limit = sub?.plan === 'ai_plus' ? 999 : sub?.plan === 'pro' ? 5 : 2
  if ((memberCount ?? 0) >= limit) {
    return NextResponse.json({ error: `Plan limitine ulaşıldı (${limit} üye). Yükseltmek için Pro'ya geçin.` }, { status: 403 })
  }

  // Get pet name for invite message
  const { data: pet } = await supabase.from('pets').select('name').eq('id', pet_id).single()

  // Upsert invite (re-invite if previously revoked/expired)
  const { data: invite, error } = await supabase
    .from('pet_invites')
    .upsert({
      pet_id,
      invited_by: user.id,
      email,
      role,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'pet_id,email' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log activity
  await supabase.from('pet_activity_log').insert({
    pet_id,
    actor_id: user.id,
    action: 'invited_member',
    entity_type: 'pet_invite',
    entity_id: invite.id,
    description: `${email} adresine ${role} rolüyle davet gönderildi`,
  })

  // TODO: Send actual email via Resend/SendGrid
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/invite/${invite.token}`

  return NextResponse.json({
    success: true,
    invite,
    inviteLink,
    message: `${pet?.name ?? 'Pati'}'nin bakım ekibine davet gönderildi.`,
  })
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const petId = req.nextUrl.searchParams.get('pet_id')
  if (!petId) return NextResponse.json({ error: 'pet_id required' }, { status: 400 })

  const supabase = await createServerSupabaseClient()

  const [{ data: members }, { data: invites }, { data: activity }] = await Promise.all([
    supabase.from('pet_members').select('*, profiles(first_name, last_name, id)').eq('pet_id', petId),
    supabase.from('pet_invites').select('*').eq('pet_id', petId).eq('status', 'pending'),
    supabase.from('pet_activity_log').select('*, profiles(first_name, last_name)').eq('pet_id', petId).order('created_at', { ascending: false }).limit(20),
  ])

  return NextResponse.json({ members, invites, activity })
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { member_id, pet_id } = await req.json()
  const supabase = await createServerSupabaseClient()

  const { data: callerRole } = await supabase.rpc('user_pet_role', { p_pet_id: pet_id })
  if (!['owner', 'admin'].includes(callerRole)) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  // Prevent removing owner
  const { data: member } = await supabase.from('pet_members').select('role').eq('id', member_id).single()
  if (member?.role === 'owner') return NextResponse.json({ error: 'Sahip kaldırılamaz' }, { status: 400 })

  const { error } = await supabase.from('pet_members').delete().eq('id', member_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
