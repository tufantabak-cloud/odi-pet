# BRAND NAMING AUDIT — `Odi.Pet` / `Odi Pet` → `Odi`

**Tarih:** 2026-08-09 · **Branch:** `phase18-wip` · **Mod:** READ-ONLY AUDIT
**Kapsam:** `src/`, `public/`, `supabase/`, `e2e/`, `tests/`, `scripts/`, `docs/`, kök config dosyaları
**Hariç:** `node_modules`, `.git`, `.next`, `agent-os`, `playwright-report`, `test-results`

**Toplam:** 783 eşleşme / 376 dosya

---

## 0. ÖNCE BİLİNMESİ GEREKEN 4 BULGU

### 0.1 Marka adı zaten 5 farklı biçimde yazılıyor
| Biçim | Nerede |
| --- | --- |
| `Odi.Pet` | Baskın biçim (metadata, legal, UI, yorumlar) |
| `Odi Pet` | `PlanManagementTab.tsx:682`, `owner/budget/page.tsx:6`, `supabase/.temp/linked-project.json` |
| `ODI Pet` | `admin/layout.tsx:11`, `calendar/feed:216,219`, `ReportsTab.tsx:428` |
| `ODI.PET` | `globals.css:226`, 4 adet SQL migration başlığı |
| `OdiPetApp` | 3 adet HTTP `User-Agent` başlığı |

Yani "tutarsızlık" bu değişiklikle başlamadı; zaten mevcut. Bu, yeniden adlandırmayı **tek seferlik bir temizlik fırsatı** yapar ama aynı zamanda kapsamı büyütür.

### 0.2 Bir E2E testi tam metin eşleşmesiyle kilitli 🔴
```
e2e/subscription-payment.spec.ts:33
  page.getByText('Kart bilgilerin Odi.Pet tarafından tutulmaz.')
```
`src/app/owner/profile/subscription/page.tsx:259`'daki bu metin değişirse **test kırılır**. Değişiklikle test aynı commit'te güncellenmeli.

### 0.3 `src/sw.ts` değişirse `public/sw.js` yeniden derlenmeli
Bildirim başlıkları hem kaynakta (`src/sw.ts:107,111`) hem derlenmiş çıktıda (`public/sw.js:3316,3318`) var. Kaynağı değiştirip `npm run build` çalıştırmamak sessiz bir tutarsızlık yaratır.

### 0.4 PWA manifest adı değiştirmek geri alması zor bir işlemdir ⚠️
`manifest.json`'daki `name`/`short_name` değişikliği, **zaten kurulmuş** PWA'larda ana ekran ikon etiketini güvenilir biçimde güncellemez — özellikle iOS'ta kullanıcı uygulamayı silip yeniden kurana kadar eski isim kalır. Kullanıcı tabanı varsa bu bilinçli bir karar olmalı.

---

## KATEGORİ 1 — USER-FACING BRAND (`Odi` yapılabilir)

Kullanıcının ekranda okuduğu, işlevsel bağlayıcılığı olmayan metinler.

### 1.1 Uygulama kabuğu / metadata

| Dosya:Satır | İçerik | Karar | Neden |
| --- | --- | --- | --- |
| `src/app/owner/layout.tsx:87` | `Odi` ← **zaten değişmiş (working tree)** | **REVIEW** | Değişikliğin kendisi; ayrıca `hidden sm:block` kaldırılmış (mobil header sıkışma riski). Tek başına bırakılırsa uygulamanın geri kalanıyla tutarsız. |
| `src/app/layout.tsx:21` | `title: 'Odi.Pet — Can Dostunun Yaşam Platformu'` | **CHANGE** | Tarayıcı sekmesi + SEO başlığı. Salt görsel. |
| `src/app/layout.tsx:27` | `appleWebApp.title: 'Odi.Pet'` | **REVIEW** | iOS ana ekran etiketi — 0.4'teki kurulu-PWA uyarısı geçerli. |
| `src/app/layout.tsx:39,41,49` | OpenGraph `title` / `siteName` / image `alt` | **CHANGE** | Sosyal paylaşım önizlemesi. |
| `src/app/layout.tsx:55` | Twitter card `title` | **CHANGE** | Aynı. |
| `public/manifest.json:2` | `"name": "Odi.Pet"` | **REVIEW** | PWA kurulum adı — 0.4 uyarısı. |
| `public/manifest.json:3` | `"short_name": "Odi.Pet"` | **REVIEW** | Ana ekran etiketi — 0.4 uyarısı. `Odi` zaten `short_name` için ideal uzunlukta. |
| `src/app/admin/layout.tsx:11` | `'Admin Console — ODI Pet'` | **CHANGE** | Yalnızca admin sekme başlığı; ayrıca `ODI Pet` yazım hatasını da düzeltir. |
| `src/app/admin/content/page.tsx:9` | `'İçerik Yönetimi \| Odi.Pet Admin'` | **CHANGE** | Sekme başlığı. |

