import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

// G3 FORENSIC BULGUSU: `shared_pet_cards` (dijital pet kartı / caregiver
// paylaşım linki) daha önce iptal edilemiyordu — hiçbir DELETE/revoke
// endpoint'i yoktu. `20260726120000_security_hardening.sql` migration'ı
// `owners_update_shared_pet_cards` / `owners_delete_shared_pet_cards` RLS
// politikalarını tanımlamış olsa da, aynı migration'ın sonunda
// `REVOKE INSERT, UPDATE, DELETE ON TABLE public.shared_pet_cards FROM
// anon, authenticated;` çalıştırılmış — yani bu politikalar ölü koddur,
// normal (authenticated) bir client hiçbir zaman UPDATE/DELETE
// çalıştıramaz (GRANT seviyesinde engellenir, RLS politikasına hiç
// sıra gelmez). Sonuç: bir owner, süresiz ("permanent") bir paylaşım
// linkini oluşturduktan sonra onu iptal etmenin GERÇEKTEN hiçbir yolu
// yoktu — token sızarsa (ekran görüntüsü, eski bakıcı/aile ilişkisi
// bitmesi vb.) erişim kalıcı olarak açık kalıyordu.
//
// Bu endpoint minimal ve mevcut desenlerle tutarlı bir çözüm sağlar:
// 1. Oturum + sahiplik kontrolü normal (RLS'e tabi) client ile yapılır
//    (share/create/route.ts ile aynı desen).
//    - `owner_user_id = session user` VE `user_owns_pet(pet_id)` doğrulanır.
// 2. Yalnızca sahiplik doğrulandıktan SONRA, mevcut `owner_update`
//    politikasının GRANT seviyesinde engellendiği bilindiği için,
//    service-role client ile `is_active = false` set edilir (soft-revoke;
//    satır silinmez, denetim izi korunur). Bu, `logbook/create/route.ts`
//    ve `scan-document/confirm/route.ts`'de zaten kullanılan "önce
//    session ile yetki doğrula, sonra admin client ile yaz" desenidir —
//    yeni bir mimari icat edilmedi.
// 3. `is_active = false` olduğunda `share/get/[token]` ve
//    `logbook/create` endpoint'leri (ikisi de `.eq('is_active', true)`
//    / `if (!card.is_active)` kontrolü yapıyor) otomatik olarak erişimi
//    reddeder — tüketici tarafında hiçbir değişiklik gerekmedi.

const revokeShareSchema = z.object({
  token: z.string().min(10).max(128),
})

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = revokeShareSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Geçersiz istek parametreleri.', details: parsed.error.issues },
      { status: 400 }
    )
  }

  const { token } = parsed.data

  try {
    // 1. Sahiplik doğrulaması: normal (RLS'e tabi) client ile.
    //    `owners_select_shared_pet_cards` politikası zaten
    //    `owner_user_id = auth.uid() AND user_owns_pet(pet_id)` şartını
    //    taşıyor, bu yüzden bu SELECT tek başına yeterli bir yetki kanıtı.
    const supabase = await createServerSupabaseClient()
    const { data: card, error: findError } = await supabase
      .from('shared_pet_cards')
      .select('id, is_active, owner_user_id')
      .eq('share_token', token)
      .maybeSingle()

    if (findError) {
      console.error('[API/Share/Revoke] Lookup error:', findError.message)
      return NextResponse.json({ error: 'Sunucu hatası.' }, { status: 500 })
    }

    if (!card) {
      return NextResponse.json({ error: 'Bağlantı bulunamadı.' }, { status: 404 })
    }

    // Ekstra savunma: RLS zaten owner_user_id'yi filtrelemiş olsa da,
    // açıkça tekrar kontrol ediyoruz (defense-in-depth).
    if (card.owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Bu bağlantıyı iptal etme yetkiniz yok.' }, { status: 403 })
    }

    if (!card.is_active) {
      return NextResponse.json({ success: true, alreadyRevoked: true })
    }

    // 2. Sahiplik doğrulandı → service-role client ile soft-revoke.
    //    (Normal client burada GRANT seviyesinde engellenir, bkz. yukarıdaki not.)
    const adminClient = createAdminSupabaseClient()
    const { error: updateError } = await adminClient
      .from('shared_pet_cards')
      .update({ is_active: false })
      .eq('id', card.id)

    if (updateError) {
      console.error('[API/Share/Revoke] Update error:', updateError.message)
      return NextResponse.json({ error: 'Bağlantı iptal edilirken hata oluştu.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[API/Share/Revoke] Error:', error)
    return NextResponse.json({ error: 'Sunucu hatası.' }, { status: 500 })
  }
}
