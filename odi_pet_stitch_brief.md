# Odi.Pet — Google Stitch Redesign Brief
**Tam Uygulama Röntgeni: Ekranlar, Akışlar, Renkler, Butonlar**

---

## 1. GENEL BAKIŞ

**Ürün:** Odi.Pet — Evcil hayvan sahipleri için cross-platform (Web + PWA) sağlık ve yaşam yönetim ekosistemi.

**Framework:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Supabase (auth + DB)

**Dil:** Türkçe (UI) — İngilizce (kod)

**Platform hedefi:** Mobile-first (375px+), masaüstünde de çalışır. Bottom nav ile mobil navigasyon, side nav masaüstünde gösterilir.

---

## 2. MOBİL / PWA MİMARİSİ — KRİTİK DETAYLAR

### 2.1 Platform Hedefi

Odi.Pet **önce mobil, sonra masaüstü** yaklaşımıyla tasarlanmıştır. Uygulama bir **Progressive Web App (PWA)** olarak çalışır — iPhone ve Android'de "Ana Ekrana Ekle" ile tam native uygulama hissi verir.

```
Minimum viewport:     375px (iPhone SE)
Tasarım referans:     390px (iPhone 14)
Masaüstü breakpoint:  md (768px) ve lg (1024px+)
Max içerik genişliği: 1440px (masaüstü)
```

### 2.2 PWA Manifest Değerleri

```json
{
  "name": "Odi.Pet",
  "short_name": "Odi.Pet",
  "description": "Evcil hayvanlarınızın tüm sağlık, bakım ve aktivite süreçlerini şifresiz ve güvenli şekilde takip edin.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

`display: standalone` → tarayıcı UI'ı gizlenir, tam ekran uygulama deneyimi verir.

### 2.3 Viewport & Head Meta

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes">
<!-- Input alanlarında zoom engeli: font-size: 16px (iOS zoom tetiklemez) -->
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
```

### 2.4 Servis Worker (Serwist v9.5)

- **Çevrimdışı destek:** SW önbelleğe alır, internet yokken son görülen ekranlar açılır
- `/offline` sayfası: internet yok uyarısı + yerel önbellek gösterimi
- Cache stratejisi: statik asset'ler (fonts, ikonlar) kalıcı; API yanıtları kısa süreli

### 2.5 İki Farklı Navigasyon Yapısı

| Ekran | Navigasyon | Davranış |
|-------|-----------|----------|
| Mobil (< md = 768px) | **Bottom Navigation Bar** | Sabit, ekranın altında, z-index: 9999 |
| Masaüstü (≥ md) | **Sol Sidebar (SideNav)** | Sabit sol panel, içerik sağa kayar |

**Bottom Nav yüksekliği:** `pt-2 pb-5` = yaklaşık 72px  
**İçerik alt padding:** `pb-32` (128px) mobilde → bottom nav'ın üstüne gelmesin  
**Masaüstünde:** `pb-10` (40px) yeterli

### 2.6 Sticky Header (Tüm Owner Sayfaları)

```
Yükseklik:    h-16 = 64px
Arka plan:    bg-surface/80 + backdrop-blur-lg (cam efekti)
Border alt:   border-b border-border-main
Position:     sticky top-0 z-40
Padding:      px-5 (mobil) / px-10 (lg+)

Sol:  Odi.Pet logosu (40×40px, rounded-xl) + "Odi.Pet" metni (sm'de görünür)
Sağ:  [Kayıp Pet Uyarısı] + [Bildirim Zili] + [Avatar/Profil Linki]
```

Avatar: 44×44px, rounded-full, primary-soft bg, kullanıcı baş harfi (primary rengi)

### 2.7 Safe Area & Notch Desteği

Bottom navigation bar `pb-5` ile iOS home indicator güvenli alanını kapsar.  
Tüm ekranlarda `min-h-dvh` (dynamic viewport height) kullanılır → iOS Safari adres çubuğu kayması engellenir.

```css
.min-h-dvh { min-height: 100dvh; }  /* iOS Safari'de adres çubuğu sorunu çözülür */
```

### 2.8 Dokunma Etkileşimleri

```
Tüm tıklanabilir öğeler:  min 44×44px (Apple HIG standardı)
Aktif feedback:            active:scale-[0.97] veya active:scale-[0.98]
Hover:                     hover:scale-[1.05] (sadece masaüstü görünür)
Tap highlight:             -webkit-tap-highlight-color: transparent
Scroll:                    scroll-snap (pet slider) — snap-x mandatory
Swipe desteği:             Yatay kaydırma (overflow-x-auto scrollbar-none)
```

### 2.9 Mobil Bottom Navigation — Tam Detay

```
Arka plan:      bg-surface (beyaz)
Border üst:     border-t border-border-main/80
Shadow:         0 -4px 24px rgba(0,0,0,0.03)
Height:         pt-2 pb-5
Grid:           4 kolon eşit genişlik
Maks genişlik:  max-w-lg mx-auto içinde

Tab 1 — Anasayfa:    /owner/dashboard   | Ev SVG ikonu
Tab 2 — + FAB:       action menu açar   | 52×52px siyah daire, beyaz +
Tab 3 — Hizmetler:   /owner/services    | Pet pati ikonu
Tab 4 — Sosyal:      /owner/social      | Grup kişi ikonu

Aktif renk:    #E05397 (pembe-magenta)  + scale-105
Pasif renk:    #8E8E93 (sistem gri)
Label:         11px, font-semibold (aktif/pasif aynı rengi alır)

FAB (+ butonu):
  - Yükseltilmiş: -translate-y-3 (12px yukarı çıkıntı)
  - Açık: 135° rotate animasyonu
  - Kapalı → Açık: blur backdrop + slide-in-from-bottom menü öğeleri
  - Menü öğesi: beyaz pill, shadow-xl, slide-in 50ms stagger
```

