/**
 * X.1 — Ortak Aşı Kayıt Servisi (Unified Vaccine Record Service)
 *
 * Brand normalizasyonu (brand_id → brand_free_text fallback),
 * protocol_name lookup ve vaccine_records_v2 insert mantığını
 * tek kanonsal fonksiyonda toplar.
 *
 * Çağıran yollar:
 *  1. SmartTaskWizard.tsx        — plan akışında "yapıldı" işaretleme
 *  2. scan-document/confirm      — OCR aşı kartı tarama
 *  3. /api/pets/[id]/vaccines    — manuel POST endpoint
 *
 * Bu servis Supabase client almaz — caller'dan inject edilir.
 * Hem server (API route) hem client (browser) ortamında çalışır.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { validateVaccineRecord, type ValidationResult } from './validateVaccineRecord'
import { normalizeConfidenceLevel } from './confidenceLevels'

// ─── Input Types ────────────────────────────────────────────────────────────

export interface CreateVaccineRecordInput {
  /** Evcil hayvan ID */
  pet_id: string
  /** Normalleştirilmiş tür: 'dog' | 'cat' | ... (brand arama için) */
  species?: string
  /**
   * Protokol kodu (CUSTOM, RABIES, DOG_CDV vb.)
   * Bilinmiyorsa undefined bırakın — servis CUSTOM atar.
   */
  vaccine_code?: string
  /**
   * Protokol/aşı adı.
   * Servis önce vaccine_protocols üzerinden protocol_name çözmeye çalışır.
   * Bulunamazsa bu değeri yazar.
   */
  vaccine_name: string
  /**
   * Uygulanma tarihi: 'YYYY-MM-DD' veya ISO string.
   * null/undefined ise DB NULL kalır.
   */
  administered_at?: string | null
  /** Sonraki doz tarihi */
  next_due_at?: string | null
  /**
   * Marka UUID'si (vaccine_brands.id).
   * Verilirse brand_free_text kesinlikle null yazılır.
   */
  brand_id?: string | null
  /**
   * Serbest metin marka adı.
   * brand_id verilmişse bu alan görmezden gelinir.
   */
  brand_free_text?: string | null
  /** Lot numarası */
  lot_number?: string | null
  /** Veteriner adı */
  vet_name?: string | null
  /** Uygulama yolu */
  administration_route?: string | null
  /** Belge depolama yolu (vaccine-documents bucket) */
  document_storage_path?: string | null
  /** Notlar */
  notes?: string | null
  /** Dose numarası (çok dozlu protokollerde) */
  dose_number?: number | null
  /**
   * Kayıt durumu.
   * @default 'completed'
   */
  status?: 'completed' | 'done'
  /**
   * Güven seviyesi.
   * @default 'user_reported'
   */
  confidence_level?: 'verified' | 'user_reported' | 'system' | 'manual' | 'ocr'
  /**
   * Kayıt kaynağı.
   * @default 'manual'
   */
  source?: 'manual' | 'user_quick_marked' | 'imported_history' | 'user_detailed'
  /**
   * İdempotency anahtarı (tekrar insert'i önlemek için)
   */
  idempotency_key?: string | null
}

// ─── Output Type ────────────────────────────────────────────────────────────

export interface CreateVaccineRecordResult {
  success: true
  record: Record<string, unknown>
  /**
   * Brand çözümleme yöntemi: 'id' | 'free_text' | 'none'
   * Caller'ın log/debug amacıyla kullanabileceği metadata.
   */
  brand_resolution: 'id' | 'free_text' | 'none'
  /**
   * Protocol adı çözümlendi mi?
   * false ise vaccine_name input olduğu gibi yazıldı.
   */
  protocol_resolved: boolean
  validation_result?: ValidationResult
}

export interface CreateVaccineRecordError {
  success: false
  error: string
  code?: string
  validation_result?: ValidationResult
}

export type CreateVaccineRecordResponse = CreateVaccineRecordResult | CreateVaccineRecordError

// ─── Ana Fonksiyon ───────────────────────────────────────────────────────────

/**
 * vaccine_records_v2'ye kanonsal şekilde insert eder.
 *
 * @param supabase  Caller'dan inject edilen Supabase client
 * @param input     Aşı kayıt parametreleri
 * @returns         Oluşturulan kayıt veya hata objesi
 */
export async function createVaccineRecord(
  supabase: SupabaseClient,
  input: CreateVaccineRecordInput
): Promise<CreateVaccineRecordResponse> {
  try {
    // ── 0. Validation Engine ──────────────────────────────────────────────
    const validationResult = validateVaccineRecord(input)
    if (!validationResult.valid) {
      return {
        success: false,
        error: validationResult.errors.map(e => e.message).join('; '),
        code: validationResult.errors[0]?.code || 'VALIDATION_FAILED',
        validation_result: validationResult,
      }
    }

    // ── 1. Brand normalizasyonu ────────────────────────────────────────────
    // Kural: brand_id VE brand_free_text aynı anda asla yazılmaz.
    const normalizedBrandId: string | null = input.brand_id ?? null
    const normalizedBrandFreeText: string | null =
      normalizedBrandId
        ? null  // brand_id varsa free_text kesinlikle null
        : (input.brand_free_text?.trim() || null)

    const brandResolution: 'id' | 'free_text' | 'none' =
      normalizedBrandId ? 'id' :
      normalizedBrandFreeText ? 'free_text' :
      'none'

    // ── 2. Protocol name çözümleme ────────────────────────────────────────
    // Servis önce vaccine_protocols tablosunda protocol_name arar.
    // Bulunamazsa input.vaccine_name'i kullanır.
    let resolvedVaccineName = input.vaccine_name
    let protocolResolved = false

    const vaccineCode = input.vaccine_code || 'CUSTOM'

    if (vaccineCode !== 'CUSTOM') {
      const { data: protocol } = await supabase
        .from('vaccine_protocols')
        .select('protocol_name')
        .eq('vaccine_code', vaccineCode)
        .eq('is_active', true)
        .maybeSingle()

      if (protocol?.protocol_name) {
        resolvedVaccineName = protocol.protocol_name
        protocolResolved = true
      }
    }

    // ── 3. vaccine_records_v2 insert ─────────────────────────────────────
    const { data: record, error: insertError } = await supabase
      .from('vaccine_records_v2')
      .insert({
        pet_id: input.pet_id,
        vaccine_code: vaccineCode,
        vaccine_name: resolvedVaccineName,
        administered_at: input.administered_at ?? null,
        next_due_at: input.next_due_at ?? null,
        lot_number: input.lot_number ?? null,
        vet_name: input.vet_name ?? null,
        brand_id: normalizedBrandId,
        brand_free_text: normalizedBrandFreeText,
        administration_route: input.administration_route ?? null,
        document_storage_path: input.document_storage_path ?? null,
        notes: input.notes ?? null,
        dose_number: input.dose_number ?? null,
        status: input.status ?? 'completed',
        confidence_level: normalizeConfidenceLevel(input.confidence_level),
        source: input.source ?? 'manual',
        idempotency_key: input.idempotency_key ?? null,
      })
      .select()
      .single()

    if (insertError) {
      return {
        success: false,
        error: insertError.message,
        code: insertError.code,
      }
    }

    return {
      success: true,
      record: record as Record<string, unknown>,
      brand_resolution: brandResolution,
      protocol_resolved: protocolResolved,
    }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'createVaccineRecord: beklenmeyen hata',
    }
  }
}
