import type { SupabaseClient } from '@supabase/supabase-js'
import {
  applicationDetailsSchema,
  hasApplicationDetails,
  type ApplicationDetails,
} from '@/lib/health-records/application-details'

interface PersistApplicationDetailsInput {
  category: string
  rawDetails: unknown
  recordId: string
  petId: string
  userId: string
  supabase: SupabaseClient
}

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false
  return (
    error.code === 'PGRST204' ||
    error.code === '42703' ||
    /column .* does not exist|schema cache/i.test(error.message || '')
  )
}

function buildApplicationNotes(details: ApplicationDetails) {
  const lines: string[] = []
  if (details.product_notes) lines.push(details.product_notes)
  if (details.administration_place) {
    lines.push(`Uygulama yeri: ${details.administration_place}`)
  }
  if (details.institution_name) {
    lines.push(`Klinik / kurum: ${details.institution_name}`)
  }
  if (details.provider_name) {
    lines.push(`Veteriner / uygulayan: ${details.provider_name}`)
  }
  if (details.applied_dose) lines.push(`Uygulanan doz: ${details.applied_dose}`)
  if (details.active_ingredient) {
    lines.push(`Etken madde: ${details.active_ingredient}`)
  }
  if (details.amount && details.amount > 0) {
    lines.push(`Tutar: ${details.amount} ${details.currency || 'TRY'}`)
  }
  return lines.length > 0 ? lines.join('\n') : null
}

export async function persistApplicationDetails({
  category,
  rawDetails,
  recordId,
  petId,
  userId,
  supabase,
}: PersistApplicationDetailsInput): Promise<ApplicationDetails> {
  const details = applicationDetailsSchema.parse(rawDetails ?? {})

  if (!hasApplicationDetails(details)) return details

  if (
    details.document_storage_path &&
    !details.document_storage_path.startsWith(`${userId}/${petId}/`)
  ) {
    throw new Error('INVALID_DOCUMENT_STORAGE_PATH')
  }

  const table = category === 'asi' ? 'vaccine_records_v2' : 'parasite_records'
  const notes = buildApplicationNotes(details)
  const compatibleUpdate =
    category === 'asi'
      ? {
          brand_free_text: details.brand || null,
          lot_number: details.lot_number || null,
          vet_name: details.provider_name || null,
          reaction_observed: details.reaction_observed || null,
          document_storage_path: details.document_storage_path || null,
          expiration_date: details.product_expiry_at
            ? `${details.product_expiry_at}T00:00:00.000Z`
            : null,
          administration_route: details.administration_route || null,
          notes: notes || undefined,
        }
      : {
          brand_free_text: details.brand || null,
          product_free_text: details.product_name || null,
          document_storage_path: details.document_storage_path || null,
          application_method: details.application_method || undefined,
          protection_duration_days:
            details.protection_duration_days || undefined,
          notes: notes || undefined,
        }

  const { error: compatibleUpdateError } = await supabase
    .from(table)
    .update(compatibleUpdate)
    .eq('id', recordId)
    .eq('pet_id', petId)

  if (compatibleUpdateError) throw compatibleUpdateError

  const extendedUpdate =
    category === 'asi'
      ? {
          administration_place: details.administration_place || null,
          institution_name: details.institution_name || null,
          provider_name: details.provider_name || null,
          amount: details.amount ?? null,
          currency: details.currency || 'TRY',
          product_notes: details.product_notes || null,
        }
      : {
          lot_number: details.lot_number || null,
          product_expiry_at: details.product_expiry_at || null,
          administration_place: details.administration_place || null,
          institution_name: details.institution_name || null,
          provider_name: details.provider_name || null,
          amount: details.amount ?? null,
          currency: details.currency || 'TRY',
          product_notes: details.product_notes || null,
          reaction_observed: details.reaction_observed || null,
          applied_dose: details.applied_dose || null,
          active_ingredient: details.active_ingredient || null,
        }

  const { error: extendedUpdateError } = await supabase
    .from(table)
    .update(extendedUpdate)
    .eq('id', recordId)
    .eq('pet_id', petId)

  if (extendedUpdateError && !isMissingColumnError(extendedUpdateError)) {
    throw extendedUpdateError
  }
  if (extendedUpdateError) {
    console.warn('[health-records] Extended application columns are not available yet', {
      category,
      code: extendedUpdateError.code,
    })
  }

  if (details.amount && details.amount > 0) {
    const paymentType = category === 'asi' ? 'vaccine' : 'parasite'
    const paymentQuery = supabase
      .from('payments')
      .select('id')
      .eq('record_id', recordId)
      .eq('payment_type', paymentType)
      .maybeSingle()
    const { data: existingPayment, error: paymentLookupError } = await paymentQuery

    if (paymentLookupError) throw paymentLookupError

    if (!existingPayment) {
      const { error: paymentError } = await supabase.from('payments').insert({
        pet_id: petId,
        record_id: recordId,
        payment_type: paymentType,
        payment_date: new Date().toISOString().split('T')[0],
        amount: details.amount,
        notes: [
          details.product_name ||
            details.brand ||
            (category === 'asi' ? 'Aşı uygulaması' : 'Parazit uygulaması'),
          `Para birimi: ${details.currency || 'TRY'}`,
        ].join(' · '),
      })

      if (paymentError && paymentError.code !== '23505') throw paymentError
    }
  }

  return details
}