### 2.10 Masaüstü Sol Sidebar — Tam Detay

```
Genişlik:   w-64 (256px)
Position:   sticky (scroll ile kayar)
Ayrılık:    border-r border-border-main

Birincil menü öğeleri:
  - Anasayfa    /owner/dashboard
  - AI VET      /owner/ai-vet
  - Hizmetler   /owner/services
  - Sosyal      /owner/social

Kısa yol öğeleri:
  - Veteriner Bul   /owner/vets
  - Tarayıcı        /owner/scanner

Alt bölüm:
  - Profil linki
  - Bildirimler

Aktif öğe:    bg-primary-soft text-primary font-bold, sol border primary
```

### 2.11 Bildirim Sistemi (Push Notifications)

- Web Push API ile anlık bildirimler (aşı, ilaç, görev hatırlatmaları)
- `PushNotificationPrompt` bileşeni: izin isteği, bell ikonu
- `NotificationBell`: header'da okunmamış sayı badge (kırmızı)
- `/owner/notifications` sayfası: tüm bildirimler listesi, "Tümünü Okundu İşaretle"

### 2.12 Kamera & Cihaz API Erişimleri

```
Kamera:     getUserMedia (belge tarama, QR okuma, avatar fotoğraf)
GPS:        navigator.geolocation (yakın vet bul, kayıp ihbar konum)
Biyometrik: WebAuthn API (passkey ile şifresiz giriş)
Clipboard:  navigator.clipboard (paylaşım linki kopyalama)

Permissions-Policy headers:
  camera=(self), microphone=(), geolocation=(self)
```

### 2.13 Responsive İçerik Layoutu

```
Mobil (< sm = 640px):
  - Tek kolon
  - Tam genişlik kartlar
  - px-4 kenar boşluğu
  - Pet slider: yatay scroll, snap-mandatory

Tablet (sm–md = 640–768px):
  - Bazı grid'ler 2'ye çıkar (sm:grid-cols-2)
  - px-6 kenar boşluğu

Masaüstü (lg = 1024px+):
  - İçerik max-w alanında ortalanır
  - Sidebar + main 2 kolonlu layout
  - px-10 kenar boşluğu
  - Hizmetler grid'i: md:grid-cols-2
```

### 2.14 Modal & Bottom Sheet Davranışı

Tüm modaller (QuickUpdateModal, SmartTaskWizard, vb.) responsive'dir:

```
Mobil:      fixed inset-0 → items-end justify-center → sayfa ALTINDAN KAYAR
            (native iOS sheet hissi)
Masaüstü:   sm:items-center → ekranın ortasında

Bottom sheet özellikleri:
  - backdrop: bg-black/50 + backdrop-blur-sm
  - Kart:     max-w-sm, rounded-[28px], shadow-2xl
  - Animasyon: animate-fade-in
  - Dışına tıklama: modal kapanır
```

### 2.15 Scroll Davranışları

```
Pet Slider:        scroll-snap-type: x mandatory | snap-start her kart
Scrollbar gizleme: scrollbar-none (webkit + standard)
Premium scrollbar: 5px genişlik, #E2E8F0 renk, transparent track
İçerik scroll:     body scroll (mobil) / main alan scroll (masaüstü)
```

### 2.16 Klavye & Input Davranışı (iOS/Android)

```
Tüm inputlarda font-size: 16px → iOS otomatik zoom engellenir
Input focus: kenar rengi primary/50 + ring-4 ring-primary/10
Keyboard açıldığında modal: fixed positioning korunur (scroll olmaz)
Date/time input: native HTML date picker (tüm platformlarda çalışır)
```

---

## 3. RENK PALETİ (Tam Token Listesi)

```
Ana Renkler
──────────────────────────────────────────────
--color-primary:         #4F2DBA   (mor-indigo — marka ana rengi)
--color-primary-hover:   #3C2096   (koyu mor — hover state)
--color-primary-soft:    #F5F3FF   (açık lavanta — soft bg)

Durum Renkleri
──────────────────────────────────────────────
--color-success:         #22C55E   (yeşil)
--color-warning:         #FACC15   (sarı)
--color-error:           #EF4444   (kırmızı)

Zemin & Yüzey
──────────────────────────────────────────────
--color-bg-main:         #F8FAFC   (ana sayfa arka planı)
--color-surface:         #FFFFFF   (kart/panel yüzeyi)
--color-border-main:     #F1F5F9   (kenar çizgisi)

Metin
──────────────────────────────────────────────
--color-text-primary:    #0F172A   (koyu lacivert — başlık metni)
--color-text-secondary:  #64748B   (orta gri — yardımcı metin)

Body gradient:
  radial-gradient(100% 100% at 50% 0%, rgba(79,45,186,0.03) 0%, #F8FAFC 50%)
  background-attachment: fixed
```

### Modüle Özel Renk Kodları
| Modül          | Renk Skalası               | Hex Aralığı              |
|----------------|----------------------------|--------------------------|
| Grooming/Bakım | Pembe → Fuşya              | pink-100 → fuchsia-50    |
| Hijyen         | Turkuaz → Zümrüt           | teal-100 → emerald-50    |
| Aktivite       | Yeşil → Limon              | green-100 → lime-50      |
| Sağlık/Medikal | Kırmızı → Gül              | red-100 → rose-50        |
| Aşı            | Mavi → Gökyüzü             | blue-100 → sky-50        |
| Veteriner      | Mor → İndigo               | purple-100 → indigo-50   |
| Beslenme       | Turuncu → Amber            | orange-100 → amber-50    |
| Diğer          | Gri → Slate                | gray-100 → slate-50      |
| SOS/Acil       | Kırmızı (pulse animasyon)  | #EF4444                  |
| Premium/Pro    | Amber/Altın                | amber-400                |

