import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params
    const supabase = await createServerSupabaseClient()

    // 1. Başvuru ve İlişkili Verileri Çek
    const { data: application, error: fetchError } = await supabase
      .from('breeding_applications')
      .select(`
        owner_user_id, 
        applicant_pet_id, 
        status, 
        kvkk_consent, 
        kvkk_consent_at,
        breeding_listings!inner (
          id,
          user_id,
          pet_id
        ),
        pets!breeding_applications_applicant_pet_id_fkey(name),
        applicant_user_id
      `)
      .eq('id', id)
      .single()

    // 1. Başvuru mevcut olmalı
    if (fetchError || !application) {
      return NextResponse.json({ error: 'APPLICATION_NOT_FOUND', message: 'Başvuru bulunamadı' }, { status: 404 })
    }

    // 2. Çağıran kişi ilan sahibi olmalı
    if (application.owner_user_id !== user.id) {
      return NextResponse.json({ error: 'NOT_APPLICATION_OWNER', message: 'Forbidden: Bu başvuruya erişim yetkiniz yok' }, { status: 403 })
    }

    // 3. KVKK/veri paylaşım onayı açıkça doğrulanmalı (Eski kontrol geriye dönük uyumluluk için duruyor ama yetersiz)
    // Yeni sürümlü rıza sistemini kontrol et
    const { data: consentRecord } = await supabase
      .from('breeding_consent_records')
      .select('id, expires_at')
      .eq('application_id', id)
      .eq('user_id', application.applicant_user_id)
      .eq('consent_type', 'breeding_health_summary_share')
      .is('withdrawn_at', null)
      .single()

    if (!consentRecord) {
      return NextResponse.json({ error: 'HEALTH_SHARING_CONSENT_REQUIRED', message: 'Sağlık verisi paylaşım onayı bulunamadı veya geri çekilmiş' }, { status: 403 })
    }

    if (consentRecord.expires_at && new Date(consentRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'HEALTH_SHARING_CONSENT_EXPIRED', message: 'Sağlık verisi paylaşım onayının süresi dolmuş' }, { status: 403 })
    }

    // 4. Başvuru geçerli durumda olmalı
    if (!['pending', 'approved'].includes(application.status)) {
      return NextResponse.json({ error: 'APPLICATION_NOT_ACTIVE', message: 'Başvuru aktif değil' }, { status: 403 })
    }

    // 5. İlan ve başvuru ilişkisini doğrula
    const listing = Array.isArray(application.breeding_listings) 
      ? application.breeding_listings[0] 
      : application.breeding_listings

    if (!listing || listing.user_id !== application.owner_user_id || listing.pet_id === application.applicant_pet_id) {
      return NextResponse.json({ error: 'APPLICATION_RELATION_INVALID', message: 'Geçersiz ilan ve başvuru ilişkisi' }, { status: 403 })
    }

    // 6. & 7. Admin token ile sınırlandırılmış aşı verisini çek
    const adminSupabase = createAdminSupabaseClient()
    const { data: vaccines, error: vaccinesError } = await adminSupabase
      .from('vaccine_records_v2')
      .select('vaccine_name, vaccine_code, administered_at, valid_until, next_due_at, dose_number')
      .eq('pet_id', application.applicant_pet_id)
      .not('administered_at', 'is', null) // Uygulanmamış aşıları hariç tut
      .order('administered_at', { ascending: false })
      .limit(10) // En son 10 kayıt

    if (vaccinesError) {
      return NextResponse.json({ error: 'Aşılar getirilirken hata oluştu' }, { status: 500 })
    }

    // 8. Güvenli response (Kullanıcı verisi yok)
    const petName = Array.isArray(application.pets) ? application.pets[0]?.name : (application.pets as any)?.name

    return NextResponse.json({
      pet_name: petName,
      vaccines: vaccines
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
