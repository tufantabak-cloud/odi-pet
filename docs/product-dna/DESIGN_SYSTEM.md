# Odi Pet - Empirical Design System Analysis

> **Doküman Tipi:** Forensic Design System Audit & Token Map  
> **Sürüm:** 2.0 (Forensic Audit Certified)  
> **Kaynak Kod Doğrulaması:** `tailwind.config.ts`, `src/app/globals.css`, `docs/opos-design-system/`  
> **Kanıt Seviyesi Etiketleri:** `CONFIRMED`, `HIGH CONFIDENCE`, `INFERRED`, `CONTRADICTED`

---

## 1. Visual Hierarchy & Color System

### 1.1 Brand Palette Tokens
Empirik olarak `tailwind.config.ts` ve `src/app/globals.css` dosyalarında aşağıdaki renk değerleri dondurulmuştur:

| Token Adı | HEX Değeri | Kullanım Alanı | Kanıt Derecesi & Dosya Yolu |
| :--- | :--- | :--- | :--- |
| `--color-primary` / `brand.purple` | `#9C26AF` | Ana marka rengi, birincil butonlar, aktif sekmeler | `CONFIRMED` — `tailwind.config.ts:12`, `globals.css:8` |
| `--color-primary-dark` / `brand.purple-dark` | `#6A189A` | Koyu menekşe vurgular, alt başlıklar | `CONFIRMED` — `tailwind.config.ts:13`, `globals.css:235` |
| `--color-primary-hover` | `#B239C4` | Buton hover durumları | `CONFIRMED` — `globals.css:9` |
| `--color-primary-soft` | `#F2E8FA` | Yumuşak mor rozet arka planları, kart hafif dolgusu | `CONFIRMED` — `globals.css:10` |
| `--color-bg-main` | `#F7F8FC` | Uygulama genel arka planı | `CONFIRMED` — `globals.css:19` |
| `--color-surface` | `#FFFFFF` | Camlaşma kart yüzeyleri | `CONFIRMED` — `globals.css:20` |
| `--color-border-main` / `--color-border` | `#E9ECF1` | Kart ve girdi alan sınır çizgileri | `CONFIRMED` — `globals.css:21` |
| `--color-text-primary` | `#1F2937` | Ana metin rengi (Dark Gray) | `CONFIRMED` — `globals.css:23` |
| `--color-text-secondary` | `#6B7280` | Yardımcı ve ikincil metinler | `CONFIRMED` — `globals.css:24` |
| `--color-text-tertiary` / `muted` | `#9CA3AF` | Pasif metin ve ikonlar | `CONFIRMED` — `globals.css:25` |

### 1.2 Pet Care Domain Soft Tint Triples
Pet bakım modüllerini görsel olarak ayırmak için `tailwind.config.ts` ve `globals.css` içinde özel semantik renkler tanımlanmıştır:

- **Vaccine (Aşı):** Blue `#3B82F6` / Soft `#EFF6FF` (`cat-vaccine`) (`CONFIRMED`)
- **Parasite (Parazit):** Green `#22C55E` / Soft `#ECFDF5` (`cat-parasite`) (`CONFIRMED`)
- **Care (Bakım & Grooming):** Pink `#EC4899` / Soft `#FDF2F8` (`cat-care`) (`CONFIRMED`)
- **Nutrition (Beslenme):** Gold/Amber `#F59E0B` / Soft `#FFFBEB` (`cat-nutrition`) (`CONFIRMED`)
- **Hygiene (Temizlik):** Teal `#0D9488` / Soft `#F0FDFA` (`cat-hygiene`) (`CONFIRMED`)
- **Activity (Etkinlik):** Purple `#9C26AF` / Soft `#F2EEFF` (`cat-activity`) (`CONFIRMED`)
- **Health (Medikal/Hastalık):** Red `#EF4444` / Soft `#FEF0F1` (`cat-health`) (`CONFIRMED`)
- **Vet (Veteriner):** Indigo `#4F46E5` / Soft `#EEF2FF` (`cat-vet`) (`CONFIRMED`)

---

## 2. Typography System (OPOS v2.0 Standard)