---

## 3. TİPOGRAFİ

- **Font:** Inter (variable font, Google Fonts)
- **Başlık büyük:** 28–36px, font-extrabold (800), tracking-tight
- **Başlık orta:** 18–24px, font-extrabold
- **Başlık küçük:** 15–17px, font-bold
- **Etiket/Seksyon başlığı:** 12px, font-black (900), uppercase, tracking-widest
- **Gövde metni:** 14–15px, font-medium
- **Küçük metin/badge:** 11–13px, font-bold
- **Input font-size:** 16px (zoom engellemek için)

---

## 4. BORDER RADIUS & GÖLGE SİSTEMİ

```
--radius-card:  20px   (kartlar)
--radius-btn:   14px   (butonlar)
--radius-input: 12px   (inputlar)

Modal/Bottom Sheet: 28px
Büyük hero kart:    24px
Pill/Badge:         9999px (rounded-full)
İkon kutusu:        12–16px

--shadow-soft:   0 4px 20px -2px rgba(15,23,42,0.04)
--shadow-medium: 0 12px 32px -4px rgba(15,23,42,0.08)
Modal shadow:    shadow-2xl
Hover btn:       0 8px 16px rgba(79,45,186,0.2)
```

---

## 5. BUTON & BİLEŞEN KÜTÜPHANESİ

### Butonlar
```
.btn-primary
  bg: #4F2DBA | text: white
  border-radius: 14px | px: 28px | py: 12px
  font: semibold
  hover: bg #3C2096 + shadow (0 8px 16px rgba(79,45,186,0.2))
  active: scale(0.98)

.btn-secondary
  bg: white | text: #0F172A | border: #F1F5F9
  border-radius: 14px
  hover: border primary/30 + bg #F5F3FF + text #4F2DBA
  shadow-sm

Tehlike butonu:
  bg: transparent | text: #EF4444
  hover: bg error/5
  
İptal butonu:
  border-2 #F1F5F9 | text: #64748B
  border-radius: 12px
```

### Input
```
.input-base
  bg: white/80 + backdrop-blur-sm
  border: #F1F5F9 | border-radius: 12px
  px: 20px | py: 14px
  focus: border primary/50 + ring-4 ring-primary/10
  hover: border #CBD5E1
  font-size: 16px (mobil zoom engeli)
  placeholder: #64748B/60
```

### Kartlar
```
.card-base
  bg: white/90 + backdrop-blur-xl
  border-radius: 20px
  border: white
  shadow: shadow-soft
  hover: shadow-medium + border primary/10
  transition: 500ms
```

### Badge'ler
```
.badge-success  → bg success/10  | text success  | rounded-full | 13px | font-bold
.badge-warning  → bg warning/10  | text warning
.badge-error    → bg error/10    | text error
.badge-primary  → bg primary-soft | text primary
```

---

## 6. ANİMASYON SİSTEMİ

```
@keyframes fadeInUp   → opacity 0→1, translateY 12px→0 (0.4s ease)
@keyframes scaleIn    → opacity 0→1, scale 0.95→1 (0.2s ease)
@keyframes shakeIn    → translateX ±4px (0.5s ease — hata durumu)

Hover mikro: scale-[1.05] veya scale-[1.1] + transition 300ms
Active tap:  scale-[0.97] veya scale-[0.98]
Stagger:     .stagger-children → nth-child(1..5) × 50ms delay
```

---

## 7. UYGULAMA HARİTASI (Route Yapısı)

```
/ (Landing)
├── /login
├── /register
├── /reset-password
├── /update-password
├── /beta  (Beta kayıt formu)
├── /invite/[token]  (Davet kabul)
├── /caregiver/[token]  (Bakıcı erişimi)
├── /legal/terms
├── /legal/kvkk
├── /offline

/owner  (Auth gerektiren ana alan)
├── /dashboard  ←── ANA EKRAN
├── /pets
│   ├── /add  (Pet ekleme wizard)
│   ├── /add/success
│   └── /[id]  (Pet Detay)
│       ├── (tabs: Sağlık, Aşı, Bakım, Beslenme, Hijyen, Aktivite, Veteriner, Diğer)
│       ├── /edit
│       ├── /care
│       ├── /nutrition
│       ├── /treatments
│       ├── /journal
│       │   ├── /new
│       │   └── /new/[category]
│       ├── /share
│       └── /
├── /ai-vet  (Yapay zeka veteriner)
├── /vets  (Yakın veteriner bul)
├── /services  (Hizmetler & rezervasyon)
├── /social  (Sosyal — yakında)
├── /scanner  (QR/Belge tarayıcı)
├── /reports/[id]/print
├── /journal/select-pet
├── /notifications
└── /profile
    ├── /edit
    ├── /subscription
    ├── /appearance
    ├── /unit-preferences
    ├── /feeding-templates
    └── /task-settings

/clinic  (Veteriner kliniği paneli)
├── /register
└── /(protected)
    ├── /dashboard
    ├── /pets
    ├── /pets/[id]
    ├── /appointments
    ├── /care-plans
    └── /notifications

/admin  (Platform yönetim paneli)
├── /  (Dashboard)
├── /users
├── /users/[id]
├── /pets
├── /clinics
├── /ai-vet
├── /intelligence
├── /outreach
└── /settings
```

---

## 8. EKRAN DETAYLARI

---

### 8.1 LOGIN EKRANI  `/login`

