# Odi Pet — OPOS Design System Reference v1.0

> **Sürüm:** 1.0.0-OPOS  
> **Konum:** `c:\Odi.Pet\docs\product-dna\claude-package\10_DESIGN_SYSTEM_REFERENCE.md`  
> **Kapsam:** Tipografi, Spacing Grid, Corner Radius, Renk Token'ları, İkonografi ve Animasyonlar  

---

## 1. OPOS Tipografi Standart Anayasası v2.0

### 1.1 Resmi Font Ailesi (Single Official Font)
- **Tek Resmi Font:** `Plus Jakarta Sans Variable` (`@fontsource-variable/plus-jakarta-sans`)
- **Fallback Zinciri:**
  ```css
  font-family: "Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  ```

> 🚫 **KESİN YASAK FONTLAR:** `Inter`, `Montserrat`, `Poppins`, `Open Sans`, `Nunito`, `Lato` KESİNLİKLE KULLANILAMAZ.

### 1.2 Font Ağırlıkları (Font Weight Standard)
- `400` (Regular): Body (Ana Metin)
- `500` (Medium): Secondary (İkincil Yardımcı Metin)
- `600` (SemiBold): Button / Card Title / Badges
- `700` (Bold): Section Header / H1 & H2 Sayfa Başlıkları
- `800` (ExtraBold): Hero Metric (Büyük KPI ve Skor Göstergeleri)
- 🚫 `900` (Black): Kullanılamaz.

### 1.3 Font Ölçeği (Token Tablosu)

| Token Name | Değer (px) | Tailwind Karşılığı | Kullanım Alanı |
| :--- | :--- | :--- | :--- |
| `--text-2xs` | `10px` | `text-[10px]` | Micro Label, Grafik Etiketleri |
| `--text-xs` | `12px` | `text-xs` | Rozetler (Badges), Caption |
| `--text-sm` | `14px` | `text-sm` | Yardımcı İkincil Metin |
| `--text-base` | `16px` | `text-base` | Ana Gövde Metni (Body Text) |
| `--text-lg` | `18px` | `text-lg` | Kart Başlıkları (Card Titles) |
| `--text-xl` | `20px` | `text-xl` | Bölüm Başlıkları (Section Header) |
| `--text-2xl` | `24px` | `text-2xl` | Sayfa Ana Başlığı (H1) |
| `--text-3xl` | `30px` | `text-3xl` | Hero Metric (Büyük Skorlar) |

> 🚫 **KESİN YASAK:** `text-[11px]`, `text-[13px]`, `text-[15px]`, `text-[22px]` gibi keyfi (arbitrary) boyutlar KESİNLİKLE YASAKTIR!

---

## 2. Spacing & Izgara Standardı (8pt Grid Rhythm)

Tüm mesafeler 8pt (0.5rem) baseline ızgarasına dayanır:

- `4px` (`p-1` / `space-0.5`): Micro Spacing (Rozet içi, ikon-yazı arası)
- `8px` (`p-2` / `space-1`): Compact Spacing (Buton içi padding)
- `12px` (`p-3` / `space-1.5`): Dense Spacing (Küçük kartlar)
- `16px` (`p-4` / `space-2`): Standard Card & Screen Margin
- `24px` (`p-6` / `space-3`): Container & Section Spacing
- `32px` (`p-8` / `space-4`): Major Section Spacing

> 🚫 **KESİN YASAK:** `p-[13px]`, `m-[17px]`, `gap-[21px]` gibi keyfi piksel değerleri KESİNLİKLE KULLANILAMAZ!

---

## 3. Köşe Yarımçapı Standardı (24px Corner Radius Rule)

- **Kartlar, Modallar & Container Kapsayıcılar:** **`24px`** (`rounded-3xl` veya `rounded-[24px]`)
- **Butonlar & Girdi Alanları (Input):** `16px` (`rounded-2xl`) veya `12px` (`rounded-xl`)
- **Rozetler (Badges) & Chips:** `8px` (`rounded-lg`) veya `rounded-full`
- **Bottom Sheet / Drawer Top Corners:** `28px` (`rounded-t-[28px]`)

> 🚫 **KESİN YASAK:** Dik keskin köşeler (`0px`) veya keyfi radius (`rounded-[17px]`) KESİNLİKLE YASAKTIR!

---

## 4. İkonografi ve Varlık Standartları

1. **Resmi Kütüphane:** Yalnızca **Lucide Rounded Outline** kütüphanesi kullanılır.
2. **Dolu (Filled) İkon Yasağı:** Filled ikonlar kesinlikle yasaktır, çizgisel (stroke: 2px) ikonlar standarttır.
3. **İnsani İkon Yasağı:** Tenis raketi (Aktivite), biftek eti (Beslenme) gibi insani ikonlar YASAKTIR. Bunların yerine evcil hayvan evrenine ait ikonlar (kemik, mama kabı, kedi kumu küreği, pet taşıma çantası) tercih edilmelidir.

---

## 5. Renk Paleti ve Modül Token'ları

| Modül | Ana Renk Tonu | Örnek Tailwind Class |
| :--- | :--- | :--- |
| **Grooming & Bakım** | Mor / Pink | `text-purple-600`, `bg-purple-50` |
| **Temizlik & Hijyen** | Teal / Turkuaz | `text-teal-600`, `bg-teal-50` |
| **Aktivite & Egzersiz** | Turuncu / Kırmızı | `text-orange-600`, `bg-orange-50` |
| **Medikal & Aşı** | Mavi / Kırmızı | `text-blue-600`, `bg-blue-50` |
| **Veteriner & Klinik** | Koyu Mor / Indigo | `text-indigo-700`, `bg-indigo-50` |
| **Beslenme & Stok** | Altın / Turuncu | `text-amber-600`, `bg-amber-50` |

---

## 6. Etkileşim & Animasyon Token'ları (Motion)

- **Basılma Hissi (Tactile Press):** Tüm tıklanabilir buton ve kartlarda `active:scale-[0.98]` zorunludur.
- **Yumuşak Yükselme (Hover Lift):** Kartlarda `hover:scale-[1.02]` veya `hover:scale-[1.05]` ile `transition-all duration-200 ease-out` kullanılır.
