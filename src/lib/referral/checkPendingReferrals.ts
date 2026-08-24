import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { qualifyReferral } from './qualifyReferral'

/**
 * Belirli bir kullanıcının (referred_id) beklemede (pending) olan bir referansı varsa,
 * qualifyReferral'ı tekrar tetikler. 
 * Bu servis, kullanıcı sisteme pet veya sağlık kaydı eklediğinde çağrılmalıdır.
 */
export async function checkPendingReferrals(userId: string) {
  try {
    const adminSupabase = createAdminSupabaseClient()

    // Kullanıcının beklemede olan referansını bul (referrer değil, referred olarak)
    const { data: pendingReferrals, error } = await adminSupabase
      .from('referrals')
      .select('id')
      .eq('referred_id', userId)
      .eq('status', 'pending')

    if (error) {
      console.error('[Referral] checkPendingReferrals db hatası:', error.message)
      return { success: false, error: error.message }
    }

    if (!pendingReferrals || pendingReferrals.length === 0) {
      // Bekleyen referans yok
      return { success: true, checked: 0 }
    }

    let checkedCount = 0

    // Olası her beklemedeki referans için qualify'ı tetikle
    for (const ref of pendingReferrals) {
      await qualifyReferral(ref.id)
      checkedCount++
    }

    return { success: true, checked: checkedCount }
  } catch (err) {
    console.error('[Referral] checkPendingReferrals catch:', err)
    return { success: false, error: String(err) }
  }
}