**Bileşenler:**
- Logo (üstte merkez)
- Başlık: "Tekrar Hoş Geldiniz" / "Merhaba"
- **E-posta input** (input-base)
- **Şifre input** + göster/gizle toggle (Eye/EyeOff ikonları)
- **Giriş Yap** butonu (btn-primary, full-width)
- **Google ile devam et** (btn-secondary, Google ikonu)
- **Apple ile devam et** (btn-secondary, Apple ikonu)
- **Biyometrik Giriş** bileşeni (passkey destekli cihazlarda)
- Link: "Şifremi Unuttum" → /reset-password
- Link: "Hesabın yok mu? Kayıt Ol" → /register
- Cloudflare Turnstile CAPTCHA (bot koruması)

**Özel Davranışlar:**
- Hatalı giriş sonrası lockout timer (countdown)
- Biyometrik giriş (WebAuthn/Passkey)
- URL'den `?message`, `?reason`, `?error` parametre okuma

---

### 8.2 KAYIT EKRANI  `/register`

**Bileşenler:**
- Ad, Soyad inputları
- E-posta input
- Şifre input (güç göstergesi)
- **Kayıt Ol** butonu (btn-primary)
- **Google ile kayıt** (btn-secondary)
- KVKK onay checkbox
- Link: "Zaten hesabın var mı? Giriş Yap"

---

### 8.3 ONBOARDİNG WİZARD (Modal — İlk Girişte)

**3 Adımlı Wizard:**
- **Adım 1:** "Ne yapıyor?" — Uygulama tanıtımı
- **Adım 2:** "Can Dostu Ekle" — Yönlendirme
- **Adım 3:** "İlk kurulum" — Demo mod seçeneği

**Butonlar:**
- "Başla" (btn-primary) → /owner/pets/add
- "Demo Modu Dene" (btn-secondary)

**Progress:** Adım numaralı stepper (primary dot + gri dot + çizgi)

---

### 8.4 PET EKLEME WİZARDI  `/owner/pets/add`

**Çok adımlı form:**

**Adım 1 — Tür Seçimi**
- 2 büyük kart: **Kedi** (mor/lavanta gradyan) | **Köpek** (amber/turuncu gradyan)
- Her kart: 3D SVG avatar + tür adı + slogan
- Geri butonu (← dairesel)

**Adım 2 — Temel Bilgiler**
- Ad input (zorunlu)
- Doğum tarihi (date picker)
- Irk seçimi (dropdown — kedi için 16, köpek için 19 ırk seçeneği)
- Cinsiyet seçimi (Erkek / Dişi / Bilinmiyor) — pill butonlar
- Avatar upload (fotoğraf yükleme)

**Adım 3 — Ek Bilgiler**
- Kısırlaştırıldı mı? (toggle)
- Chip/Mikroçip no (opsiyonel)
- Vet bilgisi (opsiyonel)

**Butonlar:**
- "Devam Et →" (btn-primary)
- "← Geri" (btn-secondary)
- "Kaydet & Tamamla" (btn-primary, son adımda)

**Başarı Sayfası** `/owner/pets/add/success`
- Konfeti animasyonu
- "Pet Profiline Git" (btn-primary)
- "Ana Sayfaya Dön" (btn-secondary)

---

### 8.5 ANA SAYFA (DASHBOARD)  `/owner/dashboard`

**Yapı (yukarıdan aşağıya):**

**1. Selamlama Bölümü**
- "Merhaba, [İsim]" (28–32px, extrabold)
- Alt metin: "Petlerinizin günlük özeti aşağıda."

**2. Pet Slider (Yatay Kaydırılabilir)**
- Başlık: "Petlerim" + "**+ Pet Ekle**" butonu (primary, 12px)
- Her pet kartı (200×200px, snap-scroll):
  - Kare fotoğraf (object-cover, hover scale-105)
  - Gradient overlay (siyah alt kenar)
  - İsim + tür + yaş (beyaz metin, fotoğraf üzerinde)
  - Gecikmiş görev sayısı badge (kırmızı)
- Fotoğraf yoksa: SVG 3D avatar (kedi/köpek)

**3. Smart Cards (Akıllı Hatırlatma Kartları)**
- Dinamik kartlar (parazit, beslenme vb. duruma göre)
- Dismiss (✕) butonu
- CTA butonu (btn-primary)

**4. Pet Günlüğü Quick Action**
- Kart: "Yeni Durum Kaydet" + alt metin
- **Kaydet +** butonu (btn-primary, sağda)
- "Tümünü Gör" link (primary, sağ üst)

**5. Yaklaşan Etkinlikler (Timeline)**
- Başlık: takvim ikonu (warning/10 bg) + "Yaklaşan Etkinlikler"
- Liste öğesi: tarih kutusu (gün/ay) + görev adı + pet adı + durum badge
- Badge renkleri:
  - Bugün → warning
  - Yarın → primary
  - Gecikmiş → error (pulse animasyon)
  - 3+ gün → success
- Tıklanabilir → `/owner/pets/[id]#pet-tasks`

---

### 8.6 PET DETAY SAYFASI  `/owner/pets/[id]`

**Header Bölümü:**
- Geri butonu (←)
- Pet fotoğrafı (büyük, hero)
- İsim + tür + ırk + yaş
- Sağlık skoru (0–100, progress ring)
- Hızlı eylem butonları (ikonlu):
  - 🤖 "AI Vet'e Sor" → /owner/ai-vet?petId=...
  - ✏️ "Düzenle" → /owner/pets/[id]/edit
  - 📤 "Paylaş"

