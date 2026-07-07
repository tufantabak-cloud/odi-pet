import { devices } from '@playwright/test'

export type TechLevel = 'low' | 'low_mid' | 'mid' | 'high' | 'very_high'

export interface Persona {
  id: string
  name: string
  age: number
  email: string
  techLevel: TechLevel
  device: (typeof devices)[keyof typeof devices]
  deviceLabel: string
  // Teknoloji seviyesi davranışa çevrilir: düşük seviye = yavaş etkileşim,
  // daha uzun okuma süresi, daha yüksek yanlış tıklama toleransı
  actionDelayMs: number
  readingPauseMs: number
  // Bu persona hangi modüllerde ekstra dikkatli/detaylı test yapar
  focusModules: string[]
}

export const TEST_PASSWORD = 'OdiPetTest123!'

// Teknoloji seviyesi -> etkileşim hızı eşlemesi
// low: her aksiyondan önce 2.5sn duraksama (ekranı anlamaya çalışıyor)
// very_high: 300ms (arayüzü taramadan hızla ilerliyor — bu da ayrı bir hata sınıfı yakalar)
const DELAY_BY_TECH: Record<TechLevel, { action: number; reading: number }> = {
  low: { action: 2500, reading: 4000 },
  low_mid: { action: 1800, reading: 3000 },
  mid: { action: 1200, reading: 2000 },
  high: { action: 600, reading: 1000 },
  very_high: { action: 300, reading: 500 },
}

function buildPersona(
  p: Omit<Persona, 'actionDelayMs' | 'readingPauseMs' | 'email'>
): Persona {
  const delays = DELAY_BY_TECH[p.techLevel]
  return {
    ...p,
    email: `ux_${p.id}_${p.age}@test.odipet.local`,
    actionDelayMs: delays.action,
    readingPauseMs: delays.reading,
  }
}

export const PERSONAS: Persona[] = [
  buildPersona({
    id: 'ece', name: 'Ece', age: 18, techLevel: 'very_high',
    device: devices['iPhone 14'], deviceLabel: 'iPhone 14',
    focusModules: ['registration', 'pet_registration', 'services'],
  }),
  buildPersona({
    id: 'mert', name: 'Mert', age: 24, techLevel: 'mid',
    device: devices['Pixel 7'], deviceLabel: 'Pixel 7',
    focusModules: ['pet_registration', 'next_step', 'vaccine'],
  }),
  buildPersona({
    id: 'selin', name: 'Selin', age: 31, techLevel: 'high',
    device: devices['iPhone 14 Pro'], deviceLabel: 'iPhone 14 Pro',
    focusModules: ['vaccine', 'parasite', 'next_step'],
  }),
  buildPersona({
    id: 'burak', name: 'Burak', age: 38, techLevel: 'mid',
    device: devices['Galaxy S9+'], deviceLabel: 'Galaxy S9+',
    focusModules: ['pet_registration', 'vaccine', 'health_card'],
  }),
  buildPersona({
    id: 'ayse', name: 'Ayşe', age: 45, techLevel: 'low_mid',
    device: devices['Galaxy S9+'], deviceLabel: 'Galaxy S9+',
    focusModules: ['registration', 'pet_registration', 'nutrition'],
  }),
  buildPersona({
    id: 'deniz', name: 'Deniz', age: 52, techLevel: 'mid',
    device: devices['iPhone 13'], deviceLabel: 'iPhone 13',
    focusModules: ['vaccine', 'health_card', 'parasite'],
  }),
  buildPersona({
    id: 'kerem', name: 'Kerem', age: 29, techLevel: 'high',
    device: devices['Pixel 7'], deviceLabel: 'Pixel 7',
    focusModules: ['budget'],
  }),
  buildPersona({
    id: 'hulya', name: 'Hülya', age: 63, techLevel: 'low',
    device: devices['Galaxy S8'], deviceLabel: 'Galaxy S8 (küçük ekran)',
    focusModules: ['registration', 'pet_registration', 'vaccine'],
  }),
  buildPersona({
    id: 'can', name: 'Can', age: 34, techLevel: 'high',
    device: devices['iPhone 14'], deviceLabel: 'iPhone 14',
    focusModules: ['services'],
  }),
  buildPersona({
    id: 'nazli', name: 'Nazlı', age: 27, techLevel: 'high',
    device: devices['Pixel 5'], deviceLabel: 'Pixel 5',
    focusModules: ['registration', 'services'],
  }),
]
