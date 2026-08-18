import { describe, it, expect } from 'vitest'
import { evaluateWeatherScenario } from '@/lib/weatherScenarios'

describe('evaluateWeatherScenario - 5 Dog Smart Scenarios', () => {
  it('Scenario 1: Ideal Walk Day (Sunny, 20°C, Low UV)', () => {
    const res = evaluateWeatherScenario({
      species: 'kopek',
      petName: 'Max',
      temp: 20,
      humidity: 50,
      uvIndex: 2,
      weatherCode: 0,
      isDay: true,
      cityName: 'İstanbul',
    })

    expect(res.species).toBe('dog')
    expect(res.scenarioId).toBe('dog_ideal_walk')
    expect(res.categoryTitle).toBe('HAVA VE AKTİVİTE')
    expect(res.headline).toContain('yürüyüş için harika bir gün')
    expect(res.illustrationType).toBe('dog_walk')
    expect(res.metric1.label).toContain('UV 2')
    expect(res.metric2.label).toContain('Nem %50')
  })

  it('Scenario 2: Hot Weather & Hot Asphalt Warning (32°C, Daytime)', () => {
    const res = evaluateWeatherScenario({
      species: 'Köpek',
      petName: 'Duman',
      temp: 32,
      humidity: 45,
      uvIndex: 7,
      weatherCode: 0,
      isDay: true,
      cityName: 'Antalya',
      asphaltTemp: 48,
    })

    expect(res.species).toBe('dog')
    expect(res.scenarioId).toBe('dog_hot_asphalt')
    expect(res.categoryTitle).toBe('PATİ VE ASFALT GÜVENLİĞİ')
    expect(res.headline).toContain('Asfalt çok sıcak')
    expect(res.metric1.statusText).toBe('Çok Sıcak')
  })

  it('Scenario 3: Warm / Shaded Route Caution (26°C, High UV 6)', () => {
    const res = evaluateWeatherScenario({
      species: 'kopek',
      petName: 'Pamuk',
      temp: 26,
      humidity: 55,
      uvIndex: 6,
      weatherCode: 1,
      isDay: true,
      cityName: 'İzmir',
      asphaltTemp: 38,
    })

    expect(res.species).toBe('dog')
    expect(res.scenarioId).toBe('dog_warm_caution')
    expect(res.categoryTitle).toBe('GÜNEŞ VE GÖLGE ROTASI')
    expect(res.headline).toContain('gölgeli rotaları tercih edin')
  })

  it('Scenario 4: Rainy / Storm Weather Paw Care (Rain code 61)', () => {
    const res = evaluateWeatherScenario({
      species: 'kopek',
      petName: 'Çakıl',
      temp: 18,
      humidity: 85,
      uvIndex: 1,
      weatherCode: 61, // Rain
      isDay: true,
      cityName: 'Trabzon',
    })

    expect(res.species).toBe('dog')
    expect(res.scenarioId).toBe('dog_rainy_weather')
    expect(res.categoryTitle).toBe('YAĞIŞ VE PATİ KORUMASI')
    expect(res.headline).toContain('Dışarısı yağışlı')
    expect(res.metric1.statusText).toBe('Islak Zemin')
  })

  it('Scenario 5: Night / Cool Evening Walk (Night time)', () => {
    const res = evaluateWeatherScenario({
      species: 'kopek',
      petName: 'Leo',
      temp: 21,
      feelsLike: 20,
      humidity: 60,
      uvIndex: 0,
      weatherCode: 0,
      isDay: false, // Night
      cityName: 'Ankara',
    })

    expect(res.species).toBe('dog')
    expect(res.scenarioId).toBe('dog_night_cool')
    expect(res.categoryTitle).toBe('AKŞAM YÜRÜYÜŞ ZAMANI')
    expect(res.headline).toContain('Akşam serinliği başladı')
    expect(res.metric2.value).toBe('Soğuk')
  })
})

