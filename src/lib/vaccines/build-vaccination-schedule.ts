// Saf fonksiyon — DB çağrısı yok, Supabase client almaz.
// vaccine_protocols.doses JSON'undaki birth/prev_dose zincirini gerçek
// anlamda okuyup bir doz takvimi üretir.

export type ScheduleTrigger = 'birth' | 'prev_dose' | 'last_record' | 'today'

export type ScheduleItem = {
  vaccineCode: string
  vaccineName: string
  doseNumber: number
  label: string
  scheduledAt: Date
  isBooster: boolean
  trigger: ScheduleTrigger
  daysOffset: number
  /** scheduledAt bugünden (referenceDate) önceki bir takvim günündeyse true — plans.status'u 'overdue' yapmak için. */
  isPast: boolean
}

export type ProtocolDose = {
  dose_number: number
  trigger: 'birth' | 'prev_dose'
  days_offset: number
  label: string
}

export type ScheduleProtocol = {
  vaccine_code: string
  protocol_name: string
  doses: ProtocolDose[]
  repeat_frequency: 'none' | 'monthly' | 'yearly' | 'custom' | null
}

export type SchedulePet = {
  id: string
  birth_date: string | null
  species: string
}

export type ScheduleExistingRecord = {
  vaccine_code: string
  administered_at: string | null
  status: string
  dose_number: number | null
}

const BOOSTER_LABEL_RE = /booster|tekrar/i

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function sortedDoses(doses: ProtocolDose[]): ProtocolDose[] {
  return [...doses].sort((a, b) => a.dose_number - b.dose_number)
}

// Takvim günü karşılaştırması — "bugün" hiçbir zaman overdue sayılmaz,
// saat farkları yüzünden yanlış pozitif üretmez.
function isPastDate(date: Date, reference: Date): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const r = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate())
  return d.getTime() < r.getTime()
}

