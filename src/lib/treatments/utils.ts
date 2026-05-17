/**
 * Treatment Module – Business Logic Utilities
 *
 * These pure functions are extracted from TreatmentsClient.tsx so they can be
 * tested independently without a DOM or Supabase connection.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Medication {
  name: string;
  frequency: string;
  days: string;
  dose: string;
  trackEnd: boolean;
}

export interface MedicationScheduleEntry {
  plan_type: 'medication' | 'checkup';
  title: string;
  due_date: string;
  status: 'upcoming';
  source: 'treatment_medication' | 'treatment_med_end';
}

export interface PaymentGuardOptions {
  /** Status being saved */
  status: string;
  /** Cost amount as string (from form) */
  cost: string;
  /** Payment status selected in form */
  paymentStatus: string;
  /** The treatment being edited (null = new treatment) */
  editingTreatment: { status: string } | null;
}

// ---------------------------------------------------------------------------
// Schedule Generation
// ---------------------------------------------------------------------------

/**
 * Generates a list of daily medication schedule entries for a single medication.
 * Also appends a "end of stock" checkup entry if `trackEnd` is true.
 *
 * @param med        Medication object from the form
 * @param petId      UUID of the pet
 * @param startDate  ISO date string (YYYY-MM-DD)
 */
export function buildMedicationSchedule(
  med: Medication,
  petId: string,
  startDate: string
): MedicationScheduleEntry[] {
  const days = parseInt(med.days, 10);
  const baseDate = new Date(startDate);
  const entries: MedicationScheduleEntry[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    entries.push({
      plan_type: 'medication',
      title: `💊 İlaç: ${med.name} (${med.dose})`,
      due_date: d.toISOString().split('T')[0],
      status: 'upcoming',
      source: 'treatment_medication',
    });
  }

  if (med.trackEnd) {
    const endD = new Date(baseDate);
    endD.setDate(endD.getDate() + days - 1);
    entries.push({
      plan_type: 'checkup',
      title: `⚠️ ${med.name} İlacı Bitiyor! Stok kontrolü yapın.`,
      due_date: endD.toISOString().split('T')[0],
      status: 'upcoming',
      source: 'treatment_med_end',
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Payment Guard (duplicate prevention)
// ---------------------------------------------------------------------------

/**
 * Returns true when a payment record SHOULD be created for this save operation.
 *
 * Rules:
 * - Treatment must be "Tamamlandı"
 * - Cost must be > 0
 * - Payment status must be "Ödendi"
 * - For edits: only if the previous status was NOT already "Tamamlandı"
 *   (prevents duplicate rows when re-saving an already-completed treatment)
 */
export function shouldCreatePayment({
  status,
  cost,
  paymentStatus,
  editingTreatment,
}: PaymentGuardOptions): boolean {
  if (status !== 'Tamamlandı') return false;
  if (!cost || parseFloat(cost) <= 0) return false;
  if (paymentStatus !== 'Ödendi') return false;

  // New treatment: always create
  if (!editingTreatment) return true;

  // Edit: only create if status changed TO "Tamamlandı"
  return editingTreatment.status !== 'Tamamlandı';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the final disease name, handling the "Diğer" (custom) selection.
 */
export function resolveDiseaseLabel(
  diseaseSelect: string,
  customDisease: string
): string {
  return diseaseSelect === 'Diğer' ? customDisease.trim() : diseaseSelect.trim();
}
