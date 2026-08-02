# OPOS Design System — 02 Logo Specifications & Lockup Rules

> **Status:** GOVERNANCE LOCKED / OFFICIAL BRAND LOGO SPECIFICATION  
> **Authority Level:** MAXIMUM  
> **Scope:** Logo variants, clear space, minimum sizes, dark mode lockups, illegal usage  

---

## Purpose
This document provides exact mathematical, structural, and visual specifications for the Odi.Pet logo family. It ensures consistent, high-impact brand visibility across web browsers, mobile home screens, app headers, splash screens, and physical/digital export cards.

---

## Scope
Governs:
- Master vertical logo (`odi-logo-primary.svg`).
- Horizontal header logo (`odi-logo-horizontal.svg`).
- Brand icon mark (`odi-logo-icon.svg`).
- Watermark asset (`odi-watermark.svg`).
- Clear zone calculations, sizing constraints, contrast requirements, and forbidden alterations.

---

## Principles

### 1. Vector Purity
The Odi.Pet logo family is strictly vector-based (`.svg`). Rasterized formats (`.png`, `.jpg`) are reserved exclusively for PWA app icons and meta tags where required by operating systems.

### 2. High-Contrast Legibility
The logo mark combines the vibrant brand purple (`#6D3DF5`) with high-contrast text (`#161B2A` in light mode, `#FFFFFF` in dark mode). It must maintain perfect legibility on light glass backdrops as well as dark luxury surfaces.

### 3. Absolute Protection Against Modification
No code or CSS transformation may alter logo colors, vector path structures, component proportions, or font lockups.

---

## Logo Family & Measurements

| Logo Variant | Path / File | Minimum Width (Mobile) | Recommended Width (Desktop) | Usage Context |
| :--- | :--- | :--- | :--- | :--- |
| **Master Primary** | `/public/brand/logos/odi-logo-primary.svg` | `120px` | `180px` | Splash screens, Onboarding, Auth headers |
| **Horizontal Header** | `/public/brand/logos/odi-logo-horizontal.svg` | `100px` (`h-7`) | `140px` (`h-9`) | Main app top navigation bar, SideNav header |
| **Standalone Icon** | `/public/brand/logos/odi-logo-icon.svg` | `28px` | `40px` | Compact mobile headers, Favicon, PWA touch icon |
| **Brand Watermark** | `/public/brand/logos/odi-watermark.svg` | `200px` | `400px` | Low-opacity background decorative elements |

---

## Clear Space & Exclusion Zone

The minimum required clear space around all logo variants is calculated using **'X'**, where **X** equals the height of the brand icon mark within the logo.

```
       +-----------------------------------+
       |              Clear Zone           |
       |       +-------------------+       |
       |   X   |   Odi.Pet Logo    |   X   |
       |       +-------------------+       |
       |              Clear Zone           |
       +-----------------------------------+
```

- **Clear Zone Rule:** No text, UI buttons, borders, or images may intrude within **1.0X** distance from any edge of the logo frame.

---

## Color Lockups & Surface Variants

1. **Light Surface (Default):**
   - Icon Fill: Brand Purple (`#6D3DF5`) & Soft Gradient.
   - Text Fill: Deep Navy (`#161B2A`).
   - Backdrop: `#F6F7FA` or `#FFFFFF` (Glass container).

2. **Dark Surface (Dark Luxury Mode):**
   - Icon Fill: Brand Purple (`#6D3DF5`) or Vibrant Gradient.
   - Text Fill: Pure White (`#FFFFFF`).
   - Backdrop: `#0F172A` / `#1E293B`.

3. **Monochrome / Single-Color:**
   - Reserved exclusively for print receipts or high-contrast accessibility modes.
   - Fill: Solid `--color-text-primary`.

---

## Usage

- **Next.js Image Component:** Always render logos using unoptimized SVG tags or `<Image src="/public/brand/logos/..." width={...} height={...} alt="Odi.Pet Logo" priority />`.
- **Favicon Integration:** Linked via `layout.tsx` pointing directly to `/public/brand/favicon/favicon.ico`.

---

## Responsive Behaviour

- **Mobile Viewports (<430px):** Collapse horizontal header logo to `odi-logo-horizontal.svg` at `h-7` (28px height) or `odi-logo-icon.svg` at `28x28px` in tight header bars.
- **Desktop Viewports (>=1024px):** Render `odi-logo-horizontal.svg` at `h-9` (36px height) in sticky side/top bars.

---

## Accessibility Notes
- Logo element containers must feature `aria-label="Odi.Pet Ana Sayfa"` when functioning as home navigation links.
- Interactive logo links must provide a visible focus ring (`ring-2 ring-primary`) on keyboard navigation.

---

## Examples

### DO
- Use original SVG assets directly from `/public/brand/logos/`.
- Ensure logo links correctly route to `/dashboard` or `/`.

### DON'T
- DO NOT apply drop shadows (`shadow-md`) directly to logo text path elements.
- DO NOT change the hue of the brand purple icon vector via CSS filters (`hue-rotate`).
- DO NOT place the logo over busy background images without a glass backdrop filter.

---

## Migration Notes
- All legacy SVG code snippets, inline `<svg>` elements representing old logos, and placeholder icons must be removed from `src/components/` and replaced with official `/public/brand/logos/` assets.

---

## Future Compatibility
- Logo specs are permanently locked under OPOS Governance. Vector modifications are disallowed without explicit written clearance.