### 1.2 Sayfa `<title>` metadata'ları

| Dosya:Satır | Karar | Neden |
| --- | --- | --- |
| `src/app/owner/learn/page.tsx:9` · `learn/[slug]/page.tsx:18,20` | **CHANGE** | Sekme başlığı |
| `src/app/owner/takvim/page.tsx:11` | **CHANGE** | Sekme başlığı |
| `src/app/owner/referral/page.tsx:8,9` | **CHANGE** | Sekme başlığı + description |

### 1.3 Splash / Login / Auth görselleri (`alt` metinleri)

| Dosya:Satır | Karar | Neden |
| --- | --- | --- |
| `src/components/ui/SplashScreen.tsx:109,127` | **CHANGE** | Yalnızca `alt`; görsel dosya adları (`odi-splash-logo.png/svg`) **DEĞİŞMEZ** |
| `src/app/login/page.tsx:162` | **CHANGE** | `alt="Odi.Pet Logo"` |
| `src/app/register/page.tsx:260` | **CHANGE** | `alt` |
| `src/app/reset-password/page.tsx:65` | **CHANGE** | `alt` |
| `src/app/update-password/page.tsx:105` | **CHANGE** | `alt` |
| `src/app/not-found.tsx:8` | **CHANGE** | `alt` |
| `src/components/ui/PwaEnforcer.tsx:273` | **CHANGE** | `alt` |
| `public/brand/logos/social/odi-social-cover.svg:2` | **REVIEW** | SVG `<title>` — erişilebilirlik etiketi. Son 4 commit'in konusu olan brand asset; brand ekibiyle beraber karar verilmeli. |

### 1.4 PWA / Bildirim kullanıcı metinleri

| Dosya:Satır | İçerik | Karar | Neden |
| --- | --- | --- | --- |
| `src/components/ui/PwaEnforcer.tsx:190,282,289` | Kurulum/hoşgeldin metinleri | **CHANGE** | Salt kopya |
| `src/components/ui/PwaEnforcer.tsx:205` | `Bildirimler > Odi.Pet yolunu izleyin` | 🔴 **KEEP** | **Bu, kullanıcıya iOS/Android sistem ayarlarında görünen uygulama adını tarif ediyor. O ad `manifest.json`'dan gelir. Manifest değişmeden burayı değiştirmek kullanıcıya YANLIŞ talimat verir.** Ancak manifest değişirse burası da değişmeli — ikisi atomik. |
| `src/components/ui/PwaUpdater.tsx:158` | Güncelleme bildirimi | **CHANGE** | Salt kopya |
| `src/hooks/useWebPush.ts:52` | iOS "Ana Ekrana Ekle" yönergesi | **REVIEW** | 205 ile aynı bağımlılık — manifest adına referans veriyor |
| `src/app/owner/notifications/NotificationsClient.tsx:64` | `'🐾 Odi.Pet Test Bildirimi'` | **CHANGE** | Test bildirimi başlığı |
| `src/app/owner/notifications/NotificationsClient.tsx:104` | `Tarayıcı ayarlarından Odi.Pet için...` | **REVIEW** | Yine sistem ayarlarındaki ada referans |
| `src/sw.ts:107,111` | Push fallback başlığı `'Odi.Pet'` / `'Odi.Pet 🐾'` | **CHANGE** ⚠️ | Değişirse `npm run build` ile `public/sw.js` yeniden üretilmeli (0.3) |
| `src/lib/agents/notificationAgent.ts:72` | `'Odi.Pet Seni Özledi 🐾'` | **CHANGE** | Push başlığı |