**Profil Tamamlama (Enrich Panel)**
- Açılır/kapanır chevron paneli
- Eksik alanlar chip butonlar: "Fotoğraf Ekle", "Irk Bilgisi Gir", "Veteriner Bilgisi Gir", "İlk Aşısını Gir", "Kimlik & Çip Bilgisi", "Kilo & Boy Bilgisi Gir", "Kullandığı Mamayı Ekle", "SOS Ağı Kur"

**Görev Sekme Menüsü (8 Tab):**
| Tab | DB Kategorisi | Renk | İkon |
|-----|--------------|------|------|
| Sağlık | Saglik | Kırmızı/Gül | FirstAidIcon |
| Aşı | Medikal | Mavi/Gökyüzü | VaccineIcon |
| Bakım | Bakım | Pembe/Fuşya | ShampooIcon |
| Beslenme | Beslenme | Turuncu/Amber | BowlIcon |
| Hijyen | Hijyen | Teal/Zümrüt | ScoopIcon |
| Aktivite | Aktiviteler | Yeşil/Limon | BoneIcon |
| Veteriner | Veteriner | Mor/İndigo | CarrierIcon |
| Diğer | Diger | Gri/Slate | HouseIcon |

**Her Tab İçeriği:**
- Planlanmış görevler listesi
- Tamamlanmış görevler listesi (toggle ile açılır)
- Alt kategori filtre chip'leri
- CTA banner: "[Kategori] Görevi Planla" (btn-primary)

**Görev Kart Aksiyonları (⋮ menü):**
- ✓ Tamamlandı İşaretle (success rengi)
- 📅 1 Gün Ertele (primary rengi)
- ✏️ Düzenle (primary rengi)
- ❌ Sil (error rengi)

**Ek Sekmeler (Alt Navigasyon):**
- **Aile** → FamilyTab (bakıcı/ortak sahip davet)
- **Raporlar** → ReportsTab (PDF çıktı)
- **Galeri** → GalleryTab (fotoğraf albümü)
- **Eşleşme** → MatchTab (üreme/adoption)
- **Bütçe** → BudgetTab (harcama takibi)
- **Sahiplendirme** → AdoptionTab

**Floating Butonlar:**
- 🆘 **SOS Butonu** (sağ alt, kırmızı, pulse animasyon)
  - Açıldığında panel: Vet Ara, WhatsApp SOS, Kayıp İhbarı
- Kayıp Uyarısı (aktif kayıp raporu varsa)

---

### 8.7 SMART TASK WIZARD (Modal)

**4 Adımlı Görev Oluşturucu:**

**Adım 1 — Kategori Seç (CategoryGrid)**
- 8 kategorili grid (2×4 veya 4×2)
- Her hücre: gradyan bg + ikon + kategori adı
- Seçili: primary border + ölçek efekti

**Adım 2 — Alt Kategori (SubCategoryChips)**
- Kategori bazlı chip listesi
- Bazı alt kategoriler özel picker açar:
  - "Aşı" → Aşı Seçici Sheet (vaccine catalog)
  - "İç Parazit", "Dış Parazit" → Parazit seçici

**Adım 3 — Aşı/Parazit Seçici (VaccineSelectorSheet, opsiyonel)**
- Ülke bazlı aşı kataloğu
- Chip seçimi

**Adım 4 — Görev Formu (TaskFormAdvanced)**
- Tarih picker
- Saat picker
- Frekans: Bir kez / Günlük / Haftalık / Aylık / 3 Aylık / 6 Aylık / Yıllık
- Tekrarlama bitiş: Hiç / Tarihte / X kez sonra
- Bildirim açık/kapalı + kaç dk önce
- Notlar textarea
- **"Görevi Kaydet"** (btn-primary)
- **"İptal"** (btn-secondary)

---

### 8.8 BAKIM MODÜLÜ  `/owner/pets/[id]/care`

**Tabs:**
- **Günlük Görevler** | **Planı Düzenle**

**Bakım Rutinleri:**
| Rutin | Varsayılan Frekans |
|-------|--------------------|
| Tüy Tarama | Günlük |
| Tırnak Kesimi | Aylık |
| Banyo | Aylık |
| Kulak Temizliği | Haftalık |
| Diş Fırçalama | Haftalık |
| Göz Temizliği | Günlük |

**Butonlar:**
- Her rutin için: "✓ Tamamlandı" (success)
- "Planı Kaydet" (btn-primary)
- "Değiştir" (btn-secondary)

---

### 8.9 BESLENME MODÜLÜ  `/owner/pets/[id]/nutrition`

**Tabs:**
- **Mama & Stok** | **Öğünler & Hatırlatıcı** | **Kilo Takibi**

**Mama & Stok Tab:**
- Stok göstergesi (renk: yeşil/turuncu/kırmızı)
- "X gün kaldı" badge
- Mama markası input
- Ürün adı input
- Mama tipi (kuru/yaş/karma)
- Günlük gram input
- Stok gram input
- **"Kaydet"** (btn-primary)
- QR Scanner butonu (mama barkodu tarama)

**Öğünler Tab:**
- Öğün saati, miktar (gram), iştah skoru (1–5) form
- Son öğün listesi (tarih/saat/gram)
- **"Öğün Ekle"** (btn-primary)

**Kilo Takibi Tab:**
- Kilo (kg) + Boy (cm) form
- Mini çizgi grafik (son 15 kayıt)
- **"Kilo Ekle"** (btn-primary)

---

### 8.10 TEDAVILER / SAĞLIK GEÇMİŞİ  `/owner/pets/[id]/treatments`

- Hastalık geçmişi listesi
- Alerji listesi
- İlaç takibi
- Her öğe: tanı tarihi + açıklama + düzenle/sil butonları
- **"+ Yeni Ekle"** butonları (her seksiyon)

---

