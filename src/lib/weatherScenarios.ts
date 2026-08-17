/**
 * Weather & Pet Activity / Environment Scenario Engine
 * Generates tailored, real-time smart scenarios for both Dog and Cat owners.
 */

export interface WeatherMetric {
  label: string
  value: string
  statusText: string
  color: 'emerald' | 'amber' | 'rose' | 'blue' | 'purple'
}

export interface WeatherScenarioResult {
  scenarioId: string
  species: 'dog' | 'cat'
  categoryTitle: string
  headline: string
  subtext: string
  metric1: WeatherMetric
  metric2: WeatherMetric
  ctaText: string
  modalTitle: string
  modalTips: Array<{
    title: string
    description: string
    tag: string
  }>
  illustrationType: 'dog_walk' | 'cat_indoor'
}

export interface ScenarioInput {
  species?: string
  petName?: string
  temp: number
  feelsLike?: number
  humidity: number
  uvIndex: number
  weatherCode: number
  isDay: boolean
  cityName: string
  sunset?: string
  sunrise?: string
  asphaltTemp?: number
  currentMonth?: number // 0-11 (for seasonal triggers)
}

export function evaluateWeatherScenario(input: ScenarioInput): WeatherScenarioResult {
  const speciesRaw = (input.species || '').toLowerCase()
  const isCat =
    speciesRaw === 'kedi' ||
    speciesRaw === 'cat' ||
    speciesRaw.includes('kedi') ||
    speciesRaw.includes('cat')

  const petName = input.petName || (isCat ? 'Kediniz' : 'Dostunuz')
  const temp = Math.round(input.temp)
  const humidity = Math.round(input.humidity)
  const uv = Math.round(input.uvIndex)
  const isDay = input.isDay
  const weatherCode = input.weatherCode
  const asphaltTemp = input.asphaltTemp ?? (!isDay ? temp + 2 : Math.round(temp * 1.5))
  const month = input.currentMonth ?? new Date().getMonth() // 0 to 11

  // Is it rainy / storm? (WMO codes 51-99)
  const isRainy = weatherCode >= 51 && weatherCode <= 99

  // ─────────────────────────────────────────────────────────────
  // 🐶 KÖPEK SENARYOLARI (5 Akıllı Senaryo)
  // ─────────────────────────────────────────────────────────────
  if (!isCat) {
    // Köpek Senaryo 2: Aşırı Sıcak & Sıcak Asfalt Uyarısı
    if (isDay && (temp >= 29 || asphaltTemp >= 42)) {
      return {
        scenarioId: 'dog_hot_asphalt',
        species: 'dog',
        categoryTitle: 'PATİ VE ASFALT GÜVENLİĞİ',
        headline: `Asfalt çok sıcak! Yürüyüşü akşam serinliğine bırakın ⚠️`,
        subtext: `Dışarısı ${temp}°C, asfalt sıcaklığı ~${asphaltTemp}°C civarında. Sıcak zemin patileri yakabilir; çim alanları tercih edin veya güneş batışını bekleyin.`,
        metric1: {
          label: 'Asfalt Sıcaklığı',
          value: `~${asphaltTemp}°C`,
          statusText: 'Çok Sıcak',
          color: 'rose',
        },
        metric2: {
          label: `UV ${uv}`,
          value: `${uv}`,
          statusText: uv >= 6 ? 'Yüksek' : 'Orta',
          color: uv >= 6 ? 'amber' : 'emerald',
        },
        ctaText: 'Pati Güvenlik İpuçları',
        modalTitle: 'Sıcak Hava ve Pati Güvenliği Raporu',
        modalTips: [
          {
            title: '7 Saniye Kuralı',
            description:
              'Elinizin tersini asfalta 7 saniye bastırın. Eliniz yanıyorsa köpeğinizin patileri de yanar.',
            tag: 'Önemli',
          },
          {
            title: 'Çim ve Toprak Rotalar',
            description:
              'Güneşin dik geldiği saatlerde sadece gölgeli çim alanlarda kısa tuvalet molaları verin.',
            tag: 'Tavsiye',
          },
          {
            title: 'Yanınızda Su Bulundurun',
            description:
              'Köpekler ter bezleri olmadığı için dilleriyle serinler; bol taze su içmesini sağlayın.',
            tag: 'Hidrasyon',
          },
        ],
        illustrationType: 'dog_walk',
      }
    }

    // Köpek Senaryo 4: Yağmurlu / Fırtınalı Hava Uyarısı
    if (isRainy) {
      return {
        scenarioId: 'dog_rainy_weather',
        species: 'dog',
        categoryTitle: 'YAĞIŞ VE PATİ KORUMASI',
        headline: `Dışarısı yağışlı, kısa ve tempolu yürüyüş önerilir 🌧️`,
        subtext: `Zemin ıslak ve kaygan. Yürüyüş sonrası ${petName}'in patilerini kurulamayı ve parmak aralarını kontrol etmeyi unutmayın.`,
        metric1: {
          label: 'Hava Durumu',
          value: 'Yağışlı',
          statusText: 'Islak Zemin',
          color: 'blue',
        },
        metric2: {
          label: `Nem %${humidity}`,
          value: `${humidity}`,
          statusText: 'Yüksek',
          color: 'blue',
        },
        ctaText: 'Yağmurlu Gün Bakımı',
        modalTitle: 'Yağmurlu Hava ve Pati Koruma Rehberi',
        modalTips: [
          {
            title: 'Pati Kurulama',
            description:
              'Islak kalan parmak aralarında mantar ve tahriş oluşmaması için yürüyüş sonrası havluyla iyice kurulayın.',
            tag: 'Hijyen',
          },
          {
            title: 'Kısa İhtiyaç Yürüyüşü',
            description:
              'Şiddetli yağışta yürüyüş süresini sadece temel ihtiyaçlarla sınırlı tutun.',
            tag: 'Rutin',
          },
          {
            title: 'Görünürlük',
            description:
              'Karanlık ve yağmurlu havalarda reflektörlü tasma veya yağmurluk kullanın.',
            tag: 'Güvenlik',
          },
        ],
        illustrationType: 'dog_walk',
      }
    }

    // Köpek Senaryo 5: Akşam & Gece Serinliği
    if (!isDay) {
      return {
        scenarioId: 'dog_night_cool',
        species: 'dog',
        categoryTitle: 'AKŞAM YÜRÜYÜŞ ZAMANI',
        headline: `Akşam serinliği başladı, sakin bir yürüyüş zamanı! 🌙`,
        subtext: `Güneş battı, asfalt tamamen soğudu. ${petName} ile huzurlu ve konforlu bir akşam yürüyüşü yapabilirsiniz.`,
        metric1: {
          label: 'Hissedilen',
          value: `${input.feelsLike ?? temp}°C`,
          statusText: 'Serin',
          color: 'emerald',
        },
        metric2: {
          label: 'Asfalt Durumu',
          value: 'Soğuk',
          statusText: 'Güvenli',
          color: 'emerald',
        },
        ctaText: 'Akşam Yürüyüş İpuçları',
        modalTitle: 'Akşam Yürüyüşü ve Gece Güvenliği',
        modalTips: [
          {
            title: 'Işıklı / Reflektörlü Ekipman',
            description:
              'Gece yürüyüşlerinde araçların ve bisikletlilerin sizi fark etmesi için ışıklı tasma tercih edin.',
            tag: 'Güvenlik',
          },
          {
            title: 'Sakin Parkurlar',
            description:
              'Akşam saatleri diğer hayvanlarla karşılaşma olasılığı daha yüksektir, tasmayı kontrolünüzde tutun.',
            tag: 'Tavsiye',
          },
        ],
        illustrationType: 'dog_walk',
      }
    }

    // Köpek Senaryo 3: Ilık / Gölgeli Alan Uyarısı
    if (isDay && (temp >= 25 || uv >= 6)) {
      return {
        scenarioId: 'dog_warm_caution',
        species: 'dog',
        categoryTitle: 'GÜNEŞ VE GÖLGE ROTASI',
        headline: `Hava ılık, gölgeli rotaları tercih edin 🐾`,
        subtext: `Güneş altındaki açık asfalt ısınabilir. ${petName}'in patilerini korumak için ağaçlıklı parkları ve çim kenarlarını seçin.`,
        metric1: {
          label: `UV ${uv}`,
          value: `${uv}`,
          statusText: 'Yüksek',
          color: 'amber',
        },
        metric2: {
          label: `Nem %${humidity}`,
          value: `${humidity}`,
          statusText: humidity <= 65 ? 'İdeal' : 'Nemli',
          color: 'emerald',
        },
        ctaText: 'Yürüyüş Rotası Rehberi',
        modalTitle: 'Güneşli ve Ilık Havada Yürüyüş İpuçları',
        modalTips: [
          {
            title: 'Gölge Takibi',
            description:
              'Güneşin dik geldiği sokaklar yerine binaların ve ağaçların gölgesinde yürüyün.',
            tag: 'Rota',
          },
          {
            title: 'Mola Verin',
            description:
              'Köpeğiniz hızlı nefes alıp vermeye başlarsa gölgede 2-3 dakika dinlendirin.',
            tag: 'Sağlık',
          },
        ],
        illustrationType: 'dog_walk',
      }
    }

    // Köpek Senaryo 1: İdeal Yürüyüş Günü (Varsayılan Harika Hava)
    return {
      scenarioId: 'dog_ideal_walk',
      species: 'dog',
      categoryTitle: 'HAVA VE AKTİVİTE',
      headline: `Bugün yürüyüş için harika bir gün! ⛅`,
      subtext: `Hava koşulları ve zemin sıcaklığı ${petName} için ideal seviyede. Birlikte keyifli bir yürüyüşün tadını çıkarın.`,
      metric1: {
        label: `UV ${uv}`,
        value: `${uv}`,
        statusText: uv <= 3 ? 'Düşük' : 'Orta',
        color: 'emerald',
      },
      metric2: {
        label: `Nem %${humidity}`,
        value: `${humidity}`,
        statusText: humidity >= 30 && humidity <= 65 ? 'İdeal' : 'Normal',
        color: 'emerald',
      },
      ctaText: 'Detaylı hava tahmini',
      modalTitle: 'Canlı Hava ve Yürüyüş Raporu',
      modalTips: [
        {
          title: 'Günün En İyi Saatleri',
          description:
            'Günün bu saatleri açık hava egzersizi ve oyun için en verimli aralıktır.',
          tag: 'Zamanlama',
        },
        {
          title: 'Sosyal Egzersiz',
          description:
            'Köpek parklarında diğer dostlarıyla sosyalleşmesi için harika bir hava!',
          tag: 'Aktivite',
        },
      ],
      illustrationType: 'dog_walk',
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 🐱 KEDİ SENARYOLARI (5 Akıllı Senaryo)
  // ─────────────────────────────────────────────────────────────

  // Kedi Senaryo 1: Sıcak Havada Su Tüketimi & Hidrasyon Desteği (FLUTD / Böbrek Koruması)
  if (temp >= 26) {
    return {
      scenarioId: 'cat_heat_hydration',
      species: 'cat',
      categoryTitle: 'EV ORTAMI VE HİDRASYON',
      headline: `Sıcak hava: ${petName}'in su tüketimini destekleyin 💧`,
      subtext: `Dışarısı ${temp}°C. Kediler sıcakta su içmeyi ihmal edebilir. Böbrek ve idrar sağlığı için su kaplarını tazeleyin veya yaş mama takviyesi verin.`,
      metric1: {
        label: 'Oda Sıcaklığı',
        value: `${temp}°C`,
        statusText: temp >= 28 ? 'Sıcak' : 'Ilık',
        color: temp >= 28 ? 'amber' : 'emerald',
      },
      metric2: {
        label: 'Sıvı Desteği',
        value: 'Önemli',
        statusText: 'Taze Su',
        color: 'blue',
      },
      ctaText: 'Kedi Hidrasyon Rehberi',
      modalTitle: 'Kedilerde Sıcak Hava ve Hidrasyon Rehberi',
      modalTips: [
        {
          title: 'Farklı Noktalara Su Kabı',
          description:
            'Evin 2-3 farklı yerine cam veya seramik kaplarda taze su koyun.',
          tag: 'İpucu',
        },
        {
          title: 'Su Çeşmesi (Su Şelalesi)',
          description:
            'Kediler akan suyu daha çok sever. Otomatik su çeşmesi içme isteğini %40 artırır.',
          tag: 'Tavsiye',
        },
        {
          title: 'Yaş Mama Desteği',
          description:
            'Sıcak günlerde günlük öğününe su oranı yüksek yaş mama ekleyin.',
          tag: 'Beslenme',
        },
      ],
      illustrationType: 'cat_indoor',
    }
  }

  // Kedi Senaryo 4: Kuru Hava / Kalorifer & Tüy Sağlığı
  if (humidity < 40 || temp <= 15) {
    return {
      scenarioId: 'cat_dry_air_care',
      species: 'cat',
      categoryTitle: 'NEM VE TÜY BAKIMI',
      headline: `Hava kuru (Nem %${humidity}): ${petName}'in tüy konforunu koruyun 💨`,
      subtext: `Düşük nem oranı ev kedilerinde statik elektrik, burun kuruluğu ve tüy dökülmesine yol açabilir. Ortamı hafifçe nemlendirmek faydalıdır.`,
      metric1: {
        label: `Nem %${humidity}`,
        value: `${humidity}`,
        statusText: 'Kuru',
        color: 'amber',
      },
      metric2: {
        label: 'Tüy Konforu',
        value: 'Bakım',
        statusText: 'Gerekli',
        color: 'emerald',
      },
      ctaText: 'İç Mekan Nem İpuçları',
      modalTitle: 'Kuru Havada Kedi Sağlığı ve Ortam Rehberi',
      modalTips: [
        {
          title: 'Ortam Nemlendirici',
          description:
            'Kalorifer üzerine su kabı koymak veya buhar makinesi çalıştırmak solunum yollarını rahatlatır.',
          tag: 'Konfor',
        },
        {
          title: 'Düzenli Tarama',
          description:
            'Kuru tüyleri nazikçe tarayarak statik elektriği ve deri pullanmasını azaltın.',
          tag: 'Bakım',
        },
      ],
      illustrationType: 'cat_indoor',
    }
  }

  // Kedi Senaryo 5: Mevsim Geçişi & Tüy Dökümü Taraması (İlkbahar & Sonbahar)
  const isSheddingSeason = [2, 3, 4, 8, 9, 10].includes(month) // Mart, Nisan, Mayıs veya Eylül, Ekim, Kasım
  if (isSheddingSeason && temp >= 18 && temp <= 25) {
    return {
      scenarioId: 'cat_seasonal_shedding',
      species: 'cat',
      categoryTitle: 'TÜY DÖKÜMÜ VE TARAMA',
      headline: `Tüy döküm dönemi: 5 dakikalık tarama tüy yumağını önler 🪮`,
      subtext: `Mevsim geçişinde ${petName}'in tüy dökümü artar. Günlük 5 dakika taramak yutulan tüy yumağı (hairball) oluşumunu %80 engeller.`,
      metric1: {
        label: 'Tarama Rutini',
        value: '5 Dk',
        statusText: 'Günlük',
        color: 'emerald',
      },
      metric2: {
        label: 'Tüy Yumağı',
        value: 'Önleme',
        statusText: 'Aktif',
        color: 'emerald',
      },
      ctaText: 'Tarama ve Tüy Rehberi',
      modalTitle: 'Mevsimsel Tüy Dökümü ve Hairball Koruması',
      modalTips: [
        {
          title: 'Malt Macunu Desteği',
          description:
            'Malt macunu, yutulan tüylerin midede birikmeden sindirim yoluyla atılmasını sağlar.',
          tag: 'Sağlık',
        },
        {
          title: 'Doğru Fırça Seçimi',
          description:
            'Kısa tüylü kediler için kauçuk eldiven/fırça, uzun tüylü kediler için seyrek dişli tarak kullanın.',
          tag: 'Ekipman',
        },
      ],
      illustrationType: 'cat_indoor',
    }
  }

  // Kedi Senaryo 2: Ilık Hava & Pencere/Balkon Güvenliği
  if (isDay && temp >= 18 && temp <= 25) {
    return {
      scenarioId: 'cat_window_safety',
      species: 'cat',
      categoryTitle: 'HAVALANDIRMA VE GÜVENLİK',
      headline: `Pencereler açıkken sineklik ve balkon ağını kontrol edin 🪟`,
      subtext: `Hava çok güzel! Ev havalandırılırken ${petName}'in güvenliği için kedi tülü/sineklik ve balkon güvenlik ağlarının kapalı olduğundan emin olun.`,
      metric1: {
        label: 'Hava Durumu',
        value: `${temp}°C`,
        statusText: 'Açık / Ilık',
        color: 'emerald',
      },
      metric2: {
        label: `Nem %${humidity}`,
        value: `${humidity}`,
        statusText: 'İdeal',
        color: 'emerald',
      },
      ctaText: 'Pencere Güvenlik İpuçları',
      modalTitle: 'Yüksekten Düşme Önleme ve Pencere Güvenliği',
      modalTips: [
        {
          title: 'Kediye Dayanıklı Çelik Sineklik',
          description:
            'Standart plastik sineklikler kedi tırnağıyla kolayca yırtılabilir. Çelik telli kedi filesi tercih edin.',
          tag: 'Güvenlik',
        },
        {
          title: 'Vasistas / Yarım Açık Pencere Riski',
          description:
            'Üstten açılan vasistas pencereler kedilerin sıkışıp boğulma riski taşıdığı en tehlikeli alanlardır.',
          tag: 'Kritik',
        },
      ],
      illustrationType: 'cat_indoor',
    }
  }

  // Kedi Senaryo 3: İç Mekan Avcılık & Oyun Zamanı (Varsayılan Konfor)
  return {
    scenarioId: 'cat_indoor_play',
    species: 'cat',
    categoryTitle: 'GÜNÜN OYUN VE AKTİVİTESİ',
    headline: `Bugün ${petName} ile 10 dakikalık avcılık oyunu oynayın 🎯`,
    subtext: `Ev ortamında enerjisini atması ve zihinsel olarak tatmin olması için olta veya lazer oyuncağıyla kısa bir oyun seansı düzenleyin.`,
    metric1: {
      label: 'Oyun Hedefi',
      value: '10 Dk',
      statusText: 'Günde 2 Kez',
      color: 'emerald',
    },
    metric2: {
      label: 'Ruh Hali',
      value: 'Neşeli',
      statusText: 'Aktif',
      color: 'emerald',
    },
    ctaText: 'Kedi Oyun Fikirleri',
    modalTitle: 'Ev Kedileri İçin Zihinsel ve Fiziksel Oyun Rehberi',
    modalTips: [
      {
        title: 'Avlanma - Yakalama Döngüsü',
        description:
          'Oyun sonunda oyuncağı yakalamasına izin verin ve küçük bir ödül mamasıyla av ödülü hissini tamamlayın.',
        tag: 'Psikoloji',
      },
      {
        title: 'Tırmalama ve Tünel',
        description:
          'Karton kutular ve tırmalama tahtaları kedilerin stres atmasını ve sınırlarını işaretlemesini sağlar.',
        tag: 'Zenginleştirme',
      },
    ],
    illustrationType: 'cat_indoor',
  }
}
