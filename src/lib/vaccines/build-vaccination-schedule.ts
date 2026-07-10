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
    })
  })

  return items
}