### 8.11 PET GÜNLÜĞÜ  `/owner/pets/[id]/journal`

**Üst Bar:**
- ← Geri | "Pet Günlüğü" başlık | **"+ Yeni Kayıt"** (btn-primary)

**AI Durum Özeti Paneli:**
- Gradient bg (f8f9fc → f1f4f9), primary/10 border
- "✨ AI Durum Özeti" başlığı
- **"Özet Oluştur"** butonu → AI özeti üretir

**Filtre Chips:**
- Tümü | Sağlık | İştah | Ruh Hali | Beslenme | Aktivite | Not

**Timeline Öğesi Türleri:**
| Tür | İkon | Başlık Formatı |
|-----|------|---------------|
| Aşı | 💉 | "Aşı: [adı] tamamlandı" |
| İştah | 🥣 | "İştah: [seviye]" |
| Ruh hali | 🎭 | "Ruh Hali: [durum]" |
| Beslenme | 🥩 | "Beslenme: [marka] [miktar]" |
| Aktivite | 🎾 | "Aktivite: [tür] ([süre])" |
| Not | 📝 | "Not eklendi" |

---

### 8.12 YENİ GÜNLÜK KAYDI  `/owner/pets/[id]/journal/new`

**Kategori Seçim Ekranı:**
- İştah | Ruh Hali | Beslenme | Aktivite | Not
- Renkli kartlar, büyük ikonlar

**Form Ekranı (Kategori bazlı):**
- İştah: seviye seçimi (Çok Az / Az / Normal / İyi / Çok İyi)
- Ruh Hali: durum seçimi (Mutsuz / Sakin / Normal / Enerjik / Çok Mutlu)
- Beslenme: marka + ürün + miktar
- Aktivite: tür + süre
- Not: serbest metin
- **"Kaydet"** (btn-primary)

---

### 8.13 AI VET EKRANI  `/owner/ai-vet`

**Üst Alan:**
- Pet seçici (horizontal scroll — pet avatarları)
- Bağlam göstergesi: hangi pet seçili

**Sohbet Arayüzü:**
- Kullanıcı mesaj balonu (sağ, primary bg)
- AI yanıt balonu (sol, beyaz)
- Her AI yanıtında:
  - Yanıt metni
  - Şiddet badge: 🚨 Kritik (error) | ⚠️ Orta Risk (warning) | ✅ Düşük Risk (success)
  - Risk skoru (0–100)
  - "Powered by [model]" label

**Şiddet Konfigürasyonu:**
- critical → "Kritik" | text-error | bg error/10
- medium → "Orta Risk" | text-warning | bg warning/10
- low → "Düşük Risk" | text-success | bg success/10

**Alt Input:**
- Serbest metin input
- Gönder butonu (primary)
- Hızlı soru chip'leri (opsiyonel)

**Uyarı Kartı:**
- Üstte: "Bu bir AI asistanıdır, veterinerin yerini tutmaz" disclaimer

---

### 8.14 YAKINDAKI VETERİNERLER  `/owner/vets`

- Şehir/ilçe dropdown filtresi
- Konum izni isteği → GPS bazlı mesafe hesaplama (Haversine formula)
- Klinik listesi:
  - İsim + adres + mesafe (km)
  - Onaylı klinik badge (is_verified)
  - Rating yıldızları + yorum sayısı
  - Açık/Kapalı badge (open_now)
  - Google Maps linki
- Harita butonları
- **"Randevu Al"** CTA (her klinikte)

---

### 8.15 AKILLI TARAYICI  `/owner/scanner`

**İşlevler:**
- QR kodu okuma (pet paylaşım kartı)
- Belge tarama (aşı karnesi, veteriner belgesi)
- Barkod okuma (mama paketi — beslenme modülü için)

**UI:**
- Kamera önizleme
- Çerçeve (tarama alanı)
- "Taramayı Başlat" butonu
- Pet seçici (hangi pet için taranıyor)
- Sonuç kartı + "Kaydet" / "Tekrar Tara" butonları

---

### 8.16 HİZMETLER  `/owner/services`

**Hero Başlık:**
- Gradient üst çizgi (pink → primary → violet)
- "Hizmetler & Rezervasyon" + "✨ Çok Yakında" badge

**Aktif Hizmetler:**
- Sigorta Widget'ı (ServicesInsuranceWrapper)

**Gelecek Hizmet Kategorileri (Grid):**
| Hizmet | İkon | Renk | Durum |
|--------|------|------|-------|
| Kuaför & Bakım | ✂️ | Pembe/Gül | Son Fazda |
| Pansiyon & Otel | 🏨 | Violet/Mor | Son Fazda |
| Dog Walker | 🦮 | Amber/Turuncu | Son Fazda |
| Eğitmen & Davranış | 🎓 | Mavi/İndigo | Son Fazda |
| Premium Petshop | 🛍️ | Zümrüt/Teal | Son Fazda |
| Bakıcı | 🏠 | Cyan/Gökyüzü | Çok Yakında |
| Pet Fotoğrafçısı | 📸 | Fuşya/Pembe | Çok Yakında |

---

### 8.17 SOSYAL  `/owner/social`

**Coming Soon Ekranı:**
- Hero: gradient çizgi + animasyonlu emoji (🎈 bounce)
- "Odi.Pet Sosyal Dünyası" başlığı
- "📣 Sonraki Fazlar" badge

**Planlanan Özellik Kartları (3 kolon):**
- 🐾 Playdate Bulucu
- 💬 Can Dostu Forumları
- 🏆 Etkinlikler

---

### 8.18 PROFİL MENÜSÜ  `/owner/profile`

