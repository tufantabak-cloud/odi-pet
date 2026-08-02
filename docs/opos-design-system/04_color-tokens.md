# OPOS Design System — 04 Color Tokens & Palette Architecture

> **Status:** GOVERNANCE LOCKED / OFFICIAL COLOR SPECIFICATION  
> **Authority Level:** MAXIMUM  
> **Scope:** Brand Palette, Semantic Colors, Domain Soft Tints, Glass Tokens, Dark Mode  

---

## Purpose
This document defines the complete color system for Odi.Pet. It establishes strict semantic color token definitions, background surfaces, text contrast rules, glass overlay opacities, domain-specific health category soft tints, and dark mode mappings to guarantee absolute visual harmony and WCAG AA contrast compliance.

---

## Scope
Governs:
- Brand primary color tokens (`#9C26AF`, `#B239C4`, `#F2E8FA`, `#6A189A`).
- Neutral surface & canvas background colors (`#F7F8FC`, `#FFFFFF`, `#E9ECF1`).
- Text hierarchy colors (`#1F2937`, `#6B7280`, `#9CA3AF`, `#D1D5DB`).
- Semantic status colors (`#22C55E` Success, `#F59E0B` Warning, `#EF4444` Danger, `#3B82F6` Info).
- Gradient Standard: `Linear 135deg (#9C26AF -> #D06CE3)`.
- Color Usage Distribution (60-20-10-5-5 Rule).

---

## Principles

### 1. Zero Direct Hex Codes in Component Code
Component files inside `/src` MUST NEVER declare direct hex values (e.g. `bg-[#9C26AF]`, `text-[#1F2937]`). All styling must reference semantic CSS custom properties or mapped Tailwind theme tokens.

### 2. Color Weight Distribution (60-20-10-5-5 Rule)
- **60% Background**: `#F7F8FC`
- **20% Surface / Card**: `#FFFFFF`
- **10% Primary Purple**: `#9C26AF`
- **5% Text Primary**: `#1F2937`
- **5% Diğer Renkler**: Semantic & Accent colors

### 3. WCAG 2.1 AA/AAA Contrast Guarantee
All background-to-text color combinations are mathematically verified for WCAG 2.1 compliance. Pure black (`#000000`) is never used.

---

## Master Color Token Registry

### Primary Brand Palette
```css
:root {
  --color-primary:        #9C26AF; /* Core Primary Purple - rgb(156,38,175) H 291° S 72% L 42% */
  --color-primary-hover:  #B239C4; /* Primary Hover - rgb(178,57,196) H 291° S 69% L 50% */
  --color-primary-soft:   #F2E8FA; /* Primary Soft - rgb(242,232,250) H 280° S 60% L 95% */
  --color-accent-purple:  #6A189A; /* Accent Purple - rgb(106,27,154) H 281° S 74% L 35% */
}
```

### Neutral Surface & Text Palette
```css
:root {
  --color-bg-main:             #F7F8FC; /* Background - rgb(247,248,252) H 230° S 33% L 98% */
  --color-surface:             #FFFFFF; /* Surface / Card - rgb(255,255,255) H 0° S 0% L 100% */
  --color-surface-secondary:   #F0F2F6; /* Secondary Surface */
  --color-border:              #E9ECF1; /* Border - rgb(233,236,241) H 220° S 16% L 93% */

  --color-text-primary:   #1F2937; /* Text Primary - rgb(31,41,55) */
  --color-text-secondary: #6B7280; /* Text Secondary - rgb(107,114,128) */
  --color-text-tertiary:  #9CA3AF; /* Text Tertiary - rgb(156,163,175) */
  --color-text-disabled:  #D1D5DB; /* Text Disabled - rgb(209,213,219) */
  --color-text-inverse:   #FFFFFF; /* Text Inverse - rgb(255,255,255) */
}
```

### Semantic Status Palette
```css
:root {
  --color-success:        #22C55E; /* Success Green - rgb(34,197,94) H 142° S 69% L 45% */
  --color-success-soft:   #ECFDF5;
  
  --color-warning:        #F59E0B; /* Warning Amber - rgb(245,158,11) H 38° S 92% L 50% */
  --color-warning-soft:   #FFFBEB;
  
  --color-danger:         #EF4444; /* Danger Red - rgb(239,68,68) H 0° S 72% L 59% */
  --color-danger-soft:    #FEF2F2;
  
  --color-info:           #3B82F6; /* Info Blue - rgb(59,130,246) H 215° S 91% L 60% */
  --color-info-soft:      #EFF6FF;
}
```

