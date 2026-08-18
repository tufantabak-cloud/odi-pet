/**
 * MODÜL KAYDI — Odi.Pet sürüm kontrolü
 * ====================================
 *
 * Bu dosya "hangi modül açık, hangisi kapalı, neden kapalı, açmak için ne
 * gerekiyor" sorusunun TEK cevabıdır. Menüler (SideNav, BottomNav) ve route
 * koruması bu listeden beslenir.
 *
 * Bir modülü açmak = ilgili satırda `status` alanını 'live' yapmak.
 * Başka hiçbir yeri değiştirmeye gerek yoktur.
 *
 * KURAL: Kapalı bir modülün kodu SİLİNMEZ. Sadece `status` ile gizlenir.
 *
 * Uzun gerekçeler ve kanıtlar için: odipet_versiyon_envanteri.xlsx
 * Son karar: 2 Ağustos 2026 — Hizmetler/Bütçe/Etkinlikler V2'ye ertelendi,
 * alt navigasyonun 2. sekmesi Takvim'e devredildi.
 */

export type ModuleStatus =
  /** Canlı — menüde görünür, route açık */
  | 'live'
  /** Gizli — kod var ama menüde yok, route 404 döner */
  | 'hidden'
  /** İskelet — tek dosyalık placeholder, henüz yazılmadı */
  | 'skeleton'

export type ModuleVersion = 'V1.0' | 'V1.1' | 'V2' | 'V3'

export type NavSlot =
  /** Mobil alt navigasyon (en fazla 4 + orta buton) */
  | 'bottom_nav'
  /** Masaüstü kenar menüsü — ana bölüm */
  | 'side_primary'
  /** Masaüstü kenar menüsü — kısayollar bölümü */
  | 'side_shortcut'
  /** (+) hızlı ekle menüsü */
  | 'action_menu'

export interface ModuleEntry {
  /** Benzersiz anahtar — navigation_items.id ile eşleşmeli */
  key: string
  /** Kullanıcıya görünen ekran adı */
  label: string
  /** Ana route. Alt route'lar `extraRoutes` içinde. */
  href: string
  /** Bu modüle ait, aynı anda kapanması gereken diğer route'lar */
  extraRoutes?: string[]
  /** iconMap.tsx anahtarı */
  icon: string
  status: ModuleStatus
  version: ModuleVersion
  /**
   * Hangi menülerde görünür. Bir modül birden fazla menüde olabilir —
   * örneğin Anasayfa hem mobil alt menüde hem masaüstü kenar menüsünde.
   * Menüde hiç görünmeyecekse boş dizi.
   */
  slots: NavSlot[]
  /** Menü içindeki sıra (küçük olan üstte). Menüde görünmüyorsa gereksiz. */
  order?: number
  /** Neden bu durumda? Kapalıysa gerekçe zorunlu. */
  note: string
  /** Açmak için ne yapılmalı? Sadece kapalı modüller için. */
  opensWhen?: string[]
}