**Header Bölümü:**
- Mor gradient arka plan (üst %30)
- Avatar daire (kullanıcı baş harfi, 96px)
- PRO/FREE badge (sağ alt köşe — amber/gri)
- İsim + e-posta
- Plan badge: "Odi Free / Pro / AI+" + yeşil pulse dot

**Profil Tamamlama Çubuğu:**
- Progress bar (primary rengi)
- Yüzde göstergesi
- Eksik görevler listesi (chip butonlar ile tamamlama yönlendirmesi)

**Menü Seksiyonları (uppercase etiket + kart liste):**

1. **Abonelik Yönetimi**
   - Plan adı + açıklama
   - "Planı Yükselt" butonu (btn-primary, Free için) / "Planı Yönet" (btn-secondary, Pro için)
   - "Fatura Geçmişi" (btn-secondary)
   - "Aboneliği İptal Et" (error metin, sadece premium)

2. **Can Dostlarım**
   - Her pet: avatar + isim + tür + yaş chip
   - PetCardActions (paylaş, görüntüle)

3. **Ödeme Geçmişi**
   - Son 5 ödeme listesi

4. **Uygulama Ayarları**
   - Görev Ayarları → /owner/profile/task-settings
   - Beslenme Şablonları → /owner/profile/feeding-templates
   - Görünüm → /owner/profile/appearance
   - Birim Tercihleri → /owner/profile/unit-preferences

5. **Veri & Güvenlik** (premium)
   - Profili Düzenle → /owner/profile/edit
   - Biyometrik Giriş (BiometricSettingsRow)

6. **Destek Merkezi**
   - Yardım linkleri

7. **Alt:**
   - "Çıkış Yap" butonu (error rengi, full-width)
   - Footer linkleri: Kullanım Koşulları | KVKK | Lisanslar

---

### 8.19 PET DÜZENLEME  `/owner/pets/[id]/edit`

**Seksiyonlar:**
- `#temel-section` — Ad, tür, ırk, doğum tarihi, cinsiyet, avatar
- `#veteriner-section` — Vet adı, klinik, telefon, mikroçip no
- `#sos-section` — SOS acil kontaklar (isim + telefon, birden fazla)

---

### 8.20 BOTTOM NAVİGASYON (Mobil — Sabit, z:9999)

**4 Tab + 1 Aksiyon Butonu:**
| # | İkon | Label | Route |
|---|------|-------|-------|
| 1 | Ev ikonu | Anasayfa | /owner/dashboard |
| 2 | **+ Siyah Yuvarlak Buton** | — | Action Menu |
| 3 | Pet ikonu | Hizmetler | /owner/services |
| 4 | Grup ikonu | Sosyal | /owner/social |