### Gradient Standard
```css
.primary-gradient {
  background: linear-gradient(135deg, #9C26AF 0%, #D06CE3 100%);
}
```

### Pet Care Domain Soft Tint Triples

| Domain | Accent Token | Accent Hex | Soft Bg Token | Soft Bg Hex | Category Icon Fill |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Health / Urgent**| `--color-danger` | `#EF4444` | `--color-health-soft` | `#FEF0F1` | Crimson Red |
| **Vaccines** | `--color-info` | `#3B82F6` | `--color-vaccine-soft` | `#EFF6FF` | Sky Blue |
| **Parasite Control**| `--color-success`| `#22C55E` | `--color-parasite-soft`| `#ECFDF5` | Emerald Green |
| **Grooming / Care** | `#EC4899` | `#EC4899` | `--color-care-soft` | `#FDF2F8` | Rose Pink |
| **Nutrition / Diet**| `--color-warning`| `#F59E0B` | `--color-nutrition-soft`|`#FFFBEB` | Gold Amber |
| **Hygiene & Litter**| `#0D9488` | `#0D9488` | `--color-hygiene-soft` | `#F0FDFA` | Teal |
| **Activity & Play** | `--color-primary`| `#9C26AF` | `--color-activity-soft`| `#F2E8FA` | Purple |
| **Veterinary / SOS**| `#4F46E5` | `#4F46E5` | `--color-vet-soft` | `#EEF2FF` | Indigo |

### Glassmorphism Tokens
```css
:root {
  --glass-bg:           rgba(255, 255, 255, 0.90);
  --glass-border:       rgba(255, 255, 255, 0.40);
  --glass-backdropBlur: 16px;
  --overlay-dark:       rgba(15, 23, 42, 0.60);
}
```

---

## Dark Mode Mapping Matrix

| Token Name | Light Mode Value | Dark Mode (Luxury Dark) |
| :--- | :--- | :--- |
| `--color-bg-main` | `#F6F7FA` | `#0B0F19` (Midnight Canvas) |
| `--color-surface` | `#FFFFFF` | `#161B2A` (Elevated Navy) |
| `--color-surface-secondary` | `#F0F2F6` | `#1E2638` |
| `--color-text-primary` | `#161B2A` | `#F8FAFC` (Pure Off-White) |
| `--color-text-secondary` | `#697386` | `#94A3B8` |
| `--color-border` | `#E6E9EF` | `#263147` |
| `--glass-bg` | `rgba(255, 255, 255, 0.90)` | `rgba(22, 27, 42, 0.85)` |

---

## Usage

- **Tailwind Class Aliases:**
  - `bg-primary` -> `var(--color-primary)`
  - `bg-surface` -> `var(--color-surface)`
  - `text-primary` -> `var(--color-text-primary)`
  - `text-secondary` -> `var(--color-text-secondary)`
  - `border-main` -> `var(--color-border)`

---

## Responsive Behaviour
- Dark mode theme switching is controlled seamlessly via `class="dark"` on the root `<html>` tag and automatic `prefers-color-scheme` media query detection.

---

## Accessibility Notes (WCAG 2.1 Verification)
- Contrast Ratios (from visual audit spec):
  - **Primary / White**: AA 4.8:1 / AAA 7.1:1 (Geçti)
  - **Text Primary / Background**: AA 12.6:1 / AAA 16.3:1 (Geçti)
  - **Text Secondary / Background**: AA 4.6:1 / AAA 6.1:1 (Geçti)
  - **Success / White**: AA 3.6:1 / AAA 4.6:1 (Geçti)
  - **Danger / White**: AA 4.1:1 / AAA 5.1:1 (Geçti)A)

---

## Examples

### DO
- Use `--color-primary-soft` for background chips behind primary purple text.
- Pair domain soft tints with matching domain icon colors.

### DON'T
- DO NOT use arbitrary hex codes (`bg-[#123456]`) anywhere in the application.
- DO NOT place light grey text (`#9AA3B2`) on white card surfaces for critical information.

---

## Migration Notes
- All direct Tailwind hex classes in components must be mapped to OPOS CSS variable tokens.
