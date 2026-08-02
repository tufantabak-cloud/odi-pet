# OPOS Design System — 17 Illustration Library & Asset Governance (`OPIllustration`)

> **Status:** GOVERNANCE LOCKED / OFFICIAL ILLUSTRATION SPECIFICATION  
> **Authority Level:** MAXIMUM  
> **Scope:** Semi-3D Pet Illustrations, DAM Single Source of Truth, SVG Wrappers  

---

## Purpose
This document specifies the official illustration system for Odi.Pet (`OPIllustration`). It governs the usage, rendering, scaling, accessibility, and single-source-of-truth DAM registration for all semi-3D pet-centric illustrations used across onboarding, empty states, hero sections, and cycle tracking.

---

## Scope
Governs:
- Master `<Illustration />` / `<OPIllustration />` wrapper component.
- Frozen official SVG illustration assets located in `/public/brand/illustrations/`.
- **Semi-3D Style Architecture:** Rich gradients, layered vector shapes, soft drop shadow filters (`feDropShadow`).
- **Strict Prohibition of AI / Placeholder Art:** Ban on unapproved AI imagery, PETPAL assets, stock vectors, or ad-hoc PNG illustrations.
- Illustration screen mapping registry.

---

## Principles

### 1. Frozen Brand DAM (Single Source of Truth)
All illustration assets MUST originate exclusively from `/public/brand/illustrations/`. No component file may import third-party illustration URLs, remote CDN images, or unverified local vector files.

### 2. Semi-3D Visual Elegance
OPOS illustrations are crafted in a modern semi-3D visual style. They feature soft lilac/purple brand color fills, multi-layer depth highlights, smooth vector gradients, and subtle drop shadows (`filter: drop-shadow(0px 8px 16px rgba(109, 61, 245, 0.12))`). Flat, boring, monochrome line art is strictly forbidden.

### 3. Mandatory Wrapper Standard
All illustrations MUST be rendered through the official `<Illustration name="..." />` wrapper component. Direct inline `<svg>` blocks spanning hundreds of lines inside page files are forbidden.

---

## Authorized Illustration Inventory

| Asset Name | File Path | Usage Context | Recommended Dimensions |
| :--- | :--- | :--- | :--- |
| **`hero-pet-health`** | `/public/brand/illustrations/hero-pet-health.svg` | Main Dashboard & Health Hero section | `240px x 240px` |
| **`empty-state-pet`** | `/public/brand/illustrations/empty-state-pet.svg` | Zero-data empty states (No pets, no vaccines) | `192px x 192px` |
| **`estrus-calendar-hero`**| `/public/brand/illustrations/estrus-calendar-hero.svg` | Heat cycle & estrus tracking hero banner | `220px x 220px` |
| **`auth-welcome-pet`** | `/public/brand/illustrations/auth-welcome-pet.svg` | Registration & Onboarding welcome card | `200px x 200px` |
| **`medical-success`** | `/public/brand/illustrations/medical-success.svg` | Vaccine / Vet log completion modal | `160px x 160px` |

---

## Component Interface Specification

```typescript
/* OPIllustration Primitive Component Interface (Logical Spec) */
export interface OPIllustrationProps {
  name: 'hero-pet-health' | 'empty-state-pet' | 'estrus-calendar-hero' | 'auth-welcome-pet' | 'medical-success';
  className?: string;
  width?: number | string;
  height?: number | string;
  alt?: string;
}
```

---

## Usage

```tsx
/* Standard Implementation of OPOS Illustration */
<OPIllustration 
  name="empty-state-pet" 
  width={192} 
  height={192} 
  alt="Henüz aşı kaydı bulunmuyor" 
/>
```

---

## Responsive Behaviour

- **Mobile Viewports (<430px):** Illustrations automatically scale down to 70%-80% of desktop dimensions (e.g. 240px -> 180px) to conserve vertical scroll real estate.
- **Desktop Viewports (>=1024px):** Illustrations render at full 100% vector scale inside hero and modal containers.

---

## Accessibility Notes
- Every illustration rendered via `<OPIllustration>` MUST provide a meaningful Turkish `alt` text attribute explaining the image context to VoiceOver/screen readers, OR specify `aria-hidden="true"` if purely decorative.

---

## Examples

### DO
- Render official semi-3D illustrations via `<OPIllustration name="hero-pet-health" />`.
- Store all SVG assets inside `/public/brand/illustrations/`.

### DON'T
- DO NOT generate AI illustrations or download random stock vectors.
- DO NOT paste raw 500-line inline SVG XML blocks directly inside page components.

---

## Migration Notes
- Replace all legacy inline SVG illustrations and placeholder PNGs across `/src/components/` with `<OPIllustration>` primitive calls.
