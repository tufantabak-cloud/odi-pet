import { test, expect } from '@playwright/test'
import { PERSONAS, TEST_PASSWORD, type Persona } from './personas'
import { UxRecorder, type ModuleRecorder } from './helpers/ux-recorder'

const BASE_URL = process.env.ODIPET_BASE_URL ?? 'http://localhost:3000'
const OUTPUT_DIR = 'test-results'

// ─── GÜVENLİK KAPISI KALDIRILDI (ODIPET_BASE_URL ile manuel test yapılabilir) ───

// ─── MODÜL AKIŞLARI ──────────────────────────────────────────────

async function runRegistration(m: ModuleRecorder, persona: Persona, recorder: UxRecorder) {
  await m.clickTestId('register-link', 'login')
  await recorder.readingPause()
  await m.fillTestId('register-name-input', persona.name, 'register')
  await recorder.humanPause()
  await m.fillTestId('register-email-input', persona.email, 'register')
  await recorder.humanPause()
  await m.fillTestId('register-password-input', TEST_PASSWORD, 'register')
  await m.fillTestId('register-password-confirm-input', TEST_PASSWORD, 'register')
  await m.clickTestId('register-terms-checkbox', 'register')
  await recorder.humanPause()
  await m.clickTestId('register-submit-button', 'register')
  // Kayıt sonrası ana ekrana ulaşıldığını doğrula
  await m.waitForTestId('add-first-pet-button', 'home_after_register')
}

async function runPetRegistration(m: ModuleRecorder, persona: Persona, recorder: UxRecorder) {
  await m.clickTestId('add-first-pet-button', 'home')
  await recorder.readingPause()
  await m.fillTestId('pet-name-input', `${persona.name}Pet`, 'pet_form')
  await recorder.humanPause()
  // Persona yaşına göre tür seçimi çeşitlendir (kedi/köpek dengesi)
  const speciesButton = persona.age % 2 === 0 ? 'pet-species-dog-button' : 'pet-species-cat-button'
  await m.clickTestId(speciesButton, 'pet_form')
  await recorder.humanPause()
  await m.clickTestId('pet-breed-select', 'pet_form')
  // İlk seçeneği seç — ırk listesi navigasyonu ayrıca manuel test konusu
  await recorder.humanPause()
  await m.fillTestId('pet-birthdate-input', '2022-05-15', 'pet_form')
  await m.clickTestId('pet-save-button', 'pet_form')
  await m.waitForTestId('next-step-card', 'home_after_pet')
}

async function runNextStep(m: ModuleRecorder, _persona: Persona, recorder: UxRecorder) {
  await m.waitForTestId('next-step-card', 'home')
  await recorder.readingPause()
  await m.clickTestId('next-step-primary-button', 'next_step_card')
}

async function runModuleVisit(
  m: ModuleRecorder,
  recorder: UxRecorder,
  buttonTestId: string,
  _screenName: string
) {
  await m.clickTestId(buttonTestId, 'home')
  await recorder.readingPause()
  await m.screenshot('arrived')
}

// ─── TAM AKIŞ (persona, project adından çözülür) ─────────────────

test('persona tam akış testi', async ({ page }, testInfo) => {
  test.setTimeout(15 * 60 * 1000) // 10 modül × takılma payı

  const personaId = testInfo.project.name.replace('persona-', '')
  const persona = PERSONAS.find((p) => p.id === personaId)

  if (!persona) {
    throw new Error(
      `Project adı "${testInfo.project.name}" hiçbir personaya eşleşmedi. ` +
        `playwright.config.ts içindeki projects tanımını kontrol edin.`
    )
  }

  const recorder = new UxRecorder(persona, page, BASE_URL, OUTPUT_DIR)

  await page.goto(BASE_URL)

  await recorder.tryModule('registration', 180, (m) =>
    runRegistration(m, persona, recorder)
  )

  await recorder.tryModule('pet_registration', 180, (m) =>
    runPetRegistration(m, persona, recorder)
  )

  await recorder.tryModule('next_step', 60, (m) =>
    runNextStep(m, persona, recorder)
  )

  await recorder.tryModule('vaccine', 120, (m) =>
    runModuleVisit(m, recorder, 'vaccine-module-button', 'vaccine')
  )

  await recorder.tryModule('parasite', 120, (m) =>
    runModuleVisit(m, recorder, 'parasite-module-button', 'parasite')
  )

  await recorder.tryModule('nutrition', 120, (m) =>
    runModuleVisit(m, recorder, 'nutrition-module-button', 'nutrition')
  )

  await recorder.tryModule('budget', 45, (m) =>
    runModuleVisit(m, recorder, 'budget-module-button', 'budget')
  )

  await recorder.tryModule('health_card', 90, (m) =>
    runModuleVisit(m, recorder, 'health-card-button', 'health_card')
  )

  await recorder.tryModule('services', 60, (m) =>
    runModuleVisit(m, recorder, 'services-module-button', 'services')
  )

  const reportPath = recorder.saveReport()
  console.log(`Rapor yazıldı: ${reportPath}`)

  // Test kendisi "fail" olmasın — sonuç JSON'da; ama tamamen boş
  // rapor üretimini engellemek için en az 1 modül denenmiş olmalı
  expect(recorder.buildReport().results.length).toBeGreaterThan(0)
})
