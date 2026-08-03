# OPOS Design System — 03 Typography System & Type Hierarchy

> **Status:** GOVERNANCE LOCKED / OFFICIAL TYPOGRAPHY SPECIFICATION  
> **Authority Level:** MAXIMUM  
> **Scope:** Font Families, Scale, Weights, Line Heights, Letter Spacing, iOS Lock  

---

## Purpose
This document establishes the official typographic system for Odi.Pet. It defines exact font sizes, line heights, letter spacing, font weights, and hierarchy rules to deliver maximum legibility, elegant visual order, and 100% cross-platform consistency (iOS Safari, Android Chrome, Desktop Edge/Chrome).

---

## Scope
Governs:
- Primary and secondary font families (`Plus Jakarta Sans`, `Inter`).
- Full type scale (Display, H1-H4, Body, Labels, Captions).
- Strict 16px iOS input font lock (eliminates viewport auto-zoom bugs).
- Heading hierarchy, line heights, letter spacing (`tracking`).
- Font weights (Regular, Medium, Semibold, Bold).
- Responsive typography scaling logic across mobile, tablet, and desktop.

---

## Principles

### 1. Modern Geometric Sans-Serif Precision
Odi.Pet uses **Plus Jakarta Sans** (with **Inter** as fallback) to communicate modern, clean, and friendly luxury. System default fonts (Times New Roman, Arial, generic Roboto) are strictly forbidden.

### 2. 16px iOS Viewport Lock
All text input fields, textareas, and interactive select controls MUST enforce `font-size: 16px` (`1rem`) minimum. Values smaller than 16px on form inputs trigger forced iOS Safari canvas zooming, destroying responsive layout boundaries.

### 3. Strict Hierarchy & Rhythm
Text scales follow a harmonized modular ratio. Headings use tight line heights (`1.1` to `1.25`) with slight negative letter spacing (`-0.02em`), while body copy uses relaxed line heights (`1.5` to `1.6`) for high readability.

---

## Font Family Stack

```css
:root {
  --font-family: 'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

---

## Complete Typographic Scale & Specs

| Token / Class Name | Size (px / rem) | Weight | Line Height | Letter Spacing | Usage Context |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`text-display`** | `32px` (`2rem`) | Bold (`700`) | `1.15` (`37px`) | `-0.025em` | Hero titles, Splash screen headlines |
| **`text-h1`** | `24px` (`1.5rem`)| Bold (`700`) | `1.2` (`29px`) | `-0.02em` | Page main title (`<h1>`), Modal titles |
| **`text-h2`** | `20px` (`1.25rem`)| Semibold (`600`)| `1.25` (`25px`) | `-0.015em` | Section headers (`<h2>`), Card main titles |
| **`text-h3`** | `18px` (`1.125rem`)| Semibold (`600`)| `1.3` (`23px`) | `-0.01em` | Subsections (`<h3>`), Pet card names |
| **`text-h4`** | `16px` (`1rem`)| Semibold (`600`)| `1.35` (`22px`) | `0em` | Form section titles, List row titles |
| **`text-body-lg`** | `16px` (`1rem`) | Regular (`400`)/Medium (`500`) | `1.5` (`24px`) | `0em` | Primary body text, Lead paragraphs |
| **`text-body`** | `14px` (`0.875rem`)| Regular (`400`)/Medium (`500`) | `1.5` (`21px`) | `0em` | Standard body copy, Description text |
| **`text-input`** | `16px` (`1rem`)| Medium (`500`) | `1.5` (`24px`) | `0em` | **iOS Locked Input Text** |
| **`text-label`** | `13px` (`0.8125rem`)| Semibold (`600`)| `1.4` (`18px`) | `0.01em` | Form field labels, Button text (compact) |
| **`text-button`** | `15px` (`0.9375rem`)| Semibold (`600`)| `1.0` (`15px`) | `0.01em` | Standard OPButton text |
| **`text-caption`** | `12px` (`0.75rem`)| Medium (`500`) | `1.4` (`17px`) | `0.02em` | Timestamps, Footers, Sub-badges |
| **`text-micro`** | `11px` (`0.6875rem`)| Medium (`500`) | `1.3` (`14px`) | `0.02em` | Tiny status tags, Pill badges |

> **Adlandırma Notu (`text-micro`):** Bu token önceki sürümde `text-xs` adını
> taşıyordu. Tailwind CSS'in yerleşik `text-xs` utility'si 12px olduğu ve
> uygulamada 866 kullanımı bulunduğu için ad çakışması yaşanıyordu; spec'in
> harfiyen uygulanması tüm uygulamada metin boyutunu küçültecekti. Token
> `text-micro` olarak yeniden adlandırıldı. Uygulama karşılığı
> `src/app/globals.css` `@theme` bloğunda `--text-micro: 11px` olarak tanımlıdır.

---

## Font Weight Standards

- **Bold (`700`):** Used exclusively for Display headlines, Page `<h1>` titles, and primary numerical metrics.
- **Semibold (`600`):** Used for Section `<h2>`/`<h3>` titles, Card headers, Button labels, and Active Navigation items.
- **Medium (`500`):** Used for Form field input values, Form labels, Badges, and Secondary List Row titles.
- **Regular (`400`):** Used for Paragraph copy, multiline description blocks, and body text.

---

## Usage

- **Semantic HTML Mandatory:** Always use `<h1>` for page main titles, `<h2>` for section headers, `<h3>` for cards, and `<p>` for body text.
- **Tailwind Utility Mappings:**
  - `font-sans` -> `var(--font-family)`
  - `text-display` -> `text-[32px] font-bold tracking-tight leading-tight`
  - `text-h1` -> `text-[24px] font-bold tracking-tight leading-snug`
  - `text-h2` -> `text-[20px] font-semibold tracking-tight leading-snug`
  - `text-body` -> `text-[14px] font-normal leading-relaxed`

---

## Responsive Behaviour

- **Mobile Viewports (<430px):**
  - Display Title scales from 32px down to `28px`.
  - H1 Page Title scales from 24px down to `22px`.
  - Input text remains LOCKED at `16px`.
- **Desktop Viewports (>=1024px):**
  - Display Title scales up to `36px`.
  - H1 Page Title scales up to `28px`.

---

## Accessibility Notes
- All body text (`text-body`, `text-body-lg`) must maintain a minimum contrast ratio of 4.5:1 against surface backdrops.
- Large headings (`text-h1`, `text-display`) must maintain a minimum contrast ratio of 3:1.
- Line heights must never be set lower than `1.15` to prevent overlapping ascenders and descenders.

---

## Examples

### DO
- Use `text-base` (16px) for form inputs to preserve iOS viewport lock.
- Apply `tracking-tight` (`-0.02em`) to large bold titles.

### DON'T
- DO NOT use `text-caption` (12px) or `text-micro` (11px) on form inputs or main body copy.
- DO NOT mix font families (e.g. Times New Roman, Comic Sans, ad-hoc Google Fonts).
- DO NOT use pure black (`#000000`) for text; always use OPOS Navy (`#161B2A` / `var(--color-text-primary)`).

---

## Migration Notes
- Replace all legacy `font-montserrat`, `font-roboto`, or hardcoded `text-[15px]` classes across `/src/components/` with official OPOS typography utility tokens.