### 1.5 Paylaşım / referral metinleri

| Dosya:Satır | Karar | Neden |
| --- | --- | --- |
| `src/app/owner/referral/ReferralClient.tsx:94,95` | **CHANGE** | Web Share API `title`/`text` |
| `src/app/owner/referral/ReferralClient.tsx:106` | **CHANGE** | WhatsApp/SMS paylaşım metni |
| `src/app/owner/referral/ReferralClient.tsx:108` | **CHANGE** | Telegram paylaşım metni |

> Not: Bu metinlerdeki `Odi Pro` (ürün/plan adı) **ayrı bir marka varlığıdır**, `Odi.Pet`'ten bağımsızdır ve dokunulmamalıdır.

### 1.6 Uygulama içi kopya (genel)

| Dosya:Satır | Karar | Neden |
| --- | --- | --- |
| `src/app/owner/dashboard/page.tsx:158` | **CHANGE** | Boş durum metni |
| `src/app/owner/pets/add/success/page.tsx:166` | **CHANGE** | Onboarding kopyası |
| `src/app/owner/services/page.tsx:105` | **CHANGE** | Pazarlama kopyası |
| `src/app/owner/budget/page.tsx:6` | **CHANGE** | "yakında" kopyası (`Odi Pet` yazımını da düzeltir) |
| `src/app/owner/pets/[id]/FamilyTab.tsx:433` | **CHANGE** | `Odi.Pet Akıllı Tarayıcı` — özellik adı |
| `src/components/tasks/SmartTaskWizard.tsx:624` | **CHANGE** | `Odi.Pet Akıllı Asistan` |
| `src/components/estrus-tracker/ReproductiveForecastCard.tsx:94,128` | **CHANGE** | Açıklama metni |
| `src/components/premium/PremiumContent.tsx:30` | **CHANGE** | "yakında" kopyası |
| `src/components/orchestrator/prompts/PremiumUpgradeBanner.tsx:29` | **CHANGE** | `'Odi.Pet Premium'` varsayılan başlık |
| `src/features/pets/vaccination-algorithm.ts:110` | **CHANGE** | Kullanıcıya gösterilen açıklama satırı |
| `src/app/clinic/register/page.tsx:89` | **CHANGE** | `Odi.Pet Veteriner Ağına Katılın` |
| `src/lib/devices/camera/CameraProvider.ts:33` | **CHANGE** | `name: 'Odi.Pet Akıllı Kamera'` (`id: 'odipet'` **DEĞİŞMEZ** — teknik anahtar) |
| `src/app/admin/memberships/PlanManagementTab.tsx:682` | **CHANGE** | `placeholder="Örn: Odi Pet Pro Plus"` |
| `src/app/api/admin/content/monitored-sources/route.ts:228` | **CHANGE** | Admin'e dönen hata mesajı |
| `src/app/owner/profile/subscription/page.tsx:259` | 🔴 **CHANGE + TEST** | `e2e/subscription-payment.spec.ts:33` bu metni birebir arıyor — aynı commit'te güncellenmeli |

### 1.7 Rapor / e-posta şablonları — sınır vaka

| Dosya:Satır | İçerik | Karar | Neden |
| --- | --- | --- | --- |
| `src/app/owner/reports/[id]/print/page.tsx:91` | `<h1>Odi.Pet Sağlık Raporu</h1>` | **REVIEW** | Yazdırılan/PDF'e dönen rapor başlığı — veterinere gösterilebilir, yarı-resmî belge |
| `src/app/owner/reports/[id]/print/page.tsx:143` | Rapor altbilgisi | **REVIEW** | Aynı |
| `src/app/owner/pets/[id]/ReportsTab.tsx:428` | `ODI Pet OS tarafından oluşturuldu` | **REVIEW** | Doğrulama hash'inin yanında — kanıt/izlenebilirlik bağlamı |
| `src/lib/email/invite-email.ts:41,42` | E-posta **konu** satırı `[Odi.Pet] ...` | **REVIEW** | Konu satırı değişimi mevcut e-posta thread'lerini böler; spam filtresi geçmişi sıfırlanır |
| `src/lib/email/invite-email.ts:48,55` | E-posta gövdesi + `<h1>🐾 Odi.Pet</h1>` | **CHANGE** | Salt görsel |