export const MODULES: ModuleEntry[] = [
  // ══════════════════════════════════════════════════════════
  // V1.0 — CANLI
  // ══════════════════════════════════════════════════════════
  {
    key: 'dashboard',
    label: 'Anasayfa',
    href: '/owner/dashboard',
    icon: 'ti-home',
    status: 'live',
    version: 'V1.0',
    slots: ['bottom_nav', 'side_primary'],
    order: 1,
    note: 'Uygulamanın kalbi. 10 bölüm, kendi e2e testi var.',
  },
  {
    key: 'takvim',
    label: 'Takvim',
    href: '/owner/takvim',
    icon: 'ti-calendar',
    status: 'live',
    version: 'V1.0',
    slots: ['bottom_nav', 'side_primary'],
    order: 2,
    note:
      'Ev geneli takvim. Alt navigasyonun 2. sekmesi — Hizmetler\'den devralındı. ' +
      'api/calendar tüketicisi: health_schedules + appointments birleşik, pet_id ile ' +
      'daraltılabilir, workload özeti gösterilir. Pet seçim ara ekranı YOKTUR; ' +
      'varsayılan tüm petler, daraltma filtre çipleriyle, tek pette çip satırı gizli. ' +
      'DİKKAT: Pet profilindeki "Takvim" sekmesi (HealthTracker) AYRI bir ekrandır ve ' +
      'bu iş kapsamında değiştirilmemiştir — o timeline düzenine dokunulmamalıdır.',
  },
  {
    key: 'social',
    label: 'Sosyal',
    href: '/owner/social',
    extraRoutes: ['/owner/lost-report'],
    icon: 'ti-users',
    status: 'live',
    version: 'V1.0',
    slots: ['side_primary', 'side_shortcut'],
    order: 4,
    note: 'Sahiplendirme / kayıp / eşleştirme. Kayıp akışının 4 ayrı e2e testi var.',
  },
  {
    key: 'profile',
    label: 'Profil',
    href: '/owner/profile',
    icon: 'ti-user',
    status: 'live',
    version: 'V1.0',
    slots: ['bottom_nav', 'side_shortcut'],
    order: 5,
    note: '10 alt ayar sayfası, Stripe aboneliği dahil.',
  },
  {
    key: 'ai-vet',
    label: 'AI VET',
    href: '/owner/ai-vet',
    icon: 'ti-robot',
    status: 'live',
    version: 'V1.0',
    slots: ['side_primary'],
    order: 2,
    note: 'Gemini triage + tıbbi uyarı guardrail. Ana pazarlama kancası.',
  },
  {
    key: 'learn',
    label: 'İçerikler',
    href: '/owner/learn',
    icon: 'ti-file-text',
    status: 'live',
    version: 'V1.0',
    slots: ['side_primary'],
    order: 5,
    note: 'Makale sistemi, vet-review guard\'lı. İçerik doluluğu operasyonel konu.',
  },
  {
    key: 'vets',
    label: 'Veteriner',
    href: '/owner/vets',
    icon: 'ti-map-pin',
    status: 'live',
    version: 'V1.0',
    slots: ['bottom_nav', 'side_shortcut', 'side_primary'],
    order: 3,
    note:
      '~4.500 klinik. Mobilde alt navigasyonda 3. sekme. DİKKAT: /clinic ile karıştırma — o ayrı bir B2B portal ve kapalı.',
  },
  {
    key: 'notifications',
    label: 'Bildirimler',
    href: '/owner/notifications',
    icon: 'ti-message',
    status: 'live',
    version: 'V1.0',
    slots: ['side_shortcut'],
    order: 2,
    note: 'Web push + overdue aşı bildirimleri.',
  },
  {
    key: 'help',
    label: 'Yardım',
    href: '/help.html',
    icon: 'ti-file-text',
    status: 'live',
    version: 'V1.0',
    slots: ['side_shortcut'],
    order: 4,
    note:
      'public/help.html — statik "Nasıl Yapılır" sayfası. ' +
      'TODO: eski mor tonu (#534AB7) kullanıyor, marka rengi #9C26AF ile güncellenmeli.',
  },

  // ══════════════════════════════════════════════════════════
  // V1.1 — LANSMAN SONRASI (kapalı değil, tamamlanacak)
  // ══════════════════════════════════════════════════════════
  {
    key: 'sos-page',
    label: 'SOS detay (ölü scaffold)',
    href: '/sos',
    extraRoutes: ['/sos/[id]', '/sos/[id]/matches'],
    icon: 'ti-heart-rate-monitor',
    status: 'hidden',
    version: 'V2',
    slots: [],
    note:
      'VERİ SIZDIRAN SCAFFOLD — KAPALI KALMALI. 36 satır, `pets` tablosundan ' +
      'sahiplik kontrolü OLMADAN 5 kayıt çekip JSON.stringify ile ekrana döküyor. ' +
      'Kod tabanında hiçbir yerden linklenmiyor (tek referans bu kayıt). ' +
      'DÜZELTME NOTU: Önce "paylaşılan kartın açtığı sayfa" sanılmıştı — YANLIŞ. ' +
      'Paylaşım kartı /caregiver/[token] üzerinden çalışıyor ve o sayfa gerçek. ' +
      'Bu route\'un silinmesi değerlendirilmeli; şimdilik middleware engelliyor.',
    opensWhen: [
      'Bu route\'a gerçekten ihtiyaç var mı karar verildi (muhtemelen silinmeli)',
      'Silinmeyecekse sahiplik/RLS kontrolü eklenip gerçek bir ekran yazıldı',
    ],
  },
  {
    key: 'pet-share-screen',
    label: 'Kart paylaşım ekranı (sahip tarafı)',
    href: '/owner/pets/[id]/share',
    icon: 'ti-share',
    status: 'hidden',
    version: 'V1.1',
    slots: [],
    note:
      'BOŞ STUB — sayfa `<div className="min-h-[400px]" />` döndürüyor, hiçbir şey yok. ' +
      'Oysa arkasındaki API tam çalışıyor: /api/share/create kriptografik token üretip ' +
      'shared_pet_cards\'a yazıyor (sahiplik doğrulaması, access_type, expires_at, ' +
      'can_log_entries ile), /api/share/get/[token] de güvenli alanları dönüyor. ' +
      'Kartı GÖRÜNTÜLEYEN taraf (/caregiver/[token]) hazır; eksik olan sadece ' +
      'sahibin kartı OLUŞTURDUĞU ekran. api/share/create\'in tüketicisi yok.',
    opensWhen: [
      'Paylaşım oluşturma ekranı yazıldı (süre seçimi, kayıt girişi izni, bağlantı kopyalama)',
      'Oluşturulan bağlantının /caregiver/[token] adresine gittiği doğrulandı',
      'Aktif kartları listeleme ve iptal etme akışı eklendi',
    ],
  },
  {
    key: 'insurance',
    label: 'Sigorta',
    href: '/owner/services#insurance',
    icon: 'ti-file-text',
    status: 'hidden',
    version: 'V1.1',
    slots: [],
    note:
      'ServicesInsuranceWrapper — Hizmetler sayfasındaki tek gerçek özellik. ' +
      'Hizmetler V2\'ye ertelendiği için şu an erişilemez durumda. ' +
      'Kuduz aşısı otomatik plana girmediği için uygunluk hesabı da hatalı olabilir.',
    opensWhen: [
      'Kuduz (legal_required) otomatik plan boşluğu düzeltildi',
      'Hizmetler\'den bağımsız bir giriş noktası belirlendi (profil altı olabilir)',
    ],
  },

  // ══════════════════════════════════════════════════════════
  // V2 — SCAFFOLD / TEASER (karar: 2 Ağustos 2026'da ertelendi)
  // ══════════════════════════════════════════════════════════
  {
    key: 'services',
    label: 'Hizmetler',
    href: '/owner/services',
    icon: 'ti-building-store',
    status: 'hidden',
    version: 'V2',
    slots: [],
    order: 2,
    note:
      'KARAR (2 Ağu 2026): V2\'ye ertelendi, alt nav 2. sekmesi Takvim\'e devredildi. ' +
      'Sayfa tasarlanmış ama içeriğinin TAMAMI teaser: hero "Çok Yakında", ' +
      '7 hizmet kartının hepsinde "Son Fazda" / "Çok Yakında" rozeti. ' +
      'İçindeki tek gerçek şey sigorta widget\'ı (bkz. insurance kaydı).',
    opensWhen: [
      'En az bir profesyonel modül (groomer/hotel/sitter/trainer) canlıya alındı',
      'Rezervasyon akışı (bookings) yazıldı',
      'Teaser rozetleri gerçek içerikle değiştirildi',
    ],
  },
  {
    key: 'marketplace',
    label: 'Mağaza',
    href: '/owner/marketplace',
    icon: 'ti-shopping-bag',
    status: 'hidden',
    version: 'V2',
    slots: [],
    order: 9,
    note:
      'SCAFFOLD — marketplace_products tablosundan çektiği satırı JSON.stringify ile ' +
      'ekrana döküyor. Ürün değil, geliştirici iskelesi. Sıfırdan yazılmalı.',
    opensWhen: [
      'Ürün listeleme/detay ekranı yazıldı',
      'Sepet ve ödeme akışı Stripe\'a bağlandı',
      'Kargo/teslimat ve iade politikası tanımlandı',
    ],
  },
  {
    key: 'bookings',
    label: 'Rezervasyonlar',
    href: '/owner/bookings',
    icon: 'ti-calendar',
    status: 'hidden',
    version: 'V2',
    slots: [],
    note: 'SCAFFOLD — JSON dökümü. Profesyonel tarafa bağımlı, o olmadan anlamsız.',
    opensWhen: [
      'En az bir profesyonel modül canlıya alındı (rezervasyon yapılacak bir taraf gerekiyor)',
      'Takvim ekranıyla entegrasyon tanımlandı (api/calendar zaten appointments döndürüyor)',
    ],
  },
  {
    key: 'budget',
    label: 'Bütçe (genel)',
    href: '/owner/budget',
    icon: 'ti-wallet',
    status: 'hidden',
    version: 'V2',
    slots: [],
    order: 7,
    note:
      'KARAR (2 Ağu 2026): V2\'ye ertelendi. SCAFFOLD — user_subscriptions tablosundan ' +
      'JSON dökümü. DİKKAT: Pet bazlı bütçe (/owner/pets/[id]/budget) BUNDAN AYRI ve ' +
      'gerçek — aşağıdaki pet-budget kaydına bak. Bu ikisi karıştırılmamalı.',
    opensWhen: [
      'Tüm petleri kapsayan genel bütçe özeti ekranı yazıldı',
      'Pet bazlı bütçe verisiyle nasıl birleşeceğine karar verildi',
    ],
  },
  {
    key: 'pet-budget',
    label: 'Pet bütçesi',
    href: '/owner/pets/[id]/budget',
    icon: 'ti-wallet',
    status: 'live',
    version: 'V1.0',
    slots: [],
    note:
      'GERÇEK VE ÇALIŞIR — DÜZELTME: önce yanlışlıkla /owner/budget scaffold\'ıyla ' +
      'aynı satıra konup V2 sayılmıştı. Zincirin tamamı yazılı: sayfa auth + ' +
      'owner_id sahiplik filtresi uyguluyor, BudgetTab (264 satır, 4 harcama ' +
      'kategorisi) render ediliyor, api/pets/[id]/expenses (80 satır) GET/POST ' +
      'servis ediyor. PetDetailClient içinden butonla linkleniyor — kapatılırsa ' +
      'pet profilindeki Bütçe butonu 404 verir.',
  },
  {
    key: 'events',
    label: 'Etkinlikler',
    href: '/owner/events',
    extraRoutes: ['/owner/events/[id]'],
    icon: 'ti-calendar',
    status: 'hidden',
    version: 'V2',
    slots: [],
    order: 8,
    note:
      'KARAR (2 Ağu 2026): V2\'ye ertelendi. SCAFFOLD — JSON dökümü. ' +
      'api/events (2 route) var ama ekran yazılmamış. ' +
      'DİKKAT: Ana sayfadaki sosyal kutucuklarındaki "Etkinlikler" bundan ayrı ve zaten comingSoon.',
    opensWhen: [
      'Etkinlik listeleme/detay/katılım ekranları yazıldı',
      'Takvim ekranıyla çakışmayacak bir konumlandırma belirlendi',
    ],
  },
  {
    key: 'messages',
    label: 'Mesajlar',
    href: '/owner/messages',
    extraRoutes: ['/owner/messages/[id]'],
    icon: 'ti-message',
    status: 'hidden',
    version: 'V2',
    slots: [],
    order: 6,
    note:
      'SCAFFOLD — JSON dökümü. Aile paylaşımı V1\'de olduğu için ileride gerekebilir, ' +
      'ama şu an sıfırdan yazılması gerekiyor.',
    opensWhen: [
      'Mesajlaşma ekranı ve gerçek zamanlı akış yazıldı',
      'Kiminle mesajlaşılacağı netleşti (aile üyeleri / klinik / profesyoneller)',
    ],
  },
  {
    key: 'clinic-portal',
    label: 'Klinik portalı (B2B)',
    href: '/clinic',
    extraRoutes: [
      '/clinic/register',
      '/api/auth/clinic-register',
      '/clinic/dashboard',
      '/clinic/appointments',
      '/clinic/care-plans',
      '/clinic/pets',
      '/clinic/pets/[id]',
      '/clinic/notifications',
      '/clinic/admin',
      '/clinic/patients',
      '/clinic/patient/[petId]',
    ],
    icon: 'ti-building-store',
    status: 'hidden',
    version: 'V2',
    slots: [],
    note:
      'Yarı yazılmış B2B portal — owner\'dan bağımsız ayrı bir ürün. ' +
      'dashboard/appointments/care-plans gerçek sayfalar ama uçtan uca akış ve e2e testi yok; ' +
      'patients/patient[petId] ise scaffold. ' +
      'DİKKAT: Bu veteriner REHBERİ değil — rehber /owner/vets ve V1\'de canlı.',
    opensWhen: [
      'Klinik kayıt → onay → panel akışı uçtan uca çalışıyor',
      'Klinik ile pet sahibi arasındaki veri paylaşımı izinleri (RLS) doğrulandı',
      'En az bir pilot klinik ile gerçek kullanım testi yapıldı',
    ],
  },

  // ══════════════════════════════════════════════════════════
  // V3 — İSKELET (tek dosyalık placeholder, hiç yazılmadı)
  // ══════════════════════════════════════════════════════════
  {
    key: 'groomer',
    label: 'Kuaför & Bakım',
    href: '/groomer',
    icon: 'ti-building-store',
    status: 'skeleton',
    version: 'V3',
    slots: [],
    note: 'Tek dosya iskelet. Hizmetler sayfasında "Son Fazda" olarak duyuruluyor.',
    opensWhen: ['Profesyonel taraf iş modeli netleşti', 'Modül sıfırdan yazıldı'],
  },
  {
    key: 'hotel',
    label: 'Otel & Pansiyon',
    href: '/hotel',
    icon: 'ti-building-store',
    status: 'skeleton',
    version: 'V3',
    slots: [],
    note: 'Tek dosya iskelet. Hizmetler sayfasında "Son Fazda" olarak duyuruluyor.',
    opensWhen: ['Profesyonel taraf iş modeli netleşti', 'Modül sıfırdan yazıldı'],
  },
  {
    key: 'sitter',
    label: 'Bakıcı',
    href: '/sitter',
    icon: 'ti-user',
    status: 'skeleton',
    version: 'V3',
    slots: [],
    note: 'Tek dosya iskelet. Hizmetler sayfasında "Çok Yakında" olarak duyuruluyor.',
    opensWhen: ['Profesyonel taraf iş modeli netleşti', 'Modül sıfırdan yazıldı'],
  },
  {
    key: 'trainer',
    label: 'Eğitmen',
    href: '/trainer',
    icon: 'ti-user',
    status: 'skeleton',
    version: 'V3',
    slots: [],
    note: 'Tek dosya iskelet. Hizmetler sayfasında "Son Fazda" olarak duyuruluyor.',
    opensWhen: ['Profesyonel taraf iş modeli netleşti', 'Modül sıfırdan yazıldı'],
  },
  {
    key: 'caregiver-card',
    label: 'Paylaşılan bakıcı kartı',
    href: '/caregiver',
    icon: 'ti-user',
    status: 'live',
    version: 'V1.0',
    slots: [],
    note:
      'GERÇEK VE ÇALIŞIR — /caregiver/[token]/page.tsx, 175 satır. ' +
      'shared_pet_cards token\'ıyla açılan halka açık pet kartı: acil arama butonu, ' +
      'pet bilgileri, veteriner iletişimi ve LogbookForm ile bakıcı kayıt girişi. ' +
      'is_active + expires_at kontrolü yapıyor, süresi dolmuşsa notFound() dönüyor. ' +
      'Menüde görünmez çünkü giriş noktası paylaşım bağlantısıdır. ' +
      'DİKKAT: Bu bir "profesyonel bakıcı rolü" DEĞİL — pet sahibinin ürettiği ' +
      'geçici paylaşım kartıdır ve V1 akışının parçasıdır. Kapatılırsa dağıtılmış ' +
      'tüm paylaşım linkleri kırılır.',
  },
]