export function buildVaccinationSchedule(params: {
  pet: SchedulePet
  protocol: ScheduleProtocol
  existingRecords: ScheduleExistingRecord[]
  referenceDate?: Date
}): ScheduleItem[] {
  const { pet, protocol, existingRecords } = params
  const referenceDate = params.referenceDate ?? new Date()
  const doses = sortedDoses(protocol.doses ?? [])

  if (doses.length === 0) return []

  // ── 2. Tamamlanmış kayıt varsa → sadece bir sonraki booster ────
  const completed = existingRecords.filter(
    (r) => r.status === 'completed' && !!r.administered_at
  )

  if (completed.length > 0) {
    const lastRecord = completed.reduce((latest, r) =>
      new Date(r.administered_at as string) > new Date(latest.administered_at as string) ? r : latest
    )
    const lastAdministeredAt = new Date(lastRecord.administered_at as string)

    // Hangi doza kadar tamamlandığını belirle. dose_number kaydedilmemişse
    // (ör. eski/manuel girişler) tamamlanan kayıt sayısını yaklaşık dose
    // sayısı olarak kabul et.
    const recordedDoseNumbers = completed
      .map((r) => r.dose_number)
      .filter((n): n is number => typeof n === 'number' && n > 0)
    const highestCompletedDose =
      recordedDoseNumbers.length > 0 ? Math.max(...recordedDoseNumbers) : completed.length

    // ── Seri henüz bitmedi → sıradaki tek dozu üret (booster'a atlama) ──
    if (highestCompletedDose < doses.length) {
      const nextDose = doses.find((d) => d.dose_number === highestCompletedDose + 1)
        ?? doses[Math.min(highestCompletedDose, doses.length - 1)]

      const scheduledAt = addDays(lastAdministeredAt, nextDose.days_offset)

      return [
        {
          vaccineCode: protocol.vaccine_code,
          vaccineName: protocol.protocol_name,
          doseNumber: nextDose.dose_number,
          label: nextDose.label,
          scheduledAt,
          isBooster: BOOSTER_LABEL_RE.test(nextDose.label),
          trigger: 'last_record',
          daysOffset: nextDose.days_offset,
          isPast: isPastDate(scheduledAt, referenceDate),
        },
      ]
    }

    // ── Seri tamamlandı → repeat_frequency'ye göre bir sonraki booster ──
    if (protocol.repeat_frequency === 'none' || !protocol.repeat_frequency) {
      // Protokol tamamlandı, tekrar gerekmiyor.
      return []
    }

    // Booster şablonu: doses dizisindeki son eleman (genelde prev_dose + booster label).
    const boosterTemplate = doses[doses.length - 1]
    const intervalDays =
      protocol.repeat_frequency === 'yearly'
        ? 365
        : protocol.repeat_frequency === 'monthly'
          ? 30
          : boosterTemplate.days_offset || 365

    const scheduledAt = addDays(lastAdministeredAt, intervalDays)

    return [
      {
        vaccineCode: protocol.vaccine_code,
        vaccineName: protocol.protocol_name,
        doseNumber: boosterTemplate.dose_number,
        label: boosterTemplate.label,
        scheduledAt,
        isBooster: true,
        trigger: 'last_record',
        daysOffset: intervalDays,
        isPast: isPastDate(scheduledAt, referenceDate),
      },
    ]
  }

  // ── Yaş belirleme (rule 1: birth_date yoksa yetişkin modu) ──────
  let isJuvenile = false
  if (pet.birth_date) {
    const birthDate = new Date(pet.birth_date)
    if (!isNaN(birthDate.getTime())) {
      const ageInDays = Math.floor((referenceDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24))
      isJuvenile = ageInDays < 365
    }
  }

  // ── 3. Kayıt yok + yavru → doses zincirini birth_date'e göre üret ──
  if (isJuvenile && pet.birth_date) {
    const birthDate = new Date(pet.birth_date)
    const items: ScheduleItem[] = []
    let previousDoseDate: Date | null = null

    for (const dose of doses) {
      let scheduledAt: Date
      if (dose.trigger === 'birth') {
        scheduledAt = addDays(birthDate, dose.days_offset)
      } else {
        // trigger === 'prev_dose'
        const base = previousDoseDate ?? birthDate
        scheduledAt = addDays(base, dose.days_offset)
      }
      previousDoseDate = scheduledAt

      items.push({
        vaccineCode: protocol.vaccine_code,
        vaccineName: protocol.protocol_name,
        doseNumber: dose.dose_number,
        label: dose.label,
        scheduledAt,
        isBooster: BOOSTER_LABEL_RE.test(dose.label),
        trigger: dose.trigger,
        daysOffset: dose.days_offset,
        isPast: isPastDate(scheduledAt, referenceDate),
      })
    }

    return items
  }

  // ── 4. Kayıt yok + yetişkin → ilk doz bugün, sonrası zincirleme ──
  const items: ScheduleItem[] = []
  let previousDoseDate: Date | null = null

  doses.forEach((dose, index) => {
    let scheduledAt: Date
    let trigger: ScheduleTrigger
    let daysOffset: number

    if (index === 0) {
      scheduledAt = new Date(referenceDate)
      trigger = 'today'
      daysOffset = 0
    } else {
      const base = previousDoseDate ?? referenceDate
      scheduledAt = addDays(base, dose.days_offset)
      trigger = 'prev_dose'
      daysOffset = dose.days_offset
    }
    previousDoseDate = scheduledAt

    // Yetişkin için ilk 2 doz başlangıç serisidir; 3. ve sonrası booster sayılır.
    const isBooster = index >= 2 || BOOSTER_LABEL_RE.test(dose.label)

    items.push({
      vaccineCode: protocol.vaccine_code,
      vaccineName: protocol.protocol_name,
      doseNumber: dose.dose_number,
      label: dose.label,
      scheduledAt,
      isBooster,
      trigger,
      daysOffset,
      isPast: isPastDate(scheduledAt, referenceDate),
    })
  })

  return items
}