describe('evaluateWeatherScenario - 5 Cat Smart Scenarios', () => {
  it('Scenario 1: Hot Weather & Hydration / Water Intake (28°C)', () => {
    const res = evaluateWeatherScenario({
      species: 'kedi',
      petName: 'Luna',
      temp: 28,
      humidity: 50,
      uvIndex: 6,
      weatherCode: 0,
      isDay: true,
      cityName: 'İstanbul',
    })

    expect(res.species).toBe('cat')
    expect(res.scenarioId).toBe('cat_heat_hydration')
    expect(res.categoryTitle).toBe('EV ORTAMI VE HİDRASYON')
    expect(res.headline).toContain("Luna'in su tüketimini destekleyin")
    expect(res.illustrationType).toBe('cat_indoor')
    expect(res.metric2.label).toBe('Sıvı Desteği')
  })

  it('Scenario 2: Pleasant Weather & Window / Balcony Safety (22°C, Spring)', () => {
    const res = evaluateWeatherScenario({
      species: 'Kedi',
      petName: 'Milo',
      temp: 22,
      humidity: 55,
      uvIndex: 4,
      weatherCode: 1,
      isDay: true,
      cityName: 'Bursa',
      currentMonth: 6, // July (not shedding season)
    })

    expect(res.species).toBe('cat')
    expect(res.scenarioId).toBe('cat_window_safety')
    expect(res.categoryTitle).toBe('HAVALANDIRMA VE GÜVENLİK')
    expect(res.headline).toContain('sineklik ve balkon ağını kontrol edin')
  })

  it('Scenario 3: Indoor Hunting & Play Routine (Default mild indoor)', () => {
    const res = evaluateWeatherScenario({
      species: 'cat',
      petName: 'Şila',
      temp: 20,
      humidity: 50,
      uvIndex: 2,
      weatherCode: 0,
      isDay: false, // night or normal
      cityName: 'Eskişehir',
      currentMonth: 6,
    })

    expect(res.species).toBe('cat')
    expect(res.scenarioId).toBe('cat_indoor_play')
    expect(res.categoryTitle).toBe('GÜNÜN OYUN VE AKTİVİTESİ')
    expect(res.headline).toContain('10 dakikalık avcılık oyunu oynayın')
  })

  it('Scenario 4: Dry Indoor Air & Fur Health (Humidity 32%)', () => {
    const res = evaluateWeatherScenario({
      species: 'kedi',
      petName: 'Badem',
      temp: 14,
      humidity: 32, // Low humidity
      uvIndex: 1,
      weatherCode: 3,
      isDay: true,
      cityName: 'Konya',
    })

    expect(res.species).toBe('cat')
    expect(res.scenarioId).toBe('cat_dry_air_care')
    expect(res.categoryTitle).toBe('NEM VE TÜY BAKIMI')
    expect(res.headline).toContain('Nem %32')
    expect(res.metric1.statusText).toBe('Kuru')
  })

  it('Scenario 5: Seasonal Shedding & Brushing Routine (Spring Month 3, April)', () => {
    const res = evaluateWeatherScenario({
      species: 'kedi',
      petName: 'Bella',
      temp: 20,
      humidity: 50,
      uvIndex: 3,
      weatherCode: 1,
      isDay: true,
      cityName: 'Antalya',
      currentMonth: 3, // April (Shedding season)
    })

    expect(res.species).toBe('cat')
    expect(res.scenarioId).toBe('cat_seasonal_shedding')
    expect(res.categoryTitle).toBe('TÜY DÖKÜMÜ VE TARAMA')
    expect(res.headline).toContain('5 dakikalık tarama tüy yumağını önler')
    expect(res.metric1.label).toBe('Tarama Rutini')
  })

  it('handles empty/unknown cityName gracefully without errors', () => {
    const res = evaluateWeatherScenario({
      species: 'kopek',
      petName: 'Rex',
      temp: 22,
      humidity: 50,
      uvIndex: 2,
      weatherCode: 0,
      isDay: true,
      cityName: '',
    })

    expect(res.species).toBe('dog')
    expect(res.headline).toBeDefined()
    expect(res.categoryTitle).toBe('HAVA VE AKTİVİTE')
  })
})
