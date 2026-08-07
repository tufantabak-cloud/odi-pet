import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { withAPIFeatureGuard } from '@/lib/features/guards/APIFeatureGuard'
import { getUsageEngine } from '@/lib/features/usage'

type RouteContext = {
  params: Promise<{ petId: string }>
}

async function handler(req: NextRequest, context: RouteContext) {
  try {
    const { petId } = await context.params
    if (!petId) {
      return NextResponse.json({ error: 'Pet ID bulunamadı.' }, { status: 400 })
    }

    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    // 1. Verify ownership of the pet
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('id, name, species, breed')
      .eq('id', petId)
      .single()

    if (petError || !pet) {
      return NextResponse.json({ error: 'Evcil hayvan bulunamadı.' }, { status: 404 })
    }

    const { data: ownerRecord } = await supabase
      .from('pet_owners')
      .select('role')
      .eq('pet_id', petId)
      .eq('profile_id', user.id)
      .single()

    if (!ownerRecord) {
      return NextResponse.json({ error: 'Bu evcil hayvan için yetkiniz yok.' }, { status: 403 })
    }

    // 2. Parse request payload
    let body: Record<string, string> = {}
    try {
      body = await req.json()
    } catch (e) {
      // Body can be empty, fallback to defaults
    }

    const reportType = body?.report_type || 'summary'
    const dateRange = body?.date_range || 'last_12_months'



    // 4. Fetch actual pet health statistics
    // 4a. Vaccines Count (from vaccine_records_v2)
    const since12m = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
    const { data: v2Data } = await supabase
      .from('vaccine_records_v2')
      .select('id')
      .eq('pet_id', petId)
      .eq('status', 'completed')
      .gte('administered_at', since12m)

    const vaccineCount = v2Data?.length || 0

    // 4b. Incident/Illness Count (from health_diseases)
    const { data: diseases } = await supabase
      .from('health_diseases')
      .select('id')
      .eq('pet_id', petId)

    const incidentCount = diseases?.length || 0

    // 4c. Active/Pending Appointments
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, title, scheduled_at, status, vet_name')
      .eq('pet_id', petId)
      .order('scheduled_at', { ascending: true })

    // 5. Quota consumption check
    const requestId = crypto.randomUUID()
    const usageResult = await getUsageEngine().consumeUsage({
      userId: user.id,
      featureKey: 'pdf_export',
      amount: 1,
      idempotencyKey: requestId,
    })
    
    if (!usageResult.success && !usageResult.idempotentAlreadyProcessed) {
      return NextResponse.json(
        { error: 'Rapor oluşturma kotanız doldu. Lütfen planınızı yükseltin.' },
        { status: 403 }
      )
    }

    // 6. Generate validation hash & persist report record in database
    const verificationHash = Math.random().toString(36).substring(2, 10).toUpperCase()

    const { data: reportRow, error: insertError } = await supabase
      .from('pet_reports')
      .insert({
        pet_id: petId,
        profile_id: user.id,
        report_type: reportType,
        date_range: dateRange,
        verification_hash: verificationHash,
      })
      .select('verification_hash, created_at, share_token')
      .single()

    if (insertError || !reportRow) {
      console.error('[reports] Database insertion error:', insertError)
      return NextResponse.json({ error: 'Rapor veritabanına kaydedilemedi.' }, { status: 500 })
    }

    // 6. Return response to UI client
    const reportResponse = {
      verificationHash: reportRow.verification_hash,
      generatedAt: reportRow.created_at,
      annualVaccineCount: vaccineCount,
      incidentCount,
      appointments: appointments || [],
      shareToken: reportRow.share_token,
    }

    return NextResponse.json(reportResponse, { status: 200 })

  } catch (error: unknown) {
    console.error('[reports] POST exception:', error)
    return NextResponse.json({ error: 'Rapor oluşturulurken beklenmeyen bir hata oluştu.' }, { status: 500 })
  }
}

export const POST = withAPIFeatureGuard('pdf_export', handler)
