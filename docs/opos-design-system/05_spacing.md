# OPOS Design System — 05 Spacing & Structural Rhythm

> **Status:** GOVERNANCE LOCKED / OFFICIAL SPACING SPECIFICATION  
> **Authority Level:** MAXIMUM  
> **Scope:** 8px Baseline Grid, Spacing Scale, Component Margins, Container Padding, Safe Areas  

---

## Purpose
This document defines the mathematical spacing scale and layout rhythm for Odi.Pet. Based on a rigid 8px grid system (with a 4px half-unit for tight micro-spacing), it governs component internal paddings, card gaps, section margins, page container gutters, and mobile notch/home-indicator safe area offsets.

---

## Scope
Governs:
- Master spacing scale (`--space-1` to `--space-12`).
- 8px baseline grid alignment rules.
- Card & container internal padding standards.
- Stack & inline layout gap specifications.
- Safe area paddings for mobile viewports (`env(safe-area-inset-bottom)`).
- Responsive spacing adjustments.

---

## Principles

### 1. Mathematical 8px Rhythm
All spacing measurements—paddings, margins, gaps, heights—MUST be exact multiples of 8px (or 4px for micro elements). Random pixel values like `7px`, `13px`, `19px`, `27px` are strictly illegal.

### 2. Generous Breathing Room & Luxury Touch
Luxury interfaces avoid dense, cluttered views. OPOS mandates generous card padding (`16px` to `24px`) and section spacing (`24px` to `32px`) to ensure clear visual separation and effortless touch interaction.

### 3. Safe Area Protection (iOS & Android PWA)
All full-screen views, bottom sheets, and floating action docks MUST integrate safe-area padding to prevent fixed UI elements from obscuring operating system gesture bars or camera notches.

---

## Master Spacing Scale

| Token Name | Rem Value | Pixel Equivalent | Tailwind Class | Usage Context |
| :--- | :--- | :--- | :--- | :--- |
| **`--space-1`** | `0.25rem` | **4px** | `p-1`, `gap-1`, `m-1` | Micro gaps between icon & label, micro chips |
| **`--space-2`** | `0.5rem` | **8px** | `p-2`, `gap-2`, `m-2` | Small gaps, chip internal padding, sub-labels |
| **`--space-3`** | `0.75rem` | **12px** | `p-3`, `gap-3`, `m-3` | Compact button padding, input internal padding |
| **`--space-4`** | `1.0rem` | **16px** | `p-4`, `gap-4`, `m-4` | Standard card padding, form field spacing |
| **`--space-5`** | `1.25rem` | **20px** | `p-5`, `gap-5`, `m-5` | Elevated card padding, modal content padding |
| **`--space-6`** | `1.5rem` | **24px** | `p-6`, `gap-6`, `m-6` | Major section gap, header bottom margin |
| **`--space-8`** | `2.0rem` | **32px** | `p-8`, `gap-8`, `m-8` | Page top/bottom section margin, hero gap |
| **`--space-10`**| `2.5rem` | **40px** | `p-10`, `gap-10` | Large container gutters, empty state gaps |
| **`--space-12`**| `3.0rem` | **48px** | `p-12`, `gap-12` | Major page separation, footer spacing |

---

## Component Spacing Standards

### Card Internal Padding
- **Compact Card (`InsightCard`):** `16px` (`p-4`)
- **Standard Card (`OPGlassCard`):** `20px` (`p-5`)
- **Large Hero Card (`PetHeroCard`):** `24px` (`p-6`)

### Form Field Spacing
- **Gap between Label and Input:** `8px` (`mb-2`)
- **Gap between Inputs in Form:** `16px` (`space-y-4`)
- **Input Internal Horizontal Padding:** `16px` (`px-4`)
- **Input Height:** `48px` (`h-12`)

### Button Padding & Dimensions
- **Standard Button (`OPButton`):** Height `48px` (`h-12`), Horizontal Padding `24px` (`px-6`)
- **Compact Button:** Height `36px` (`h-9`), Horizontal Padding `16px` (`px-4`)
- **Large CTA Button:** Height `56px` (`h-14`), Horizontal Padding `32px` (`px-8`)

---

## Safe Area & Bottom Dock Padding Rules

```css
/* Bottom Navigation Dock & Sticky CTAs */
.safe-bottom-dock {
  padding-bottom: calc(var(--space-6) + env(safe-area-inset-bottom, 16px));
}

/* Page Scrollable Area Bottom Clearance */
.page-bottom-clearance {
  padding-bottom: calc(80px + env(safe-area-inset-bottom, 16px));
}
```

---

## Usage

- Use Tailwind flex/grid gaps (`gap-4`, `gap-6`) rather than ad-hoc margins on child elements.
- Always use symmetric padding (`px-4 py-3`) for form controls.

---

## Responsive Behaviour

- **Mobile Viewports (<430px):**
  - Page outer horizontal padding: `16px` (`px-4`).
  - Section gap: `20px` (`gap-5`).
- **Tablet Viewports (768px - 1024px):**
  - Page outer horizontal padding: `24px` (`px-6`).
  - Section gap: `24px` (`gap-6`).
- **Desktop Viewports (>=1280px):**
  - Page outer horizontal padding: `32px` (`px-8`).
  - Section gap: `32px` (`gap-8`).

---

## Accessibility Notes
- Interactive elements must maintain a minimum 8px clear spacing gap between target bounding boxes to prevent accidental mis-taps.

---

## Examples

### DO
- Use `--space-4` (16px) for standard input spacing and card padding.
- Align all layouts using `gap-4` or `gap-6` flexbox containers.

### DON'T
- DO NOT use odd pixel values (`margin-top: 13px`).
- DO NOT hardcode fixed bottom paddings that clip underneath mobile navigation bars.

---

## Migration Notes
- Audit and replace all arbitrary spacing utility classes (`p-[13px]`, `mt-[27px]`) with standardized OPOS 8px grid tokens.
