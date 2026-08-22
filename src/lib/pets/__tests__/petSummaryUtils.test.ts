import { describe, it, expect } from 'vitest'
import { getPetVeterinaryLabel, getPetNutritionLabel } from '../petSummaryUtils'

describe('petSummaryUtils', () => {
  describe('getPetVeterinaryLabel', () => {
    it('returns formatted company and vet name when both are provided', () => {
      const pet = { vet_company: 'Patiler Kliniği', vet_name: 'Dr. Ahmet Yılmaz' }
      expect(getPetVeterinaryLabel(pet)).toBe('Patiler Kliniği (Dr. Ahmet Yılmaz)')
    })

    it('returns only company if company name contains vet name', () => {
      const pet = { vet_company: 'Dr. Ahmet Yılmaz Kliniği', vet_name: 'Dr. Ahmet Yılmaz' }
      expect(getPetVeterinaryLabel(pet)).toBe('Dr. Ahmet Yılmaz Kliniği')
    })

    it('returns company when only company is provided', () => {
      const pet = { vet_company: 'Can Dostlar Hayvan Hastanesi' }
      expect(getPetVeterinaryLabel(pet)).toBe('Can Dostlar Hayvan Hastanesi')
    })

    it('returns vet name when only vet_name is provided', () => {
      const pet = { vet_name: 'Dr. Ayşe Kaya' }
      expect(getPetVeterinaryLabel(pet)).toBe('Dr. Ayşe Kaya')
    })

    it('falls back to appointments clinic name when pet vet fields are empty', () => {
      const pet = {}
      const appointments = [{ clinics: { name: 'Kadıköy Vet Kliniği' } }]
      expect(getPetVeterinaryLabel(pet, appointments)).toBe('Kadıköy Vet Kliniği')
    })

    it('falls back to initialVaccines vet/institution name when appointments are empty', () => {
      const pet = {}
      const initialVaccines = [{ institution_name: 'Moda Veteriner Polikliniği' }]
      expect(getPetVeterinaryLabel(pet, [], initialVaccines)).toBe('Moda Veteriner Polikliniği')
    })

    it('prioritizes active and primary vet from pet_vets table', () => {
      const pet = { vet_company: 'Eski Klinik' }
      const vets = [
        { clinic_name: 'Albatros Veteriner Kliniği', doctor_name: 'Dr. Mustafa Esen', is_primary: true, is_past: false },
        { clinic_name: 'Eski Kadıköy Klinik', is_primary: false, is_past: true }
      ]
      expect(getPetVeterinaryLabel(pet, [], [], [], vets)).toBe('Albatros Veteriner Kliniği (Dr. Mustafa Esen)')
    })

    it('returns "Kayıtlı veteriner yok" when no vet information is available', () => {
      const pet = {}
      expect(getPetVeterinaryLabel(pet)).toBe('Kayıtlı veteriner yok')
    })
  })

  describe('getPetNutritionLabel', () => {
    it('formats nutrition profile from nutritionLogs when present', () => {
      const nutritionLogs = [{ food_brand: 'Pro Plan', food_product: 'Medium Puppy', food_type: 'Kuru' }]
      expect(getPetNutritionLabel(nutritionLogs)).toBe('Pro Plan Medium Puppy (Kuru)')
    })

    it('correctly extracts manual assignment with brand_free_text and product_free_text', () => {
      const assignments = [
        {
          is_active: true,
          brand_free_text: 'Reflex',
          product_free_text: 'Yetişkin Kedi Mambası',
          food_form: 'Kuru Mama',
        },
      ]
      expect(getPetNutritionLabel([], assignments)).toBe('Reflex Yetişkin Kedi Mambası (Kuru Mama)')
    })

    it('formats catalog food assignment with food_product_family brand and official_name', () => {
      const assignments = [
        {
          is_active: true,
          food_product_family: {
            brand: { display_name: 'Royal Canin' },
            official_name: 'Sterilised 37',
            food_form: 'Kuru Mama',
          },
        },
      ]
      expect(getPetNutritionLabel([], assignments)).toBe('Royal Canin Sterilised 37 (Kuru Mama)')
    })

    it('avoids duplicating brand name if product name already contains brand name', () => {
      const assignments = [
        {
          is_active: true,
          food_product_family: {
            brand: { display_name: 'Acana' },
            official_name: 'Acana Wild Prairie',
            food_form: 'Kuru Mama',
          },
        },
      ]
      expect(getPetNutritionLabel([], assignments)).toBe('Acana Wild Prairie (Kuru Mama)')
    })

    it('returns "Mama tanımlanmadı" when no nutrition or assignment data is available', () => {
      expect(getPetNutritionLabel([], [])).toBe('Mama tanımlanmadı')
    })
  })
})