### 2.1 Font Family Chain
- **Primary Font:** `Plus Jakarta Sans Variable` (`@fontsource-variable/plus-jakarta-sans`)
- **CSS Variable:** `--font-sans: "Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;` (`globals.css:38`)
- **Kanıt Seviyesi:** `CONFIRMED` — Inter, Montserrat, Poppins gibi fontlar KESİNLİKLE KULLANILMAMAKTADIR.

### 2.2 Numerical & Semantic Scale
Kod tabanında hem sayısal Tailwind ölçeği hem de semantik rol tabanlı tipografi ölçeği bir arada tanımlanmıştır:

```css
/* Sayısal Ölçek (globals.css:41-49) */
--text-2xs: 10px;  --text-xs: 12px;   --text-sm: 14px;
--text-base: 16px; --text-lg: 18px;   --text-xl: 20px;
--text-2xl: 24px;  --text-3xl: 30px;  --text-4xl: 36px;

/* Semantik Rol Ölçeği (globals.css:60-102) */
--text-display: 32px (line-height: 1.15);
--text-h1: 24px (line-height: 1.2);
--text-h2: 20px (line-height: 1.25);
--text-h3: 18px (line-height: 1.3);
--text-h4: 16px (line-height: 1.35);
--text-body-lg: 16px;
--text-body: 14px;
--text-input: 16px;
--text-label: 13px;
--text-button: 15px;
--text-caption: 12px;
--text-micro: 11px; /* Spec 11px'e text-xs diyordu; Tailwind text-xs (12px) ile çakışmayı önlemek için text-micro yapıldı */
```
- **Çelişki / İstisna Notu (`CONTRADICTED`):** OPOS `03_typography.md` dokümanında 11px boyutu `text-xs` olarak adlandırılmıştı. Kod katmanında Tailwind'in yerleşik 12px `text-xs` kuralını kırmamak için 11px token'ı `--text-micro` olarak adlandırılmıştır (`globals.css:58`).

---

## 3. Corner Radius Architecture

Dokümantasyondaki "Tüm kartlar 24px olmalıdır" kuralı ile kod katmanındaki dondurulmuş gerçeklik arasında bilinçli bir ayrışma tespiti yapılmıştır:

| Bileşen Tipi | Kod Katmanı Token Değeri | Tailwind / CSS Sınıfı | Kanıt & Durum |
| :--- | :--- | :--- | :--- |
| **Kartlar (Standard Cards)** | `16px` (`--radius-card`) | `.card-base`, `rounded-card` | `CONFIRMED` — `globals.css:28` |
| **Pet Hero Card (Profil Kapak)** | `20px` (`--radius-lg`) | `rounded-2xl` / `rounded-lg` | `CONFIRMED` — `globals.css:28, 288` |
| **Butonlar (Buttons)** | `18px` (`--radius-btn`) | `.btn-primary`, `rounded-btn` | `CONFIRMED` — `globals.css:29` |
| **Input Alanları (Inputs)** | `12px` (`--radius-input`) | `.input-base`, `rounded-input` | `CONFIRMED` — `globals.css:30` |
| **Modallar (Dialogs)** | `28px` (`--radius-modal`) | `rounded-modal` | `CONFIRMED` — `globals.css:31` |
| **Bottom Sheets** | `24px` (`--radius-sheet`) | `rounded-t-[24px]` / `rounded-sheet` | `CONFIRMED` — `globals.css:32` |
| **Rozetler & Çipler** | `999px` (`--radius-chip`) | `rounded-full` | `CONFIRMED` — `globals.css:33` |

> ⚠️ **FORENSIC AUDIT BULGUSU:** AGENTS.md genel kural metnindeki "Kartlar 24px (`rounded-3xl`) olmalıdır" maddesi, `globals.css` içinde `--radius-card: 16px` ve `docs/opos-design-system/12_cards.md` içindeki OPGlassCard tanımıyla çelişmektedir. Kod katmanında uygulanan **16px kart radius'u** geçerli standarttır (`CONFIRMED`).

---

## 4. Elevation, Glassmorphism & Shadow Stack

### 4.1 Glassmorphic Tonal Layers
Uygulamada derinlik simsiyah keskin gölgelerle değil, camlaşma (Glassmorphic Blur) ve yayvan yumuşak tonlar ile elde edilir:
```css
/* Card Base Glassmorphic Styling (globals.css:151-153) */
.card-base {
  @apply bg-surface/90 backdrop-blur-xl rounded-card shadow-soft border border-white 
         hover:shadow-medium hover:border-primary/10 transition-all duration-500;
}
```