---

## KATEGORİ 2 — LEGAL / CORPORATE (karar gerekiyor)

Tüzel kişilik, telif, lisans ve sözleşme bağlamı. **Hukuki danışman onayı olmadan değiştirilmemeli.**

| Dosya:Satır | İçerik | Karar | Neden |
| --- | --- | --- | --- |
| `src/app/legal/kvkk/page.tsx:23` | `Odi.Pet (Bundan böyle "Platform" veya "Şirket" olarak anılacaktır)` | 🔴 **KEEP** | **KVKK aydınlatma metninde veri sorumlusunun ünvanı.** Tescilli ticari ünvanla eşleşmeli. |
| `src/app/legal/kvkk/page.tsx:4,5` | KVKK sayfası `title`/`description` | **REVIEW** | Metadata; gövde metniyle tutarlı kalmalı |
| `src/app/legal/terms/page.tsx:23` | `Odi.Pet platformuna kayıt olarak...` | 🔴 **KEEP** | Sözleşme tarafının adı |
| `src/app/legal/terms/page.tsx:28` | AI Vet sorumluluk reddi | 🔴 **KEEP** | Sorumluluk sınırlaması metni |
| `src/app/legal/terms/page.tsx:38` | `tüm ... hakları Odi.Pet'e aittir` | 🔴 **KEEP** | **Fikri mülkiyet beyanı** |
| `src/app/legal/terms/page.tsx:4,5` | Metadata | **REVIEW** | Gövdeyle tutarlı kalmalı |
| `src/lib/email/invite-email.ts:78` | `© 2026 Odi.Pet. Tüm hakları saklıdır.` | 🔴 **KEEP** | Telif bildirimi |
| `public/brand/illustrations/**/illustration.json` | **140 ×** `"copyright": "Odi.Pet"` | 🔴 **KEEP** | Varlık telif üstverisi — hukuki iddia kaydı |
| `public/brand/illustrations/**/illustration.json` | **54 ×** `"license": "Odi.Pet Corporate Proprietary"` | 🔴 **KEEP** | **Lisans tanımlayıcısı.** Değiştirmek mevcut varlıkların lisans zincirini kırar. |

**Toplu değerlendirme:** Bu 194 illüstrasyon üstveri girdisi tek bir hukuki karar kalemidir — ya hepsi değişir ya hiçbiri. Marka adı ticari ünvandan farklıysa (`Odi` marka, `Odi.Pet` ünvan), doğru çözüm bunların **olduğu gibi kalması**dır.

---

## KATEGORİ 3 — TECHNICAL / DOMAIN / EMAIL / CODE (kesinlikle DEĞİŞMEZ)

### 3.1 Domain ve URL'ler — 🔴 KEEP

| Dosya:Satır | İçerik | Neden |
| --- | --- | --- |
| `src/app/layout.tsx:20` | `metadataBase: new URL('https://odi.pet')` | Kanonik domain — SEO ve OG mutlak URL üretimi |
| `src/sw.ts:120,121` | `https://odi.pet/brand/app-icons/...` | Push ikon mutlak URL'i |
| `public/sw.js:3323,3324` | Aynı (derlenmiş) | Aynı |
| `src/app/owner/notifications/NotificationsClient.tsx:66,67` | Aynı | Aynı |
| `supabase/functions/dispatch-notifications/index.ts:93,103,301,302` | `https://odi.pet/...` | Edge function e-posta/push URL'leri |
| `src/lib/auth-security.test.ts:41` | `NEXT_PUBLIC_SITE_URL = 'https://odi.pet'` | Test fixture |
| `src/lib/security/request-origin.test.ts:8,9,17,18,26,33,39` | `host: 'odi.pet'`, `origin: 'https://odi.pet'` | **Same-origin güvenlik testleri.** Değiştirilirse CSRF koruma testleri anlamsızlaşır. |

### 3.2 E-posta adresleri — 🔴 KEEP

