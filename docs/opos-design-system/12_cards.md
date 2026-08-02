# OPOS Design System — 12 Card Component Specifications (`OPGlassCard` & Health Cards)

> **Status:** GOVERNANCE LOCKED / OFFICIAL CARD SPECIFICATION  
> **Authority Level:** MAXIMUM  
> **Scope:** Glass Cards, Pet Hero Cards, Health Cards, Insight Cards, Metric Cards, Status Cards  

---

## Purpose
This document defines the complete card container specification for Odi.Pet (`OPGlassCard`, `InsightCard`, `PetHeroCard`, `MetricItem`). Cards are the primary surface containers used to group pet medical records, daily vitals, upcoming reminders, and activity logs into readable, elegant, frosted-glass modules.

---

## Scope
Governs:
- Master `OPGlassCard` primitive (`bg-white/90 backdrop-blur-xl border border-white`).
- Specialty domain cards:
  - **`PetHeroCard`** (Top pet overview header container)
  - **`InsightCard`** (AI health recommendations & daily tips)
  - **`HealthCard`** (Vaccine, parasite, medical log containers)
  - **`MetricItem`** (Weight, temperature, age stat widgets)
- Card paddings (`16px`, `20px`, `24px`), radii (`16px`, `20px`), and elevation shadows.
- Category soft tint header triples.

---

## Principles

### 1. Frosted Glass Surface Architecture
All cards in Odi.Pet leverage soft glassmorphism. Plain opaque white boxes (`bg-white shadow-sm`) are forbidden in favor of semi-transparent glass backdrops (`bg-white/90 backdrop-blur-xl`) bounded by a subtle white edge stroke (`border border-white`).

### 2. Category Tint Framing
Health cards display a dedicated category icon avatar in their top-left header, styled with matching 10% opacity soft background tints and high-contrast icon fills (e.g., Sky Blue for Vaccines, Emerald for Parasites, Crimson for Health Alerts).

### 3. Interactive Lift Physics
Clickable cards elevate smoothly when hovered or focused (`translateY(-2px)` with expanded `--shadow-medium` shadow diffusion) to indicate interactability.

---

## Master Card Specs & Variant Matrix

### 1. Standard Glass Card (`OPGlassCard`)
- **Visual Spec:** `bg-surface/90 backdrop-blur-xl rounded-card shadow-soft border border-white hover:shadow-medium hover:border-primary/10 transition-all duration-500 p-5`
- **Background:** `rgba(255, 255, 255, 0.90)`
- **Backdrop Blur:** `16px` (`backdrop-blur-xl`)
- **Border:** `1px solid rgba(255, 255, 255, 0.40)`
- **Radius:** `16px` (`--radius-card`)
- **Shadow:** `--shadow-soft` (Hover: `--shadow-medium`)

### 2. Pet Hero Overview Card (`PetHeroCard`)
- **Visual Spec:** `relative w-full bg-gradient-to-br from-primary-soft/80 via-white/90 to-white/95 backdrop-blur-2xl rounded-[20px] p-6 border border-white/60 shadow-medium overflow-hidden`
- **Radius:** `20px` (`--radius-lg`)
- **Usage:** Main pet profile hero banner (Pet avatar, breed badge, age scale, quick action bar).

### 3. AI Insight Card (`InsightCard`)
- **Visual Spec:** `bg-primary-soft/60 backdrop-blur-md rounded-2xl p-4 border border-primary/20 flex gap-4 items-start`
- **Background:** `#F2EEFF` with 60% opacity
- **Border:** `1px solid rgba(109, 61, 245, 0.20)`
- **Usage:** Smart AI notifications, nutrition advice, vaccine due reminders.

### 4. Metric Stat Widget (`MetricItem`)
- **Visual Spec:** `bg-surface/80 backdrop-blur-sm rounded-xl p-4 border border-border flex flex-col justify-between`
- **Padding:** `16px` (`p-4`)
- **Radius:** `12px` (`--radius-sm`)
- **Usage:** Weight tracking stats, daily food intake, age display, micro vitals.

---

## Component Interface Specification

```typescript
/* OPGlassCard Component Prop Interface (Logical Spec) */
export interface OPGlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hero' | 'insight' | 'interactive';
  padding?: 'compact' | 'normal' | 'relaxed';
  category?: 'health' | 'vaccine' | 'parasite' | 'nutrition' | 'care';
}
```

---

## Usage

- Wrap pet data sections inside `<OPGlassCard>` instead of ad-hoc `<div>` containers.

---

## Responsive Behaviour

- **Mobile Viewports (<430px):** Cards adapt to `100%` container width with `16px` (`p-4`) internal padding.
- **Desktop Viewports (>=1024px):** Cards fit inside multi-column grid layouts with `20px` or `24px` (`p-5` / `p-6`) internal padding.

---

## Accessibility Notes
- Interactive cards must include keyboard focus outlines (`focus:ring-4 focus:ring-primary/20`) and `role="button"` or `<a>` wrappers when clickable.

---

## Examples

### DO
- Use `<OPGlassCard>` for medical history logs, pet profiles, and dashboard widgets.
- Pair domain soft bg tints with matching category icons.

### DON me
- DO NOT use flat opaque white cards with harsh black drop shadows.
- DO NOT use 0px sharp corners on card containers.

---

## Migration Notes
- Refactor all ad-hoc card divs (`bg-white rounded-xl shadow-sm`) across `/src/components/` into `OPGlassCard` or `InsightCard`.