**Aktif Tab:** text-[#E05397] (pembe-magenta) + scale-105
**Pasif Tab:** text-[#8E8E93]

**+ Buton (FAB):**
- 52×52px, siyah yuvarlak, beyaz + ikonu
- Basıldığında 135° döner (kapanış animasyonu)
- Açılan menü (overlay, blur bg):
  - Akıllı Tarama → /owner/scanner
  - Rapor Paylaş
  - Yeni Görev Planla
  - Sağlık Kaydı / Aşı
  - Kilo Güncelle
  - Yeni Can Dostu Ekle → /owner/pets/add

---

### 8.21 SOS BUTONU (Floating, tüm pet sayfalarında)

- Sağ alt köşe, sabit
- Kırmızı yuvarlak, pulse animasyonu
- Açıldığında kartlar:
  - **Veteriner Ara** (tel: link)
  - **WhatsApp SOS** (wa.me/ linki, otomatik mesaj)
  - **Yakın Vet Bul** (GPS → Google Maps)
  - **Kayıp İhbarı** (LostPetWizard modal açar)
  - Aktif kayıp raporu varsa: "Kaybolan [Pet Adı]" banner

---

## 9. VERİTABANI / VERİ MODELİ ÖZETİ

**Ana Tablolar:**

| Tablo | Açıklama |
|-------|----------|
| profiles | Kullanıcı profilleri (ad, soyad, rol, plan) |
| pets | Pet profilleri (tür, ırk, doğum, cinsiyet, avatar, chip) |
| health_schedules | Görev/hatırlatma kayıtları (aşı, ilaç, bakım vb.) |
| vaccines | Aşı kataloğu |
| health_diseases | Hastalık geçmişi |
| health_allergies | Alerji kayıtları |
| health_medications | İlaç takibi |
| weight_logs | Kilo/boy geçmişi |
| nutrition_logs | Beslenme günlüğü |
| pet_journal_entries | Günlük durum kayıtları |
| appointments | Veteriner randevuları |
| payments | Ödeme geçmişi |
| user_subscriptions | Abonelik bilgisi (free/pro/ai_plus) |
| clinics | Veteriner klinikleri |
| lost_reports | Kayıp hayvan raporları |
| passkeys | WebAuthn passkey'leri |
| care_plan_events | Bakım rutini tamamlama logları |

---

## 10. ABONELIK KATMANLARI

| Katman | Görünen Ad | Badge Rengi |
|--------|-----------|-------------|
| free | Odi Free | gri |
| pro | Odi Pro | amber (altın) |
| ai_plus | Odi AI+ | amber (altın) |

---

## 11. YAŞ GRUBU STANDARDI

| Grup | Aralık | Label |
|------|--------|-------|
| Yavru | 0–1 yaş | Puppy / Kitten |
| Yetişkin | 1–7 yaş | Adult |
| Yaşlı | 7–12 yaş | Senior |
| Çok Yaşlı | 12+ yaş | Senior 12+ |

---

## 12. KLİNİK PORTALI  `/clinic`

**Kayıt:** `/clinic/register` — Klinik başvuru formu

**Dashboard:** `/clinic/(protected)/dashboard`
- İstatistik kartları (toplam hasta, randevu, bekleyen)
- Son aktiviteler

**Menü:**
- Hasta Listesi (tüm petler)
- Hasta Detayı (evcil hayvan tam profili)
- Randevular
- Bakım Planları
- Bildirimler

---

## 13. ADMİN PANELİ  `/admin`

**Erişim:** `role = 'admin'` veya `role = 'founder'`

**Menü:**
- Dashboard (metrikler, KPI'lar)
- Kullanıcılar (liste + detay + rol değiştir + sil)
- Petler (liste + sil)
- Klinikler (onay/red/askıya al)
- AI Vet Logları
- Intelligence (analitik)
- Outreach (pazarlama)
- Ayarlar

---

## 14. ÖZEL BİLEŞENLER

| Bileşen | Açıklama |
|---------|----------|
| SmartTaskWizard | 4 adımlı görev oluşturucu modal |
| SmartScanner | QR/barkod/belge tarayıcı |
| LostPetWizard | Kayıp ihbar akışı |
| MinimalGrowthChart | Kilo/boy trend grafiği |
| BreedHealthCard | Irka özgü sağlık bilgisi kartı |
| HumanAgeCalculator | Pet → insan yaşı hesaplama |
| CoachMark | Tooltip/ipucu bileşeni (ilk kullanım rehberi) |
| OnboardingWizard | İlk giriş rehber modal |
| InsuranceWidget | Sigorta durumu kartı |
| FloatingSOS | SOS acil panel (floating) |
| FloatingLostPets | Kayıp pet uyarı bandı |
| NotificationBell | Bildirim ikonu (header) |
| BiometricLogin | WebAuthn passkey giriş |
| PushNotificationPrompt | Bildirim izni isteği |
| EmptyState | Boş sayfa görseli + CTA |
| ConfirmModal | Onay/silme dialog'u |

---

## 15. MOBİL TASARIM KONTROL LİSTESİ (Stitch'e Vurgu)

Stitch ile tasarım yaparken aşağıdaki mobil kurallar **kesinlikle** uygulanmalıdır:

| Kural | Detay |
|-------|-------|
| ✅ Touch target min boyutu | 44×44px (Apple HIG) |
| ✅ Bottom navigation | Sabit alt bar, safe area padding |
| ✅ Modal = Bottom Sheet | Mobilde aşağıdan kayar, masaüstünde ortada |
| ✅ Input font-size | 16px (iOS zoom tetiklemez) |
| ✅ Scroll snap | Pet slider yatay snap-scroll |
| ✅ Viewport height | `100dvh` (iOS Safari adres çubuğu sorunu yok) |
| ✅ Offline sayfası | Çevrimdışı durumda kullanıcıya ekran gösterilir |
| ✅ Blur header | `backdrop-blur-lg` — cam efekti, scroll'da içerik geçer |
| ✅ Active feedback | Tüm butonlarda `scale(0.97)` dokunma geri bildirimi |
| ✅ Swipe navigation | Yatay kaydırma öğeleri (pet slider) parmaklı kullanım için |
| ✅ PWA "Add to Home Screen" | Manifest + SW = native uygulama hissi |
| ✅ Push Notification | Web Push API ile hatırlatıcılar |
| ✅ Kamera erişimi | QR / belge tarama / avatar fotoğraf |
| ✅ GPS erişimi | Yakın vet bul, kayıp ihbar |
| ✅ Biyometrik giriş | WebAuthn passkey (Face ID / parmak izi) |
| ✅ Pb-32 içerik padding | Bottom nav'ın altında kaybolmaz |

---

## 16. GOOGLE STİTCH İÇİN HAZIR PROMPT ÖNERİSİ

Aşağıdaki bilgileri Stitch'e verirken kullanabilirsiniz:

```
Uygulama Adı: Odi.Pet
Platform: Mobile-first Progressive Web App (PWA) + Responsive Web
  - Öncelikli viewport: 375–390px (iPhone SE / iPhone 14)
  - PWA: display:standalone, servis worker, offline destek
  - Ana Ekrana Ekle özelliği (iOS + Android)
  - Navigasyon: mobilde BOTTOM BAR, masaüstünde SOL SİDEBAR
  - Modal'lar mobilde alt kenardan kayar (bottom sheet)
  - Tüm touch target'lar min 44×44px
  - Input font-size 16px (iOS zoom engeli)
  - Push notification desteği (aşı/görev hatırlatmaları)
  - Kamera (QR + belge tarama), GPS (vet bul), WebAuthn (biyometrik) API'leri
Dil: Türkçe

Marka Rengi: #4F2DBA (primary indigo-mor)
Yüzey: Beyaz (#FFFFFF), Arka Plan: #F8FAFC
Metin: #0F172A (başlık), #64748B (ikincil)
Durum: Yeşil #22C55E, Sarı #FACC15, Kırmızı #EF4444

Border-radius: Kart 20px, Buton 14px, Input 12px
Font: Inter
Gölge: yumuşak (0 4px 20px rgba(15,23,42,0.04))

UI Felsefesi:
- Minimalist premium tasarım
- Yarı-3D SVG ikonlar (insan ikonu yasak — paw, kase, kemik, şampuan vb.)
- Micro-animasyonlar: hover scale 1.05, active scale 0.97
- Her modülün kendi renk kimliği var (Bakım=pembe, Hijyen=teal, Aktivite=yeşil vb.)

Kullanıcı Yolculuğu:
Login → Onboarding → Dashboard → Pet Kart → 8 Modül Tab → Görev Wizard
```

---

*Son güncelleme: 2026-06-06 | Odi.Pet v1.x*
