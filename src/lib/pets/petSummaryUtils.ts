/**
 * Pet Summary Utils - Odi.Pet
 * Utilities for resolving and formatting pet overview summary card fields.
 */

export interface PetVetSource {
  vet_company?: string | null
  vet_name?: string | null
}

/**
 * Resolves the display label for the pet's primary veterinarian / clinic.
 * Prioritizes direct pet record attributes, falling back to appointments or initial health records.
 */
export function getPetVeterinaryLabel(
  pet: PetVetSource,
  appointments?: any[],
  initialVaccines?: any[],
  initialParasites?: any[],
  vets?: any[]
): string {
  // 0. Priority: Canonical pet_vets table (Active & Primary vet first)
  if (vets && vets.length > 0) {
    const primaryVet =
      vets.find((v: any) => (v.is_primary || v.isPrimary) && !v.is_past && !v.isPast) ||
      vets.find((v: any) => !v.is_past && !v.isPast) ||
      vets.find((v: any) => v.is_primary || v.isPrimary) ||
      vets[0]

    if (primaryVet) {
      const company = (primaryVet.clinic_name || primaryVet.name || '').trim()
      const name = (primaryVet.doctor_name || primaryVet.doctorName || '').trim()

      if (company && name) {
        if (company.toLowerCase().includes(name.toLowerCase())) {
          return company
        }
        return `${company} (${name})`
      }
      if (company) return company
      if (name) return name
    }
  }

  const company = pet?.vet_company?.trim() || ''
  const name = pet?.vet_name?.trim() || ''

  if (company && name) {
    if (company.toLowerCase().includes(name.toLowerCase())) {
      return company
    }
    return `${company} (${name})`
  }
  if (company) return company
  if (name) return name

  // Fallback 1: Appointments with clinic or vet name
  if (appointments && appointments.length > 0) {
    for (const appt of appointments) {
      const clinicName = appt?.clinics?.name || appt?.clinic_name || appt?.vet_notes
      if (clinicName && typeof clinicName === 'string' && clinicName.trim()) {
        return clinicName.trim()
      }
    }
  }

  // Fallback 2: Vaccine records with institution, provider or vet name
  if (initialVaccines && initialVaccines.length > 0) {
    for (const v of initialVaccines) {
      const vetName = v?.institution_name || v?.provider_name || v?.vet_name
      if (vetName && typeof vetName === 'string' && vetName.trim()) {
        return vetName.trim()
      }
    }
  }

  // Fallback 3: Parasite records with institution or provider name
  if (initialParasites && initialParasites.length > 0) {
    for (const p of initialParasites) {
      const vetName = p?.institution_name || p?.provider_name
      if (vetName && typeof vetName === 'string' && vetName.trim()) {
        return vetName.trim()
      }
    }
  }

  return 'Kayıtlı veteriner yok'
}

/**
 * Resolves the display label for the pet's active nutrition / food assignment.
 * Properly checks catalog relations as well as free-text fields (brand_free_text / product_free_text).
 */
export function getPetNutritionLabel(
  nutritionLogs?: any[],
  assignments?: any[]
): string {
  // 1. Check pet_nutrition_profiles (nutritionLogs)
  if (nutritionLogs?.[0]) {
    const n = nutritionLogs[0]
    const brand = n.food_brand?.trim() || ''
    const product = n.food_product?.trim() || ''
    const type = n.food_type?.trim() ? ` (${n.food_type.trim()})` : ''
    const fullName = [brand, product].filter(Boolean).join(' ')
    if (fullName) {
      return `${fullName}${type}`
    }
  }

  // 2. Check active pet_food_assignments
  const activeAssign = assignments?.find((a: any) => a && a.is_active !== false && !a.ended_at) || assignments?.[0]
  if (activeAssign) {
    const brandName =
      activeAssign.food_product_family?.brand?.display_name ||
      activeAssign.brand_free_text ||
      activeAssign.brand_name ||
      activeAssign.custom_brand ||
      ''

    const productName =
      activeAssign.food_product_family?.official_name ||
      activeAssign.product_free_text ||
      activeAssign.product_name ||
      activeAssign.custom_name ||
      ''

    const rawForm =
      activeAssign.food_product_family?.food_form ||
      activeAssign.food_form ||
      activeAssign.food_type ||
      ''

    let label = ''
    if (brandName && productName) {
      if (productName.toLowerCase().includes(brandName.toLowerCase())) {
        label = productName
      } else {
        label = `${brandName} ${productName}`
      }
    } else {
      label = brandName || productName
    }

    if (!label) {
      label = 'Tanımlı Mama'
    }

    if (rawForm) {
      const formSuffix = `(${rawForm})`
      if (!label.includes(formSuffix)) {
        label += ` ${formSuffix}`
      }
    }

    return label
  }

  return 'Mama tanımlanmadı'
}
