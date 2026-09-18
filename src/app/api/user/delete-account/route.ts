import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // İstek gövdesinde hedef ID kontrolü (İstemci asla başka bir ID hedefleyemez)
    try {
      const body = await req.json().catch(() => null)
      if (body && typeof body === 'object' && 'user_id' in body) {
        if (body.user_id && body.user_id !== user.id) {
          return NextResponse.json(
            { error: 'Geçersiz istek: Yalnızca kendi hesabınızı silebilirsiniz.' },
            { status: 403 }
          )
        }
      }
    } catch {
      // Body parse edilemezse sessizce devam edilir; kimlik kesinlikle session'dan alınır
    }

    const userId = user.id
    const adminSupabase = createAdminSupabaseClient()

    // 1) Kullanıcıya ait pet'lerin ID'lerini bulup pet bağımlı tabloları temizle
    const { data: userPets } = await adminSupabase
      .from('pets')
      .select('id')
      .eq('owner_id', userId)

    const petIds = (userPets || []).map((p) => p.id)

    if (petIds.length > 0) {
      await Promise.allSettled([
        adminSupabase.from('vaccines').delete().in('pet_id', petIds),
        adminSupabase.from('vaccine_records_v2').delete().in('pet_id', petIds),
        adminSupabase.from('parasite_records').delete().in('pet_id', petIds),
        adminSupabase.from('pet_weight_logs').delete().in('pet_id', petIds),
        adminSupabase.from('pet_medical_notes').delete().in('pet_id', petIds),
        adminSupabase.from('pet_food_logs').delete().in('pet_id', petIds),
      ])
      await adminSupabase.from('pets').delete().eq('owner_id', userId)
    }

    // 2) Kullanıcı profil bağımlı tablolarını temizle
    await Promise.allSettled([
      adminSupabase.from('user_subscriptions').delete().eq('profile_id', userId),
      adminSupabase.from('membership_credits').delete().eq('profile_id', userId),
      adminSupabase.from('membership_events').delete().eq('profile_id', userId),
      adminSupabase.from('event_stream').delete().eq('profile_id', userId),
      adminSupabase.from('referrals').delete().eq('referrer_id', userId),
      adminSupabase.from('referrals').delete().eq('referred_id', userId),
      adminSupabase.from('user_survey_stats').delete().eq('user_id', userId),
      adminSupabase.from('user_consents').delete().eq('user_id', userId),
      adminSupabase.from('ai_conversations').delete().eq('profile_id', userId),
      adminSupabase.from('reminders').delete().eq('user_id', userId),
      adminSupabase.from('passkeys').delete().eq('user_id', userId),
      adminSupabase.from('push_subscriptions').delete().eq('profile_id', userId),
    ])

    // 3) Profiles kaydını temizle
    await adminSupabase.from('profiles').delete().eq('id', userId)

    // 4) Supabase Auth kullanıcısını sil
    const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(userId)
    if (authDeleteError && !authDeleteError.message.includes('User not found')) {
      console.warn('[Account Deletion] Auth delete notice:', authDeleteError.message)
    }

    // 5) Oturumu sonlandır
    try {
      const serverSupabase = await createServerSupabaseClient()
      await serverSupabase.auth.signOut()
    } catch (signOutErr) {
      console.warn('[Account Deletion] SignOut notice:', signOutErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Hesabınız ve ilişkili verileriniz kalıcı olarak silindi.',
    })
  } catch (error: unknown) {
    console.error('[API/User DeleteAccount] Error:', error)
    return NextResponse.json(
      { error: 'Hesap silme işlemi sırasında bir hata oluştu. Lütfen destek ekibiyle iletişime geçin.' },
      { status: 500 }
    )
  }
}