// ══════════════════════════════════════════════════════════
// Yardımcılar — menüler ve route koruması bunları kullanır
// ══════════════════════════════════════════════════════════

/** Menüde gösterilecek modüller (yalnızca canlı olanlar) */
export function getNavModules(slot: NavSlot): ModuleEntry[] {
  return MODULES.filter(m => m.status === 'live' && m.slots.includes(slot)).sort(
    (a, b) => (a.order ?? 99) - (b.order ?? 99)
  )
}

/** Kapalı modüllere ait tüm route'lar — middleware route koruması için */
export function getBlockedRoutes(): string[] {
  return MODULES.filter(m => m.status !== 'live').flatMap(m => [
    m.href,
    ...(m.extraRoutes ?? []),
  ])
}

/** Verilen yol kapalı bir modüle mi ait? */
export function isBlockedPath(pathname: string): boolean {
  return getBlockedRoutes().some(route => {
    // [id] gibi dinamik parçaları joker olarak eşle
    const pattern = route.replace(/\[[^\]]+\]/g, '[^/]+')
    return new RegExp(`^${pattern}(/|$)`).test(pathname)
  })
}

/**
 * navigation_items tablosundan gelen menü kayıtlarını süzer.
 * Kapalı bir modüle işaret eden satırlar düşürülür — böylece DB'de eski bir
 * satır aktif kalsa bile menüde ölü/erişilemez link görünmez.
 */
