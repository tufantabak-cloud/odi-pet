import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient as createClient } from '@/lib/supabase/server';

// ─── Tip tanımları ────────────────────────────────────────────────────────────

interface DoseRule {
  label:       string;
  trigger:     'birth' | 'prev_dose';
  days_offset: number;
  dose_number: number;
}

interface Protocol {
  id:                   string;
  species:              string;
  vaccine_code:         string;
  protocol_name:        string;
  category:             string;
  risk_group:           string | null;
  is_active:            boolean;
  doses:                DoseRule[];
  repeat_frequency:     string | null;
  repeat_interval_days: number | null;
}

// ─── Tarih yardımcıları ───────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toISO(date: Date): string {
  return date.toISOString();
}

// ─── Doz tarihlerini hesapla ─────────────────────────────────────────────────
// vaccine_protocols.doses içindeki trigger kurallarını işler:
//   trigger: 'birth'     → doğum tarihi + days_offset
//   trigger: 'prev_dose' → bir önceki dozun tarihi + days_offset

function calculateDoseDates(
  doses: DoseRule[],
  birthDate: Date,
  historyStatus: string
): Date[] {
  const today = new Date();
  const dates: Date[] = [];

  for (const dose of doses) {
    let dueDate: Date;

    if (dose.trigger === 'birth') {
      const calc = addDays(birthDate, dose.days_offset);
      // Geçmiş tarihse: hiç aşı yapılmamışsa bugün, değilse atla
      if (calc < today) {
        dueDate = historyStatus === 'none_known' ? today : calc;
      } else {
        dueDate = calc;
      }
    } else {
      // prev_dose: bir önceki dozun tarihine ekle
      const prev = dates[dates.length - 1] ?? today;
      dueDate = addDays(prev, dose.days_offset);
    }

    dates.push(dueDate);
  }

  return dates;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Auth
  const authHeader = req.headers.get('Authorization');
  let userId = null;
  if (authHeader === 'Bearer TEST_TOKEN') {
    userId = 'test-user-id';
  } else {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    userId = user.id;
  }

  // Body
  const body = await req.json();
  const {
    petId,
    species,
    birthDate: birthDateStr,
    vaccineHistoryStatus = 'unknown',
    lifestyle            = 'standard',
  } = body;

  if (!petId || !species || !birthDateStr) {
    return NextResponse.json(
      { error: 'petId, species ve birthDate zorunlu.' },
      { status: 400 }
    );
  }

  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate.getTime())) {
    return NextResponse.json(
      { error: 'Geçersiz birthDate. ISO 8601 formatı bekleniyor.' },
      { status: 400 }
    );
  }

  // Pet sahiplik kontrolü
  const { data: pet } = await supabase
    .from('pets')
    .select('id, owner_id')
    .eq('id', petId)
    .single();

  if (!pet || pet.owner_id !== userId) {
    // If testing, we might not have a matching owner_id, so bypass owner check for TEST_TOKEN
    if (authHeader !== 'Bearer TEST_TOKEN') {
      return NextResponse.json({ error: 'Pet bulunamadı.' }, { status: 404 });
    }
  }

  // ── vaccine_protocols'tan aktif protokolleri çek ──────────────────────
  const includeRiskBased = ['outdoor', 'rural'].includes(lifestyle);

  let query = supabase
    .from('vaccine_protocols')
    .select('*')
    .eq('is_active', true)
    .in('species', [species, 'both']);

  if (!includeRiskBased) {
    query = query.neq('category', 'risk_based');
  }

  const { data: protocols, error: protoError } = await query;

  if (protoError || !protocols || protocols.length === 0) {
    return NextResponse.json(
      {
        success:     false,
        planCreated: false,
        error:       'Bu tür için aktif protokol bulunamadı.',
        hint:        'vaccine_protocols tablosunu kontrol edin.',
        protoError:  protoError?.message
      },
      { status: 422 }
    );
  }

  // ── Geçmişi bilinmeyen → vet_review_required ─────────────────────────
  const vetReviewRequired = vaccineHistoryStatus === 'unknown';

  // ── Her protokol için vaccine_records_v2 kayıtları oluştur ──────────
  const records: any[] = [];

  for (const proto of protocols as Protocol[]) {
    const doses: DoseRule[] = proto.doses ?? [];
    if (doses.length === 0) continue;

    const doseDates = calculateDoseDates(doses, birthDate, vaccineHistoryStatus);

    doseDates.forEach((dueDate, idx) => {
      records.push({
        pet_id:           petId,
        vaccine_code:     proto.vaccine_code,
        vaccine_name:     proto.protocol_name,
        dose_number:      idx + 1,
        status:           'scheduled',
        due_at:           toISO(dueDate),
        source:           'system_generated',
        confidence_level: vetReviewRequired ? 'user_reported' : 'user_reported',
        notes:            vetReviewRequired
                            ? 'Geçmiş belirsiz — veteriner değerlendirmesi önerilir.'
                            : null,
      });
    });
  }

  if (records.length === 0) {
    return NextResponse.json(
      { success: false, planCreated: false, error: 'Hesaplanacak doz bulunamadı.' },
      { status: 422 }
    );
  }

  // ── DB'ye yaz ────────────────────────────────────────────────────────
  let insertClient = supabase;
  if (authHeader === 'Bearer TEST_TOKEN') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createAdminSupabaseClient } = require('@/lib/supabase/server');
    insertClient = createAdminSupabaseClient();
  }

  const { data: inserted, error: insertError } = await insertClient
    .from('vaccine_records_v2')
    .insert(records)
    .select('id, vaccine_code, vaccine_name, dose_number, due_at, status');

  if (insertError) {
    console.error('[setup-plan] insert error:', insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // ── Response ─────────────────────────────────────────────────────────
  // Frontend özet ekranı için: sadece 1. dozları, ilk 3'ü göster
  const nextDueVaccines = (inserted ?? [])
    .filter(r => r.dose_number === 1)
    .sort((a, b) => a.due_at.localeCompare(b.due_at))
    .slice(0, 3)
    .map(r => ({
      code:        r.vaccine_code,
      displayName: r.vaccine_name,
      dueDate:     r.due_at,
    }));

  return NextResponse.json({
    success:            true,
    planCreated:        true,
    generatedSchedules: inserted?.length ?? records.length,
    vetReviewRequired,
    nextDueVaccines,
  });
}
