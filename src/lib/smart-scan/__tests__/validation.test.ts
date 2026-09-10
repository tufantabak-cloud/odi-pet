import { describe, it, expect } from 'vitest'
import { validateCrossPage } from '../validation'

describe('Smart Scan Validation & Cross-Page Consistency', () => {
  it('produces MATCH status when all pages are consistent and valid, populating pet, owner and vet data', () => {
    const res = validateCrossPage({
      cover: {
        passport_no: 'TR-34-987654',
        microchip_no: '900123456789012',
      },
      page_4: {
        owner_first_name: 'Tufan',
        owner_last_name: 'Tabak',
        owner_phone: '+905321112233',
        owner_city: 'İstanbul',
        owner_district: 'Kadıköy',
        owner_address: 'Moda Cad. No: 12',
        owner_postal_code: '34710',
      },
      page_5: {
        name: 'Duman',
        species: 'cat',
        breed: 'British Shorthair',
        gender: 'male',
        birth_date: '2023-05-15',
        color: 'Gri',
      },
      page_6: {
        microchip_no: '900123456789012',
        tattoo_no: 'TAT-9988',
        implant_date: '2023-08-10',
        implant_location: 'Sol boyun',
      },
      page_7: {
        veterinarian_name: 'Dr. Ahmet Yılmaz',
        clinic_name: 'Kadıköy Veteriner Kliniği',
        vet_phone: '+902161234567',
        vet_email: 'vet@kadikoyvet.com',
        registration_city: 'İstanbul',
        registration_district: 'Kadıköy',
      },
    })

    expect(res.status).toBe('MATCH')
    expect(res.isValid).toBe(true)
    expect(res.canCommit).toBe(true)
    expect(res.conflicts).toHaveLength(0)

    // Pet Data
    expect(res.unifiedData.name).toBe('Duman')
    expect(res.unifiedData.species).toBe('cat')
    expect(res.unifiedData.breed).toBe('British Shorthair')
    expect(res.unifiedData.gender).toBe('male')
    expect(res.unifiedData.birth_date).toBe('2023-05-15')
    expect(res.unifiedData.color).toBe('Gri')
    expect(res.unifiedData.microchip_no).toBe('900123456789012')
    expect(res.unifiedData.passport_no).toBe('TR-34-987654')
    expect(res.unifiedData.tattoo_no).toBe('TAT-9988')
    expect(res.unifiedData.implant_date).toBe('2023-08-10')

    // Owner Data (Page 4)
    expect(res.unifiedData.owner_first_name).toBe('Tufan')
    expect(res.unifiedData.owner_last_name).toBe('Tabak')
    expect(res.unifiedData.owner_phone).toBe('+905321112233')
    expect(res.unifiedData.owner_city).toBe('İstanbul')
    expect(res.unifiedData.owner_district).toBe('Kadıköy')
    expect(res.unifiedData.owner_neighborhood).toBe('Moda Cad. No: 12')
    expect(res.unifiedData.owner_postal_code).toBe('34710')

    // Vet Data (Page 7)
    expect(res.unifiedData.vet_name).toBe('Dr. Ahmet Yılmaz')
    expect(res.unifiedData.vet_company).toBe('Kadıköy Veteriner Kliniği')
    expect(res.unifiedData.vet_phone).toBe('+902161234567')
    expect(res.unifiedData.vet_email).toBe('vet@kadikoyvet.com')
    expect(res.unifiedData.registration_city).toBe('İstanbul')
    expect(res.unifiedData.registration_district).toBe('Kadıköy')
  })

  it('detects CONFLICT when microchip differs between cover and page 6', () => {
    const res = validateCrossPage({
      cover: {
        passport_no: 'TR-06-111111',
        microchip_no: '900111111111111',
      },
      page_5: {
        name: 'Boncuk',
        species: 'dog',
        breed: 'Golden Retriever',
      },
      page_6: {
        microchip_no: '900222222222222', // Mismatch!
      },
    })

    expect(res.status).toBe('CONFLICT')
    expect(res.canCommit).toBe(false)
    expect(res.conflicts.some(c => c.includes('Mikroçip numarası sayfalar arasında çelişiyor'))).toBe(true)
  })

  it('detects CONFLICT when chronological dates are reversed (implant before birth)', () => {
    const res = validateCrossPage({
      page_5: {
        name: 'Zeytin',
        species: 'cat',
        breed: 'Tekir',
        birth_date: '2024-01-10',
      },
      page_6: {
        microchip_no: '900123456789012',
        implant_date: '2023-12-01', // Before birth date!
      },
    })

    expect(res.status).toBe('CONFLICT')
    expect(res.conflicts.some(c => c.includes('Mikroçip uygulama tarihi doğum tarihinden önce olamaz'))).toBe(true)
  })

  it('detects CONFLICT when birth date is in the future', () => {
    const res = validateCrossPage({
      page_5: {
        name: 'Gelecek',
        species: 'dog',
        breed: 'Poodle',
        birth_date: '2030-01-01',
      },
    })

    expect(res.status).toBe('CONFLICT')
    expect(res.conflicts.some(c => c.includes('Doğum tarihi bugünden ileri bir tarih olamaz'))).toBe(true)
  })

  it('produces UNKNOWN status when required identity fields (name/breed) are missing', () => {
    const res = validateCrossPage({
      cover: {
        passport_no: 'TR-34-123456',
      },
      page_5: {
        name: '', // Empty name
        species: 'cat',
        breed: '', // Missing breed
      },
    })

    expect(res.status).toBe('UNKNOWN')
    expect(res.canCommit).toBe(false)
  })
})