| Dosya:Satır | İçerik | Neden |
| --- | --- | --- |
| `src/lib/agents/notificationAgent.ts:16` | `webpush.setVapidDetails('mailto:destek@odi.pet', ...)` | **VAPID iletişim adresi** — push servis sağlayıcıları doğrular |
| `supabase/functions/dispatch-notifications/index.ts:20` | `'mailto:destek@odi.pet'` | Aynı |
| `supabase/functions/dispatch-notifications/index.ts:39` | `from: "Odi.Pet <hatirlatma@odi.pet>"` | **Gönderen adresi — SPF/DKIM/DMARC'a bağlı.** Adres kısmı asla değişmez; görünen ad (`Odi.Pet`) değiştirilebilir ama teslimat itibarını etkileyebilir → REVIEW |
| `src/lib/email/invite-email.ts:97` | `from: 'Odi.Pet <onboarding@resend.dev>'` | Aynı mantık |
| `src/app/api/location/postcode/route.ts:16` | `'User-Agent': 'OdiPetApp/1.0 (contact@odi.pet)'` | **Nominatim kullanım politikası geçerli iletişim adresi zorunlu kılar** |
| `src/app/api/v1/reports/lost/location/route.ts:35` · `reverse-geocode/route.ts:17` | `'OdiPetApp/1.0 (https://odi.pet)'` | Aynı |
| `src/app/api/plans/[id]/route.test.ts:57,80` · `route.test.ts:56` | `test-...@odi.pet` | Test fixture e-postaları |
| `src/lib/membership/__tests__/membershipService.test.ts:16` | `'test@odi.pet'` | Test fixture |
| `supabase/seed_local_users.sql:14,21,28` | `test-caregiver@odi.pet` | Local seed verisi |

### 3.3 Protokol tanımlayıcıları — 🔴 KEEP

| Dosya:Satır | İçerik | Neden |
| --- | --- | --- |
| `src/app/api/calendar/feed/[token]/route.ts:37` | `UID:${opts.uid}@odi.pet` | **iCal UID.** Değişirse takvim istemcileri tüm etkinlikleri YENİ sayar → mevcut abonelerde kopya etkinlik patlaması |
| `src/app/api/calendar/feed/[token]/route.ts:216` | `PRODID:-//Odi Pet Care//Calendar Feed//TR` | iCal üretici kimliği — istemci uyumluluğu |
| `src/app/api/calendar/feed/[token]/route.ts:219` | `X-WR-CALNAME:ODI Pet Care` | **REVIEW** — takvim uygulamasında görünen ad (kullanıcı-facing) ama abonelik üstverisi |

### 3.4 Build / proje yapılandırması — 🔴 KEEP

| Dosya:Satır | İçerik | Neden |
| --- | --- | --- |
| `tsconfig.json:46` | `"exclude": [..., "Odi.Pet"]` | **Dosya yolu deseni** — iç içe `Odi.Pet/` klasörünü derlemeden dışlıyor. Marka değil. |
| `supabase/config.toml:5` | `project_id = "Odi.Pet"` | **Local Supabase proje ayırt edicisi.** Değişirse local Docker container/volume adları değişir → local geliştirme veritabanı kaybolur. |
| `supabase/.temp/linked-project.json:1` | `"name":"Odi Pet"` | **Supabase CLI tarafından üretilir.** Elle düzenlenmez, sunucudan gelir. |
| `supabase/config.toml:186` | `rp_display_name = "Odi.Pet"` | **REVIEW** — WebAuthn Relying Party görünen adı; passkey isteminde kullanıcıya görünür. Spec gereği `rp_id` (satır 187 = `localhost`) kimlik bilgisini bağlar, `rp_display_name` yalnızca gösterimdir → değiştirmek mevcut passkey'leri geçersiz kılmaz, ama kullanıcı istemi metnini değiştirir. |

### 3.5 Kod yorumları / dosya başlıkları — KEEP (düşük öncelik)

| Konum | Adet | Karar |
| --- | --- | --- |
| `src/lib/content/**` JSDoc başlıkları (`* Odi.Pet — ...`) | ~22 | **KEEP** — kullanıcıya görünmez; değiştirmek 22 dosyada gereksiz diff üretir |
| `src/lib/content/__tests__/**` başlıkları | ~16 | **KEEP** | 
| `src/lib/{agents,nutrition,pets,tasks,modules}/**` başlıkları | ~8 | **KEEP** |
| `src/types/index.ts:3`, `src/app/globals.css:226` | 2 | **KEEP** |
| `supabase/migrations/**` SQL başlık yorumları | ~17 | 🔴 **KEEP** — **uygulanmış migration dosyaları asla düzenlenmez** |
| `supabase/audits/*.sql` | 1 | **KEEP** |
| `scripts/**` | 61 | **KEEP** — geliştirici araçları |
| `docs/**` + kök `*.md` raporlar | ~200 | **KEEP** — tarihsel kayıt; geçmişe dönük düzenlenmez |

