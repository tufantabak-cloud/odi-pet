# Odi Pet - Reusable UI Component Catalog

> **Doküman Tipi:** UI Component & Design System Inventory  
> **Sürüm:** 2.0 (Forensic Audit Certified)  
> **Kapsam:** Primitive & Feature UI Components  
> **Kanıt Seviyesi Etiketleri:** `CONFIRMED`, `HIGH CONFIDENCE`, `INFERRED`

---

## 1. Core Primitives (`src/components/ui/primitives/`)

### CMP-PRI-001: Button (`Button.tsx`)
- **NAME:** `Button`
- **PATH:** `src/components/ui/primitives/Button.tsx`
- **PURPOSE:** Temel buton bileşeni. Form gönderimi, aksiyonlar ve yönlendirmeler için kullanılır.
- **PROPS:** `variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'`, `size?: 'sm' | 'md' | 'lg'`, `isLoading?: boolean`, `icon?: ReactNode`, `disabled?: boolean`, `children: ReactNode`.
- **STATES:** `default`, `hover`, `active` (`active:scale-[0.98]`), `disabled` (`opacity-50 cursor-not-allowed`), `loading` (Spinner gösterir).
- **VARIANTS:** Primary (`bg-primary text-white`), Secondary (`border border-border-main bg-surface`), Ghost, Danger (`bg-danger text-white`).
- **USED_BY:** Neredeyse tüm sayfalar (Login, Pet Add, Dashboard, Vaccines vb.).
- **DESIGN_TOKENS:** `--radius-btn` (18px), `font-semibold`, `transition-all duration-300`.
- **ACCESSIBILITY:** Native `<button>` öğesi, `disabled` niteliği, `aria-busy` durumu.
- **RESPONSIVE_BEHAVIOR:** Tam genişlik (`w-full`) veya içerik genişliği (`w-auto`).
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/components/ui/primitives/Button.tsx`

---

### CMP-PRI-002: GlassCard / Card (`GlassCard.tsx`, `globals.css`)
- **NAME:** `OPGlassCard` / `card-base`
- **PATH:** `src/components/ui/primitives/GlassCard.tsx`
- **PURPOSE:** Camlaşma (Glassmorphism) efektli, yumuşak gölgeli ana kapsayıcı kart bileşeni.
- **PROPS:** `children: ReactNode`, `className?: string`, `hoverEffect?: boolean`, `onClick?: () => void`.
- **STATES:** `default`, `hover` (`hover:shadow-medium hover:border-primary/10 transition-all duration-500`).
- **VARIANTS:** Standard Glass (`bg-surface/90 backdrop-blur-xl`), Solid Card.
- **USED_BY:** Dashboard Smart Cards, Pet Detail Cards, Vaccination Cards.
- **DESIGN_TOKENS:** `--radius-card` (16px), `--shadow-soft`, `border border-white`.
- **ACCESSIBILITY:** Tıklanabilir olduğunda `role="button"`, `tabIndex={0}`.
- **RESPONSIVE_BEHAVIOR:** Kapsayıcısına göre esnek genişlik.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/components/ui/primitives/GlassCard.tsx`, `globals.css` (line 151)

---

### CMP-PRI-003: Input (`Input.tsx`)
- **NAME:** `Input`
- **PATH:** `src/components/ui/primitives/Input.tsx`
- **PURPOSE:** Metin, e-posta, şifre ve sayı girdisi alanları.
- **PROPS:** `label?: string`, `error?: string`, `icon?: ReactNode`, `placeholder?: string`, `type?: string`.
- **STATES:** `default`, `focus` (`focus:border-primary/50 focus:ring-4 focus:ring-primary/10`), `error` (`border-error`), `disabled`.
- **VARIANTS:** Standard (`input-base`), Icon-prefixed Input.
- **USED_BY:** Formlar (Login, Register, Pet Add, Health Wizard).
- **DESIGN_TOKENS:** `--radius-input` (12px), `bg-surface/80 backdrop-blur-sm`, `text-[16px]`.
- **ACCESSIBILITY:** Label-input `htmlFor` eşleştirmesi, `aria-invalid`.
- **RESPONSIVE_BEHAVIOR:** Mobilde zoom'u önlemek için sabit 16px font büyüklüğü.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/components/ui/primitives/Input.tsx`

---

