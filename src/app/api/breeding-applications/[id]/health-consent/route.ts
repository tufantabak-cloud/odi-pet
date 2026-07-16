import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params
    const supabase = await createServerSupabaseClient()
    const adminSupabase = createAdminSupabaseClient()

    const { data: application, error: fetchError } = await supabase
      .from('breeding_applications')
      .select('applicant_user_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !application) {
      return NextResponse.json({ error: 'Başvuru bulunamadı' }, { status: 404 })
    }

    if (application.applicant_user_id !== user.id) {
      return NextResponse.json({ error: 'Bu başvuru için rıza verme yetkiniz yok' }, { status: 403 })
    }

    if (!['pending', 'approved'].includes(application.status)) {
      return NextResponse.json({ error: 'Bu başvuru statüsünde rıza verilemez' }, { status: 400 })
    }

    // Aktif kaydı kontrol et
    const { data: activeConsent } = await adminSupabase
      .from('breeding_consent_records')
      .select('id, expires_at')
      .eq('application_id', id)
      .eq('user_id', user.id)
      .is('withdrawn_at', null)
      .maybeSingle()

    if (activeConsent) {
      if (activeConsent.expires_at && new Date(activeConsent.expires_at) < new Date()) {
        // Kayıt süresi geçmiş, soft-delete yapalım (adminSupabase ile)
        await adminSupabase
          .from('breeding_consent_records')
          .update({ withdrawn_at: new Date().toISOString() })
          .eq('id', activeConsent.id)
      } else {
        // Kayıt hâlâ geçerli
        return NextResponse.json({ success: true, message: 'Aktif rıza zaten mevcut' })
      }
    }

    const consentScope = {
      fields: [
        "vaccine_name",
        "vaccine_code",
        "administered_at",
        "valid_until",
        "next_due_at",
        "dose_number"
      ],
      max_records: 10,
      recipient: "listing_owner"
    }

    const { error: insertError } = await supabase
      .from('breeding_consent_records')
      .insert({
        application_id: id,
        user_id: user.id,
        consent_type: 'breeding_health_summary_share',
        consent_text_version: 'breeding-health-share-v1',
        consent_scope: consentScope
      })

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ success: true, message: 'Aktif rıza zaten mevcut' })
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params
    // İstemci UPDATE yetkisi kaldırıldığı için, geri çekme işlemi admin client üzerinden yapılmalı.
    const adminSupabase = createAdminSupabaseClient()

    const { error: updateError } = await adminSupabase
      .from('breeding_consent_records')
      .update({ withdrawn_at: new Date().toISOString() })
      .eq('application_id', id)
      .eq('user_id', user.id)
      .eq('consent_type', 'breeding_health_summary_share')
      .is('withdrawn_at', null)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