/**
 * Yol normalizasyonu: Sorgu parametresi ve fragment'i atar, sondaki '/' karakterlerini kaldırır ve küçük harfe çevirir.
 */
export function normalizeHref(href: string): string {
  if (!href) return ''
  const clean = href.split(/[?#]/)[0].toLowerCase()
  if (clean === '/') return '/'
  return clean.replace(/\/+$/, '')
}

/**
 * Bir menü öğesinin modül kaydındaki öncelik sırasını çözer.
 * Modül kaydında (MODULES) tanımlı ise m.order kullanılır; aksi halde order_index veya 99.
 */
function getNavItemOrder<T extends { href: string; id?: string }>(item: T): number {
  const normHref = normalizeHref(item.href)
  const moduleEntry = MODULES.find(
    m => normalizeHref(m.href) === normHref || (item.id && m.key === item.id)
  )
  if (moduleEntry && moduleEntry.order !== undefined) {
    return moduleEntry.order
  }
  return ('order_index' in item && typeof (item as any).order_index === 'number')
    ? (item as any).order_index
    : 99
}

export function filterNavItems<T extends { href: string }>(items: T[] | undefined): T[] {
  if (!items) return []
  return items.filter(item => {
    // Sorgu parametresi ve fragment'i ayıkla (/owner/plan-yap?mode=log gibi)
    const path = normalizeHref(item.href)
    if (!path.startsWith('/')) return true
    return !isBlockedPath(path)
  })
}

/**
 * navigation_items satırlarını modül kaydıyla uzlaştırır.
 *
 * İki yönlü çalışır:
 *  1. Kapalı modüle işaret eden DB satırlarını DÜŞÜRÜR (ölü link olmasın).
 *  2. DB'de karşılığı olmayan canlı modülleri EKLER (yeni modül, tabloya satır
 *     eklenmeden de menüde görünsün).
 *
 * Böylece bir modülü açmak/kapatmak için tek yer modül kaydıdır; DB tablosu
 * yalnızca sıralama/etiket özelleştirmesi için kullanılır.
 */
export function resolveNavItems<T extends { href: string; label?: string; id?: string }>(
  dbItems: T[] | undefined,
  slot: NavSlot
): Array<T | ModuleNavItem> {
  const kept = filterNavItems(dbItems).filter(item => {
    const normHref = normalizeHref(item.href)
    const moduleEntry = MODULES.find(
      m => normalizeHref(m.href) === normHref || (item.id && m.key === item.id)
    )
    if (moduleEntry) {
      return moduleEntry.slots.includes(slot)
    }
    return true
  })

  const presentPaths = new Set(kept.map(i => normalizeHref(i.href)))

  const missing = getNavModules(slot)
    .filter(m => !presentPaths.has(normalizeHref(m.href)))
    .map<ModuleNavItem>(m => ({
      id: m.key,
      label: m.label,
      icon: m.icon,
      href: m.href,
      slot,
      order_index: m.order ?? 99,
      is_active: true,
      match_type: 'startsWith',
    }))

  const combined = [...kept, ...missing]

  const sorted = combined.sort((a, b) => {
    const orderA = getNavItemOrder(a)
    const orderB = getNavItemOrder(b)
    if (orderA !== orderB) return orderA - orderB
    const indexA = ('order_index' in a && typeof (a as any).order_index === 'number') ? (a as any).order_index : 99
    const indexB = ('order_index' in b && typeof (b as any).order_index === 'number') ? (b as any).order_index : 99
    return indexA - indexB
  })

  if (slot === 'bottom_nav' && sorted.length > 4) {
    return sorted.slice(0, 4)
  }

  return sorted
}

/** navigation_items satırlarıyla aynı şekle sahip, kayıttan üretilmiş menü öğesi */
export interface ModuleNavItem {
  id: string
  label: string
  icon: string
  href: string
  slot: NavSlot
  order_index: number
  is_active: boolean
  match_type: 'exact' | 'startsWith'
}

/** Bir sürüme ait modüller — planlama ve raporlama için */
export function getModulesByVersion(version: ModuleVersion): ModuleEntry[] {
  return MODULES.filter(m => m.version === version)
}

/** Açılmayı bekleyen modüller ve koşulları — "sırada ne var" sorusu için */
export function getPendingModules(): Array<{
  label: string
  version: ModuleVersion
  opensWhen: string[]
}> {
  return MODULES.filter(m => m.status !== 'live' && m.opensWhen?.length).map(m => ({
    label: m.label,
    version: m.version,
    opensWhen: m.opensWhen!,
  }))
}