### CMP-PRI-004: Badge (`Badge.tsx`)
- **NAME:** `Badge`
- **PATH:** `src/components/ui/primitives/Badge.tsx`
- **PURPOSE:** Durum (Tamamlandı, Gecikti, Yaklaşıyor) ve kategori gösterge etiketi.
- **PROPS:** `variant: 'success' | 'warning' | 'error' | 'primary' | 'health'`, `children: ReactNode`.
- **STATES:** Static display.
- **VARIANTS:** `badge-success` (Yeşil), `badge-warning` (Sarı), `badge-error` (Kırmızı), `badge-primary` (Mor).
- **USED_BY:** Vaccine Records, Takvim Kartları, Estrus Status.
- **DESIGN_TOKENS:** `rounded-full`, `text-xs font-semibold tracking-wide`, `px-3 py-1.5`.
- **ACCESSIBILITY:** Yüksek renk kontrastı (WCAG AA).
- **RESPONSIVE_BEHAVIOR:** Küçük metin boyutu (12px), esnek genişlik.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/components/ui/primitives/Badge.tsx`, `globals.css`

---

## 2. Specialized Feature UI Components

### CMP-FEA-001: PetHeroCard (`PetHeroCard.tsx`)
- **NAME:** `PetHeroCard`
- **PATH:** `src/components/pets/PetHeroCard.tsx`
- **PURPOSE:** Pet Detay sayfasının üst kapak kartı (KİLİTLİ BÖLGE). Biyometrik özet ve profili düzenle butonunu içerir.
- **PROPS:** `pet: Pet`, `onEditClick: () => void`.
- **STATES:** Default view.
- **USED_BY:** `PetDetailClient.tsx`.
- **DESIGN_TOKENS:** `--radius-lg` (20px), Primary Purple Gradient, Soft Tonal Shadow.
- **ACCESSIBILITY:** Pet ismi `<h1>` etiketidir.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/components/pets/PetHeroCard.tsx`, `AGENTS.md` (Kilitli Bölge)

---

### CMP-FEA-002: SmartScanner (`SmartScanner.tsx`)
- **NAME:** `SmartScanner`
- **PATH:** `src/components/ui/SmartScanner.tsx`
- **PURPOSE:** Aşı karnesi ve tıbbi belge fotoğraflarını çekme ve OCR tespiti öncesi kırpma bileşeni.
- **PROPS:** `onCapture: (base64Image: string) => void`, `onClose: () => void`.
- **STATES:** `camera_active`, `photo_captured`, `cropping`, `uploading`.
- **USED_BY:** `VaccinesClient.tsx`, Journal Form.
- **DESIGN_TOKENS:** Dark overlay (`bg-black/80`), Glass controls.
- **ACCESSIBILITY:** Kamera izin istemi açık metni.
- **CURRENT ISSUES:** `h-[480px]` sabit yükseklik küçük cihazlarda taşma yapabilir (`bug_report_journal.md`).
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/components/ui/SmartScanner.tsx`

---

### CMP-FEA-003: StockTimeline (`StockTimeline.tsx`)
- **NAME:** `StockTimeline`
- **PATH:** `src/components/nutrition/StockTimeline.tsx`
- **PURPOSE:** Mama stoğunun kalan gün sayısını ve doluluk yüzdesini gösteren dinamik ilerleme çubuğu.
- **PROPS:** `assignment: PetFoodAssignment`, `remainingDays: number`.
- **STATES:** `normal` (Yeşil/Mavi), `low_stock` (Sarı/Kırmızı flaş).
- **USED_BY:** `NutritionClient.tsx`.
- **DESIGN_TOKENS:** `rounded-full` progress bar, Amber/Red warning tints.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/components/nutrition/StockTimeline.tsx`

---

### CMP-FEA-004: WeightGoalBand (`WeightGoalBand.tsx`)
- **NAME:** `WeightGoalBand`
- **PATH:** `src/components/pets/WeightGoalBand.tsx`
- **PURPOSE:** Petin mevcut kilosunu ideal kilo aralığı (Goal Band) ile karşılaştıran görsel skala.
- **PROPS:** `currentWeight: number`, `minIdeal: number`, `maxIdeal: number`, `species: string`.
- **STATES:** `underweight`, `ideal`, `overweight`.
- **USED_BY:** `WeightChangeChart.tsx`, `NutritionClient.tsx`, `PetDetailClient.tsx`.
- **DESIGN_TOKENS:** Glassmorphic gauge, Success green ideal zone.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/components/pets/WeightGoalBand.tsx`

---

### CMP-FEA-005: EstrusTracker (`EstrusTracker.tsx`)
- **NAME:** `EstrusTracker`
- **PATH:** `src/components/estrus-tracker/EstrusTracker.tsx`
- **PURPOSE:** Dişi evcil hayvanlarda kızgınlık dönemi takvimini ve tahmin kartını sunan ana modül bileşeni.
- **PROPS:** `petId: string`, `gender: string`, `isNeutered: boolean`.
- **STATES:** `loading`, `no_data`, `active_cycle`, `forecast_ready`.
- **USED_BY:** Pet Detay -> Ekstra Sekmesi.
- **DESIGN_TOKENS:** Soft Pink/Purple Tonal Gradients.
- **EVIDENCE & CONFIDENCE:** `CONFIRMED` — `src/components/estrus-tracker/EstrusTracker.tsx`