### 4.2 Shadow Token Scale
- `--shadow-soft`: `0 4px 20px -2px rgba(15, 23, 42, 0.04)` (`globals.css:35`) — Kart varsayılan gölgesi.
- `--shadow-medium`: `0 12px 32px -4px rgba(15, 23, 42, 0.08)` (`globals.css:36`) — Kart hover ve floating eleman gölgesi.
- `--shadow-sm`: `0 1px 2px rgba(16, 24, 40, 0.04)` (`globals.css:291`)
- `--shadow-md`: `0 6px 18px rgba(16, 24, 40, 0.07)` (`globals.css:292`)
- `--shadow-floating`: `0 12px 32px rgba(16, 24, 40, 0.14)` (`globals.css:293`) — FAB ve Modallar.

---

## 5. Buttons, Inputs & Micro-Interactions

### 5.1 Button System
```css
/* Primary Button (globals.css:137-139) */
.btn-primary {
  @apply bg-primary text-white rounded-btn px-7 py-3 font-semibold 
         hover:bg-primary-hover hover:shadow-[0_8px_16px_rgba(156,38,175,0.25)] 
         transition-all duration-300 flex justify-center items-center 
         active:scale-[0.98] cursor-pointer;
}
```
- **Dokunsal Basılma Hissi (Tactile Press):** `active:scale-[0.98]` zorunlu mikrometre kuralıdır (`CONFIRMED`).
- **Yumuşak Büyüme (Hover Lift):** Kartlarda `hover:scale-[1.02]` veya `hover:scale-[1.05]` (`CONFIRMED`).

### 5.2 Form Inputs
```css
/* Input Base (globals.css:145-148) */
.input-base {
  @apply bg-surface/80 backdrop-blur-sm border border-border-main shadow-[0_2px_10px_rgba(0,0,0,0.02)] 
         rounded-input px-5 py-3.5 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 
         hover:border-[#CBD5E1] transition-all duration-300 text-text-primary placeholder:text-text-secondary/60;
  font-size: 16px;
}
```

---

## 6. Icons, Illustrations & AI Indicators

### 6.1 Lucide Rounded Outline Standard
- **Resmi Kütüphane:** `lucide-react`
- **İkon Formatı:** Rounded Outline (Stroke width: `2px`). Dolu (filled) ikon kullanımı yasaktır (`CONFIRMED`).
- **İnsani İkon Yasaktır:** Aktivite için tenis raketi veya beslenme için insan bifteği KESİNLİKLE KULLANILMAZ; pet odaklı ikonlar (mama kabı, kemik, kedi kumu küreği) kullanılır (`CONFIRMED`).

### 6.2 AI Visual Indicator Standard (Mor Yıldız / Sparkles)
- Yapay zeka tarafından üretilen tüm içerik ve araçlarda Mor Yıldız (`Sparkles`) ikonu ve mor görsel tema (`text-purple-600`, `bg-purple-50`, `border-purple-200`) zorunludur (`AGENTS.md` Cilt 13).
- **Kanıt Derecesi:** `CONFIRMED` — `src/app/owner/ai-vet/page.tsx`, `src/components/ui/SmartScanner.tsx`

---

## 7. Confidence Rating Summary Matrix

| Tasarım Sistemi Alanı | Antigravity Kanıt Derecesi | Doğrulama Kaynağı |
| :--- | :--- | :--- |
| **Marka Renk Paleti (#9C26AF)** | `CONFIRMED` | `tailwind.config.ts`, `globals.css` |
| **Font Family (Plus Jakarta Sans)** | `CONFIRMED` | `globals.css:38` |
| **Kart Radius (16px)** | `CONFIRMED` | `globals.css:28` (Spec divergence noted) |
| **Tactile Press (active:scale-[0.98])** | `CONFIRMED` | `globals.css:138` |
| **Camlaşma (backdrop-blur-xl)** | `CONFIRMED` | `globals.css:152` |
| **Lucide Rounded Outline İkonlar** | `CONFIRMED` | `src/components/icons/PetIcons.tsx` |
| **Mor Yıldız AI Göstergesi (Sparkles)** | `CONFIRMED` | `src/app/owner/ai-vet/page.tsx` |
