import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-profile'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireRole(['admin', 'founder'])
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    const supabase = createAdminSupabaseClient()

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role, phone, created_at, pro_trial_until')
      .eq('id', id)
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    const [pets, subscription, credits] = await Promise.all([
      Promise.resolve(supabase.from('pets').select('id, name, species, breed, birth_date, created_at').eq('owner_id', id)).then(r => r.data || []).catch(() => []),
      Promise.resolve(supabase.from('user_subscriptions').select('id, plan, status, provider, reason, ai_plus_until, pro_until, current_period_end').eq('profile_id', id).limit(1).maybeSingle()).then(r => r.data || null).catch(() => null),
      Promise.resolve(supabase.from('membership_credits').select('id, credit_days, reason, created_at').eq('profile_id', id)).then(r => r.data || []).catch(() => []),
    ])

    return NextResponse.json({
      profile,
      pets: pets || [],
      subscription: subscription || null,
      credits: credits || [],
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireRole(['admin', 'founder'])
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    // Bir Admin kendi kendisini silemez
    if (actor.id === id) {
      return NextResponse.json({ error: 'Kendinizi silemezsiniz.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    // 1) Kullanıcıya ait pet'lerin ID'lerini bulup pet bağımlı tablolarını temizle
    const { data: userPets } = await supabase.from('pets').select('id').eq('owner_id', id)
    const petIds = (userPets || []).map(p => p.id)

    if (petIds.length > 0) {
      await Promise.allSettled([
        supabase.from('vaccines').delete().in('pet_id', petIds),
        supabase.from('parasite_records').delete().in('pet_id', petIds),
        supabase.from('pet_weight_logs').delete().in('pet_id', petIds),
        supabase.from('pet_medical_notes').delete().in('pet_id', petIds),
        supabase.from('pet_food_logs').delete().in('pet_id', petIds),
      ])
      await supabase.from('pets').delete().eq('owner_id', id)
    }

    // 2) Kullanıcı profil bağımlı tablolarını temizle (FK kısıtlamalarını aşmak için)
    await Promise.allSettled([
      supabase.from('user_subscriptions').delete().eq('profile_id', id),
      supabase.from('membership_credits').delete().eq('profile_id', id),
      supabase.from('membership_events').delete().eq('profile_id', id),
      supabase.from('event_stream').delete().eq('profile_id', id),
      supabase.from('referrals').delete().eq('referrer_id', id),
      supabase.from('referrals').delete().eq('referred_id', id),
      supabase.from('user_survey_stats').delete().eq('user_id', id),
      supabase.from('user_consents').delete().eq('user_id', id),
      supabase.from('ai_conversations').delete().eq('profile_id', id),
      supabase.from('reminders').delete().eq('user_id', id),
    ])

    // 3) Profiles tablosundan sil
    await supabase.from('profiles').delete().eq('id', id)

    // 4) Supabase Auth sisteminden sil
    const { error: authError } = await supabase.auth.admin.deleteUser(id)

    if (authError && !authError.message.includes('User not found')) {
      console.warn('[Admin DeleteUser] Auth delete notice:', authError.message)
    }

    return NextResponse.json({ success: true, message: 'Kullanıcı başarıyla silindi.' })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}
