import { expect, type Page } from '@playwright/test'
import { TEST_PASSWORD, type Persona } from '../personas'
import { UxRecorder, type ModuleRecorder } from './ux-recorder'

const BASE_URL = process.env.ODIPET_BASE_URL ?? process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3100'
const OUTPUT_DIR = 'test-results'

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

export async function runPersonaFlow(page: Page, persona: Persona) {
  const recorder = new UxRecorder(persona, page, BASE_URL, OUTPUT_DIR)

  await page.goto(BASE_URL)

  // 1. Kayıt Modülü (Onboarding State Üretici)
  await recorder.tryModule('registration', 180, (m) =>
    runRegistration(m, persona, recorder)
  )

  // 2. İlk Pet Kaydı (Onboarding State Üretici)
  await recorder.tryModule(
    'pet_registration',
    180,
    (m) => runPetRegistration(m, persona, recorder),
    { requiresOnboardingState: true }
  )

  // 3. Akıllı Sonraki Adım (Onboarding State Üretici)
  await recorder.tryModule(
    'next_step',
    60,
    (m) => runNextStep(m, persona, recorder),
    { requiresOnboardingState: true }
  )

  // 4. Aşı Modülü Denetimi
  await recorder.tryModule(
    'vaccine',
    120,
    (m) => runModuleVisit(m, recorder, 'vaccine-module-button', 'vaccine'),
    { requiresOnboardingState: true }
  )

  // 5. Parazit Modülü Denetimi
  await recorder.tryModule(
    'parasite',
    120,
    (m) => runModuleVisit(m, recorder, 'parasite-module-button', 'parasite'),
    { requiresOnboardingState: true }
  )

  // 6. Beslenme Modülü Denetimi
  await recorder.tryModule(
    'nutrition',
    120,
    (m) => runModuleVisit(m, recorder, 'nutrition-module-button', 'nutrition'),
    { requiresOnboardingState: true }
  )

  // 7. Bütçe Modülü Denetimi
  await recorder.tryModule(
    'budget',
    45,
    (m) => runModuleVisit(m, recorder, 'budget-module-button', 'budget'),
    { requiresOnboardingState: true }
  )

  // 8. Sağlık Karnesi Modülü Denetimi
  await recorder.tryModule(
    'health_card',
    90,
    (m) => runModuleVisit(m, recorder, 'health-card-button', 'health_card'),
    { requiresOnboardingState: true }
  )

  // 9. Hizmetler Modülü Denetimi
  await recorder.tryModule(
    'services',
    60,
    (m) => runModuleVisit(m, recorder, 'services-module-button', 'services'),
    { requiresOnboardingState: true }
  )

  const reportPath = recorder.saveReport()
  console.log(`Rapor yazıldı: ${reportPath}`)

  expect(recorder.buildReport().results.length).toBeGreaterThan(0)
}