### 3.6 Test açıklamaları — KEEP

| Dosya | Neden |
| --- | --- |
| `e2e/auth_onboarding.spec.ts:21`, `dashboard.spec.ts:27`, `growth_nutrition.spec.ts:25`, `health_care.spec.ts:25`, `pet_profile.spec.ts:25`, `sequential_e2e_audit.spec.ts:18`, `mobile-login.spec.ts:10`, `tests/ux-persona-flow.spec.ts:9` | `test.describe()` başlıkları — yalnızca rapor etiketi, hiçbir şeyi kırmaz. Değiştirmek isteğe bağlı, faydası yok. |
| `e2e/subscription-payment.spec.ts:33` | 🔴 **İSTİSNA** — bu bir açıklama değil, **assertion**. Bkz. 0.2 |

---

## ÖZET TABLO

| Kategori | Yaklaşık adet | Varsayılan karar |
| --- | --- | --- |
| **1 — User-facing brand** | ~45 satır / ~30 dosya | **CHANGE** (7 tanesi REVIEW) |
| **2 — Legal / corporate** | ~200 satır (194'ü illüstrasyon üstverisi) | **KEEP** — hukuki onay gerekir |
| **3 — Technical / domain / email / code** | ~530 satır | 🔴 **KEEP** — kesinlikle dokunulmaz |

---

## ATOMİK GRUPLAR (birlikte değişmeli, yoksa bozulur)

**Grup A — PWA kimliği**
`public/manifest.json:2,3` + `src/app/layout.tsx:27` + `PwaEnforcer.tsx:205` + `useWebPush.ts:52` + `NotificationsClient.tsx:104`
> Manifest adı ile "sistem ayarlarında şu adı ara" yönergeleri **aynı anda** değişmeli, yoksa kullanıcıya yanlış talimat verilir.

**Grup B — Service worker**
`src/sw.ts:107,111` → `npm run build` → `public/sw.js:3316,3318`
> Kaynak değişirse derlenmiş çıktı yeniden üretilmeli.

**Grup C — Abonelik sayfası + E2E**
`subscription/page.tsx:259` + `e2e/subscription-payment.spec.ts:33`
> Aynı commit'te.

**Grup D — Legal metadata + gövde**
`legal/kvkk/page.tsx:4,5` + gövde · `legal/terms/page.tsx:4,5` + gövde
> Metadata ile sözleşme gövdesi çelişemez.

**Grup E — İllüstrasyon lisansı**
194 × `illustration.json` `copyright`/`license`
> Ya hepsi ya hiçbiri; tek hukuki karar.

---

## ÖNERİLEN KARAR SIRASI

1. **Marka `Odi` mi, ticari ünvan hâlâ `Odi.Pet` mi?**
   Ayrıysa → Kategori 2 tamamen KEEP, yalnızca Kategori 1 değişir. **Bu en olası ve en düşük riskli senaryo.**
2. **PWA kurulu kullanıcı tabanı var mı?**
   Varsa → Grup A'yı ertele veya sürüm notuyla duyur.
3. **Kategori 1'de yalnızca "salt kopya" alt kümesiyle başla** (1.2, 1.3, 1.5, 1.6) — bunlar geri alınabilir ve düşük riskli.
4. Grup A/B/C/D'yi ayrı, etiketli commit'lerde yap.
5. Kategori 3'e **hiçbir koşulda** toplu find-replace uygulama.

> ⚠️ **Bu iş bir `sed -i` / global find-replace ile yapılamaz.** 783 eşleşmenin ~%68'i (Kategori 3) değişirse domain, e-posta teslimatı, takvim abonelikleri, güvenlik testleri ve local Supabase ortamı bozulur.

---

**NO FILES MODIFIED — READ-ONLY AUDIT COMPLETE**
