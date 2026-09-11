import React, { act } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PassportScanner, PAGES_FLOW, QUICK_COLORS, optimizeImageForOcr } from '../PassportScanner'
import { PassportPageReference } from '../PassportPageReference'

// Configure React act environment
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

// Mock next/navigation
const mockPush = vi.fn()
const mockBack = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: vi.fn(),
  }),
}))

// Mock barcode-scanner and pre-check for deterministic testing
vi.mock('@/lib/smart-scan/barcode-scanner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/smart-scan/barcode-scanner')>()
  return {
    ...actual,
    scanBarcodeFromImage: vi.fn().mockResolvedValue(null),
  }
})

vi.mock('@/lib/smart-scan/pre-check', () => ({
  analyzeImageQuality: vi.fn().mockReturnValue({ isPassable: true, warnings: [] }),
}))

// Helper to trigger controlled input changes in React
function changeInput(input: HTMLInputElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(input, value)
  } else {
    input.value = value
  }
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('Smart Passport Scan — UI & In-Place Manual Fallback Suite', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.clearAllMocks()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  // A. Page sequence test
  it('A. Page sequence test: follows official 5-step sequence in exact order', () => {
    const pageTypes = PAGES_FLOW.map(p => p.type)
    const pageDisplays = PAGES_FLOW.map(p => p.passportPageDisplay)

    expect(pageTypes).toEqual(['cover', 'page_4', 'page_5', 'page_6', 'page_7'])
    expect(pageDisplays).toEqual(['1/32', '4/32', '5/32', '6/32', '7/32'])
    expect(PAGES_FLOW).toHaveLength(5)
  })

  // B. CTA text test
  it('B. CTA text test: has action-oriented labels without redundant "Sayfa X/32" prefix', () => {
    for (const page of PAGES_FLOW) {
      expect(page.photoCta).toBeDefined()
      expect(page.photoCta.length).toBeGreaterThan(5)
      // Must NOT contain redundant "Sayfa " in the CTA button label
      expect(page.photoCta).not.toContain('Sayfa ')
      expect(page.photoCta).not.toContain('/32')
    }

    expect(PAGES_FLOW[0].photoCta).toBe('Pasaport Kapağını Fotoğraflayın →')
    expect(PAGES_FLOW[1].photoCta).toBe('Sahip Bilgilerini Fotoğraflayın →')
    expect(PAGES_FLOW[2].photoCta).toBe('Hayvan Bilgilerini Fotoğraflayın →')
    expect(PAGES_FLOW[3].photoCta).toBe('Kimlik & Çip Sayfasını Fotoğraflayın →')
    expect(PAGES_FLOW[4].photoCta).toBe('Yetkili Veteriner Sayfasını Fotoğraflayın →')
  })

  // C. Page reference mapping test
  it('C. Page reference mapping test: renders correct PII-free schematic visual for each page type', () => {
    const testDiv = document.createElement('div')
    const testRoot = createRoot(testDiv)

    for (const page of PAGES_FLOW) {
      act(() => {
        testRoot.render(<PassportPageReference pageType={page.type} />)
      })
      const refEl = testDiv.querySelector(`[data-testid="passport-reference-${page.type}"]`)
      expect(refEl).not.toBeNull()
      expect(testDiv.innerHTML).toContain('T.C. Pasaport Mizanpajı')
      expect(testDiv.innerHTML).toContain(page.passportPageDisplay)
    }

    act(() => {
      testRoot.unmount()
    })
  })

  // D. OCR failure state test
  it('D. OCR failure state test: renders error card with both retry and manual action buttons', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: 'Görüntü net okunamadı. Işık yansıması veya bulanıklık olabilir.',
      }),
    }) as any

    global.createImageBitmap = vi.fn().mockResolvedValue({
      width: 800,
      height: 600,
      close: vi.fn(),
    }) as any

    const origFileReader = global.FileReader
    global.FileReader = class {
      result: string = 'data:image/jpeg;base64,mockbase64'
      onload: any = null
      onerror: any = null
      readAsDataURL() {
        if (this.onload) {
          this.onload({ target: this })
        }
      }
    } as any

    act(() => {
      root.render(<PassportScanner />)
    })

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).not.toBeNull()

    const file = new File(['fake-image-bits'], 'passport.jpg', { type: 'image/jpeg' })
    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: true,
      })
      fileInput.dispatchEvent(new Event('change', { bubbles: true }))
    })

    const errorCard = container.querySelector('[data-testid="smart-scan-error-card"]')
    expect(errorCard).not.toBeNull()
    expect(errorCard?.textContent).toContain('Bu sayfadaki bilgiler otomatik okunamadı.')

    const retryBtn = container.querySelector('[data-testid="retry-photo-btn"]')
    const manualBtn = container.querySelector('[data-testid="manual-fallback-btn"]')
    expect(retryBtn).not.toBeNull()
    expect(manualBtn).not.toBeNull()

    global.FileReader = origFileReader
  })

  // E, F, O. Manual fallback navigation, context preservation, and NO /owner/pets/add
  it('E, F, O. Clicking "Manuel Devam Et" stays on the current page, preserves context, and NEVER calls /owner/pets/add', () => {
    act(() => {
      root.render(<PassportScanner />)
    })

    const headerManualBtn = container.querySelector('[data-testid="header-manual-btn"]') as HTMLButtonElement
    expect(headerManualBtn).not.toBeNull()

    act(() => {
      headerManualBtn.click()
    })

    const coverForm = container.querySelector('[data-testid="manual-form-cover"]')
    expect(coverForm).not.toBeNull()
    expect(coverForm?.textContent).toContain('Pasaport Kapağı — Bilgileri Manuel Girin')

    // CRITICAL: Must NEVER navigate away to /owner/pets/add
    expect(mockPush).not.toHaveBeenCalledWith('/owner/pets/add')
    expect(mockPush).not.toHaveBeenCalled()
  })

  // G, H, I, J, K, L, M, N. End-to-end manual data persistence, next transitions, summary & commit payload
  it('G to N. Complete 5-step manual entry flow correctly persists owner, pet, vet and tattoo fields to summary and commit', async () => {
    act(() => {
      root.render(<PassportScanner />)
    })

    // ── STEP 1: COVER ──
    act(() => {
      ;(container.querySelector('[data-testid="header-manual-btn"]') as HTMLButtonElement).click()
    })
    const passportInput = container.querySelector('[data-testid="input-passport-no"]') as HTMLInputElement
    const coverMicrochipInput = container.querySelector('[data-testid="input-cover-microchip"]') as HTMLInputElement

    act(() => {
      changeInput(passportInput, 'TR-34-123456')
      changeInput(coverMicrochipInput, '900123456789012')
    })

    // Submit Step 1 -> Advance to Step 2
    act(() => {
      ;(container.querySelector('[data-testid="save-manual-entry-btn"]') as HTMLButtonElement).click()
    })

    // ── STEP 2: OWNER (Page 4) ──
    expect(container.textContent).toContain('Bölüm I — Sahibine Ait Bilgiler')
    act(() => {
      ;(container.querySelector('[data-testid="header-manual-btn"]') as HTMLButtonElement).click()
    })
    const ownerFirstInput = container.querySelector('[data-testid="input-owner-first-name"]') as HTMLInputElement
    const ownerLastInput = container.querySelector('[data-testid="input-owner-last-name"]') as HTMLInputElement
    const ownerPhoneInput = container.querySelector('[data-testid="input-owner-phone"]') as HTMLInputElement
    const ownerCityInput = container.querySelector('[data-testid="input-owner-city"]') as HTMLInputElement
    const ownerDistrictInput = container.querySelector('[data-testid="input-owner-district"]') as HTMLInputElement
    const ownerAddressInput = container.querySelector('[data-testid="input-owner-address"]') as HTMLInputElement
    const ownerPostalInput = container.querySelector('[data-testid="input-owner-postal-code"]') as HTMLInputElement

    act(() => {
      changeInput(ownerFirstInput, 'Tufan')
      changeInput(ownerLastInput, 'Tabak')
      changeInput(ownerPhoneInput, '+905321112233')
      changeInput(ownerCityInput, 'İstanbul')
      changeInput(ownerDistrictInput, 'Kadıköy')
      changeInput(ownerAddressInput, 'Moda Cad. No: 12')
      changeInput(ownerPostalInput, '34710')
    })

    // Submit Step 2 -> Advance to Step 3
    act(() => {
      ;(container.querySelector('[data-testid="save-manual-entry-btn"]') as HTMLButtonElement).click()
    })

    // ── STEP 3: PET (Page 5) ──
    expect(container.textContent).toContain('Bölüm II — Hayvana Ait Bilgiler')
    act(() => {
      ;(container.querySelector('[data-testid="header-manual-btn"]') as HTMLButtonElement).click()
    })
    const petNameInput = container.querySelector('[data-testid="input-pet-name"]') as HTMLInputElement
    const petBreedInput = container.querySelector('[data-testid="input-pet-breed"]') as HTMLInputElement
    const petBirthInput = container.querySelector('[data-testid="input-pet-birth-date"]') as HTMLInputElement
    const petColorInput = container.querySelector('[data-testid="input-pet-color"]') as HTMLInputElement
    const speciesCatBtn = container.querySelector('[data-testid="species-toggle-cat"]') as HTMLButtonElement
    const genderMaleBtn = container.querySelector('[data-testid="gender-toggle-male"]') as HTMLButtonElement

    act(() => {
      changeInput(petNameInput, 'Duman')
      speciesCatBtn.click()
      changeInput(petBreedInput, 'British Shorthair')
      genderMaleBtn.click()
      changeInput(petBirthInput, '2023-05-15')
      changeInput(petColorInput, 'Gri')
    })

    // Submit Step 3 -> Advance to Step 4
    act(() => {
      ;(container.querySelector('[data-testid="save-manual-entry-btn"]') as HTMLButtonElement).click()
    })

    // ── STEP 4: CHIP & IDENTITY (Page 6) ──
    expect(container.textContent).toContain('Bölüm III — Hayvanın Kimlik Bilgileri')
    act(() => {
      ;(container.querySelector('[data-testid="header-manual-btn"]') as HTMLButtonElement).click()
    })
    const chipMicrochipInput = container.querySelector('[data-testid="input-chip-microchip"]') as HTMLInputElement
    const chipTattooInput = container.querySelector('[data-testid="input-chip-tattoo"]') as HTMLInputElement
    const chipImplantDateInput = container.querySelector('[data-testid="input-chip-implant-date"]') as HTMLInputElement
    const chipImplantLocInput = container.querySelector('[data-testid="input-chip-implant-location"]') as HTMLInputElement

    act(() => {
      changeInput(chipMicrochipInput, '900123456789012')
      changeInput(chipTattooInput, 'TAT-9988')
      changeInput(chipImplantDateInput, '2023-08-10')
      changeInput(chipImplantLocInput, 'Sol boyun')
    })

    // Submit Step 4 -> Advance to Step 5
    act(() => {
      ;(container.querySelector('[data-testid="save-manual-entry-btn"]') as HTMLButtonElement).click()
    })

    // ── STEP 5: VETERINARIAN (Page 7) ──
    expect(container.textContent).toContain('Bölüm IV — Pasaportu Düzenleyen Yetkili')
    act(() => {
      ;(container.querySelector('[data-testid="header-manual-btn"]') as HTMLButtonElement).click()
    })
    const vetNameInput = container.querySelector('[data-testid="input-vet-name"]') as HTMLInputElement
    const vetClinicInput = container.querySelector('[data-testid="input-vet-clinic"]') as HTMLInputElement
    const vetPhoneInput = container.querySelector('[data-testid="input-vet-phone"]') as HTMLInputElement
    const vetEmailInput = container.querySelector('[data-testid="input-vet-email"]') as HTMLInputElement
    const vetCityInput = container.querySelector('[data-testid="input-vet-city"]') as HTMLInputElement
    const vetDistrictInput = container.querySelector('[data-testid="input-vet-district"]') as HTMLInputElement

    act(() => {
      changeInput(vetNameInput, 'Dr. Ahmet Yılmaz')
      changeInput(vetClinicInput, 'Kadıköy Veteriner Kliniği')
      changeInput(vetPhoneInput, '+902161234567')
      changeInput(vetEmailInput, 'vet@kadikoyvet.com')
      changeInput(vetCityInput, 'İstanbul')
      changeInput(vetDistrictInput, 'Kadıköy')
    })

    // Submit Step 5 -> Advances directly to Summary View
    act(() => {
      ;(container.querySelector('[data-testid="save-manual-entry-btn"]') as HTMLButtonElement).click()
    })

    // ── VERIFY SUMMARY VIEW ──
    const summaryView = container.querySelector('[data-testid="smart-scan-summary-view"]')
    expect(summaryView).not.toBeNull()

    // Section 1: Pet Fields
    expect(summaryView?.textContent).toContain('Duman')
    expect(summaryView?.textContent).toContain('British Shorthair')
    expect(summaryView?.textContent).toContain('Kedi')
    expect(summaryView?.textContent).toContain('Erkek')
    expect(summaryView?.textContent).toContain('2023-05-15')
    expect(summaryView?.textContent).toContain('Gri')
    expect(summaryView?.textContent).toContain('900123456789012')
    expect(summaryView?.textContent).toContain('TAT-9988')
    expect(summaryView?.textContent).toContain('TR-34-123456')

    // Section 2: Owner Fields
    expect(summaryView?.textContent).toContain('Tufan Tabak')
    expect(summaryView?.textContent).toContain('+905321112233')
    expect(summaryView?.textContent).toContain('İstanbul / Kadıköy')
    expect(summaryView?.textContent).toContain('Moda Cad. No: 12')
    expect(summaryView?.textContent).toContain('34710')

    // Section 3: Vet Fields
    expect(summaryView?.textContent).toContain('Dr. Ahmet Yılmaz')
    expect(summaryView?.textContent).toContain('Kadıköy Veteriner Kliniği')
    expect(summaryView?.textContent).toContain('+902161234567')
    expect(summaryView?.textContent).toContain('vet@kadikoyvet.com')

    // ── VERIFY COMMIT PAYLOAD ──
    let commitPayload: any = null
    global.fetch = vi.fn().mockImplementation((url, opts) => {
      if (url === '/api/smart-scan/commit') {
        commitPayload = JSON.parse(opts.body)
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, petId: 'test-pet-id-123' }),
        })
      }
      return Promise.reject(new Error('Unknown url'))
    }) as any

    const commitBtn = container.querySelector('[data-testid="commit-btn"]') as HTMLButtonElement
    expect(commitBtn).not.toBeNull()

    await act(async () => {
      commitBtn.click()
    })

    expect(commitPayload).not.toBeNull()
    expect(commitPayload.petPayload.name).toBe('Duman')
    expect(commitPayload.petPayload.species).toBe('cat')
    expect(commitPayload.petPayload.breed).toBe('British Shorthair')
    expect(commitPayload.petPayload.gender).toBe('male')
    expect(commitPayload.petPayload.birth_date).toBe('2023-05-15')
    expect(commitPayload.petPayload.color).toBe('Gri')
    expect(commitPayload.petPayload.microchip_no).toBe('900123456789012')
    expect(commitPayload.petPayload.passport_no).toBe('TR-34-123456')
    expect(commitPayload.petPayload.tattoo_no).toBe('TAT-9988')
    expect(commitPayload.petPayload.vet_name).toBe('Dr. Ahmet Yılmaz')
    expect(commitPayload.petPayload.vet_company).toBe('Kadıköy Veteriner Kliniği')
    expect(commitPayload.petPayload.vet_phone).toBe('+902161234567')
    expect(commitPayload.petPayload.vet_email).toBe('vet@kadikoyvet.com')
    expect(commitPayload.petPayload.registration_city).toBe('İstanbul')
    expect(commitPayload.petPayload.registration_district).toBe('Kadıköy')

    expect(commitPayload.ownerPayload.first_name).toBe('Tufan')
    expect(commitPayload.ownerPayload.last_name).toBe('Tabak')
    expect(commitPayload.ownerPayload.phone).toBe('+905321112233')
    expect(commitPayload.ownerPayload.city).toBe('İstanbul')
    expect(commitPayload.ownerPayload.district).toBe('Kadıköy')
    expect(commitPayload.ownerPayload.neighborhood).toBe('Moda Cad. No: 12')
    expect(commitPayload.ownerPayload.postal_code).toBe('34710')

    // Successfully navigated to created pet page
    expect(mockPush).toHaveBeenCalledWith('/owner/pets/test-pet-id-123')
  })

  // ÖZEL REGRESYON TESTİ:
  // OCR failure on Page 5 -> Manual = YES -> Must render Page 5 manual form -> Must NOT render species selection
  it('REGRESSION: OCR failure on Page 5 -> Manual = YES -> Renders Page 5 form and NEVER renders generic species selection', () => {
    act(() => {
      root.render(<PassportScanner />)
    })

    // Advance to Step 3 (Page 5) using skip
    act(() => {
      ;(container.querySelector('[data-testid="skip-page-btn"]') as HTMLButtonElement).click()
    })
    act(() => {
      ;(container.querySelector('[data-testid="skip-page-btn"]') as HTMLButtonElement).click()
    })

    expect(container.textContent).toContain('Bölüm II — Hayvana Ait Bilgiler')

    // Trigger manual entry on Page 5
    act(() => {
      ;(container.querySelector('[data-testid="header-manual-btn"]') as HTMLButtonElement).click()
    })

    const page5Form = container.querySelector('[data-testid="manual-form-page_5"]')
    expect(page5Form).not.toBeNull()
    expect(page5Form?.textContent).toContain('Sayfa 5/32 — Hayvana Ait Bilgileri Manuel Girin')
    expect(container.querySelector('[data-testid="input-pet-name"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="species-toggle-cat"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="species-toggle-dog"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="input-pet-breed"]')).not.toBeNull()

    // Must NOT render generic pet creation species screen ("Can Dostun Kim?")
    expect(container.textContent).not.toContain('Can Dostun Kim?')
    expect(container.textContent).not.toContain('Kişiselleştirilmiş sağlık ve bakım takvimi için önce tür seçin')
    expect(mockPush).not.toHaveBeenCalledWith('/owner/pets/add')
  })

  it('REGRESSION: Manual entry on Page 4 renders Page 4 form without species selection', () => {
    act(() => {
      root.render(<PassportScanner />)
    })
    // Advance to Step 2 (Page 4)
    act(() => {
      ;(container.querySelector('[data-testid="skip-page-btn"]') as HTMLButtonElement).click()
    })
    act(() => {
      ;(container.querySelector('[data-testid="header-manual-btn"]') as HTMLButtonElement).click()
    })

    expect(container.querySelector('[data-testid="manual-form-page_4"]')).not.toBeNull()
    expect(container.textContent).not.toContain('Can Dostun Kim?')
    expect(mockPush).not.toHaveBeenCalledWith('/owner/pets/add')
  })

  it('REGRESSION: Manual entry on Page 6 renders Page 6 form without species selection', () => {
    act(() => {
      root.render(<PassportScanner />)
    })
    // Advance to Step 4 (Page 6)
    act(() => {
      ;(container.querySelector('[data-testid="skip-page-btn"]') as HTMLButtonElement).click()
    })
    act(() => {
      ;(container.querySelector('[data-testid="skip-page-btn"]') as HTMLButtonElement).click()
    })
    act(() => {
      ;(container.querySelector('[data-testid="skip-page-btn"]') as HTMLButtonElement).click()
    })
    act(() => {
      ;(container.querySelector('[data-testid="header-manual-btn"]') as HTMLButtonElement).click()
    })

    expect(container.querySelector('[data-testid="manual-form-page_6"]')).not.toBeNull()
    expect(container.textContent).not.toContain('Can Dostun Kim?')
    expect(mockPush).not.toHaveBeenCalledWith('/owner/pets/add')
  })

  it('REGRESSION: Manual entry on Page 7 renders Page 7 form without species selection', () => {
    act(() => {
      root.render(<PassportScanner />)
    })
    // Advance to Step 5 (Page 7)
    act(() => {
      ;(container.querySelector('[data-testid="skip-page-btn"]') as HTMLButtonElement).click()
    })
    act(() => {
      ;(container.querySelector('[data-testid="skip-page-btn"]') as HTMLButtonElement).click()
    })
    act(() => {
      ;(container.querySelector('[data-testid="skip-page-btn"]') as HTMLButtonElement).click()
    })
    act(() => {
      ;(container.querySelector('[data-testid="skip-page-btn"]') as HTMLButtonElement).click()
    })
    act(() => {
      ;(container.querySelector('[data-testid="header-manual-btn"]') as HTMLButtonElement).click()
    })

    expect(container.querySelector('[data-testid="manual-form-page_7"]')).not.toBeNull()
    expect(container.textContent).not.toContain('Can Dostun Kim?')
    expect(mockPush).not.toHaveBeenCalledWith('/owner/pets/add')
  })

  // P1. Microchip Prefill Test
  it('P1. Microchip Prefill: prefills Page 6 manual form with microchip from Page 1 cover', () => {
    act(() => {
      root.render(<PassportScanner />)
    })

    // Step 1: Open manual form for cover
    act(() => {
      ;(container.querySelector('[data-testid="header-manual-btn"]') as HTMLButtonElement).click()
    })

    const coverMicrochipInput = container.querySelector('[data-testid="input-cover-microchip"]') as HTMLInputElement
    act(() => {
      changeInput(coverMicrochipInput, '900123456789012')
    })

    // Save Step 1 -> advances to Step 2 (Page 4)
    act(() => {
      ;(container.querySelector('[data-testid="save-manual-entry-btn"]') as HTMLButtonElement).click()
    })

    // Skip Step 2 -> advances to Step 3 (Page 5)
    act(() => {
      ;(container.querySelector('[data-testid="skip-page-btn"]') as HTMLButtonElement).click()
    })

    // Skip Step 3 -> advances to Step 4 (Page 6)
    act(() => {
      ;(container.querySelector('[data-testid="skip-page-btn"]') as HTMLButtonElement).click()
    })

    expect(container.textContent).toContain('Bölüm III — Hayvanın Kimlik Bilgileri')

    // Open manual form for Page 6
    act(() => {
      ;(container.querySelector('[data-testid="header-manual-btn"]') as HTMLButtonElement).click()
    })

    const chipInput = container.querySelector('[data-testid="input-chip-microchip"]') as HTMLInputElement
    expect(chipInput).not.toBeNull()
    expect(chipInput.value).toBe('900123456789012')
  })

  // P1. Color Quick-Select Chips Test
  it('P1. Color Quick-Select: renders 7 color chips and updates color input on click', () => {
    act(() => {
      root.render(<PassportScanner />)
    })

    // Advance to Step 3 (Page 5 - Pet)
    act(() => {
      ;(container.querySelector('[data-testid="skip-page-btn"]') as HTMLButtonElement).click()
    })
    act(() => {
      ;(container.querySelector('[data-testid="skip-page-btn"]') as HTMLButtonElement).click()
    })

    // Open Page 5 manual form
    act(() => {
      ;(container.querySelector('[data-testid="header-manual-btn"]') as HTMLButtonElement).click()
    })

    // Verify all 7 chips exist
    expect(QUICK_COLORS).toHaveLength(7)
    const chipSari = container.querySelector('[data-testid="color-chip-sari-sarman"]') as HTMLButtonElement
    const chipBeyaz = container.querySelector('[data-testid="color-chip-beyaz"]') as HTMLButtonElement
    const chipTekir = container.querySelector('[data-testid="color-chip-tekir"]') as HTMLButtonElement
    expect(chipSari).not.toBeNull()
    expect(chipBeyaz).not.toBeNull()
    expect(chipTekir).not.toBeNull()

    const colorInput = container.querySelector('[data-testid="input-pet-color"]') as HTMLInputElement
    expect(colorInput.value).toBe('')

    // Click Sarman chip
    act(() => {
      chipSari.click()
    })
    expect(colorInput.value).toBe('Sarı / Sarman')

    // Click Tekir chip
    act(() => {
      chipTekir.click()
    })
    expect(colorInput.value).toBe('Tekir')
  })

  // P1. Summary Direct Edit Navigation Test
  it('P1. Summary Direct Edit: allows editing Pet, Owner, and Vet directly from summary view and returns immediately', () => {
    act(() => {
      root.render(<PassportScanner />)
    })

    // Skip all 5 steps to reach Summary View
    for (let i = 0; i < 5; i++) {
      act(() => {
        ;(container.querySelector('[data-testid="skip-page-btn"]') as HTMLButtonElement).click()
      })
    }

    expect(container.querySelector('[data-testid="smart-scan-summary-view"]')).not.toBeNull()

    // Verify commit CTA label
    const commitBtn = container.querySelector('[data-testid="commit-btn"]') as HTMLButtonElement
    expect(commitBtn).not.toBeNull()
    expect(commitBtn.textContent).toContain('Bilgileri Onayla ve Devam Et →')

    // Verify all 3 direct edit buttons exist
    const editPetBtn = container.querySelector('[data-testid="edit-pet-summary-btn"]') as HTMLButtonElement
    const editOwnerBtn = container.querySelector('[data-testid="edit-owner-summary-btn"]') as HTMLButtonElement
    const editVetBtn = container.querySelector('[data-testid="edit-vet-summary-btn"]') as HTMLButtonElement
    expect(editPetBtn).not.toBeNull()
    expect(editOwnerBtn).not.toBeNull()
    expect(editVetBtn).not.toBeNull()

    // 1. Direct Edit Pet -> jumps to Page 5
    act(() => {
      editPetBtn.click()
    })
    expect(container.querySelector('[data-testid="manual-form-page_5"]')).not.toBeNull()
    expect(container.textContent).toContain('Değişiklikleri Kaydet ve Özete Dön')

    // Save -> returns immediately to Summary View
    act(() => {
      ;(container.querySelector('[data-testid="save-manual-entry-btn"]') as HTMLButtonElement).click()
    })
    expect(container.querySelector('[data-testid="smart-scan-summary-view"]')).not.toBeNull()

    // 2. Direct Edit Owner -> jumps to Page 4 and Cancel returns to Summary
    act(() => {
      ;(container.querySelector('[data-testid="edit-owner-summary-btn"]') as HTMLButtonElement).click()
    })
    expect(container.querySelector('[data-testid="manual-form-page_4"]')).not.toBeNull()
    expect(container.textContent).toContain('Özete Geri Dön')

    act(() => {
      ;(container.querySelector('[data-testid="cancel-manual-entry-btn"]') as HTMLButtonElement).click()
    })
    expect(container.querySelector('[data-testid="smart-scan-summary-view"]')).not.toBeNull()
  })

  // P0. Image Optimization Safety Test
  it('P0. Image Optimization: optimizeImageForOcr handles fallback safely in non-browser/test environments', async () => {
    const origFileReader = global.FileReader
    global.FileReader = class {
      result: string = 'data:image/jpeg;base64,optimizedfallback'
      onload: any = null
      onerror: any = null
      readAsDataURL() {
        if (this.onload) {
          this.onload({ target: this })
        }
      }
    } as any

    const testFile = new File(['test-bytes'], 'passport.jpg', { type: 'image/jpeg' })
    const res = await optimizeImageForOcr(testFile)

    expect(res).toBeDefined()
    expect(res.base64).toContain('data:image/jpeg;base64')

    global.FileReader = origFileReader
  })
})
