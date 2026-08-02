# OPOS Design System — 16 Iconography System & Pet-Centric Icons (`OPIcon`)

> **Status:** GOVERNANCE LOCKED / OFFICIAL ICONOGRAPHY SPECIFICATION  
> **Authority Level:** MAXIMUM  
> **Scope:** Icon Library, Pet-Centric Rules, Semi-3D Category Tints, Lucide Mappings  

---

## Purpose
This document specifies the official iconography system for Odi.Pet (`OPIcon`). It enforces rigid pet-first icon assignment rules, semi-3D visual depth standards, domain color tints, stroke weights, and bounding box dimensions, while explicitly banning generic or human-centric icons.

---

## Scope
Governs:
- Master `OPIcon` wrapper primitive.
- Standard icon library based on customized **Lucide React** icon mappings.
- **Pet-Centric Icon Rule:** Direct replacement of human-centric icons (e.g. tennis rackets, steak cuts, generic badges) with pet-dedicated assets (pet food bowls, bones, paws, carriers, syringes, cat litters).
- Icon sizing scale (`16px`, `20px`, `24px`, `32px`).
- Category icon avatar container tints.

---

## Principles

### 1. ABSOLUTE BAN ON HUMAN-CENTRIC ICONS
Generic or human-focused icons are strictly forbidden across all features:
- ❌ **FORBIDDEN:** Tennis Racket (Activity) -> ✅ **REQUIRED:** Dog Bone / Pet Paw / Ball (`PawPrint`, `Bone`)
- ❌ **FORBIDDEN:** Steak Cut / Fork & Knife (Nutrition) -> ✅ **REQUIRED:** Pet Food Bowl (`UtensilsCrossed` / Pet Bowl SVG)
- ❌ **FORBIDDEN:** Human Carrier / Generic Bag (Travel) -> ✅ **REQUIRED:** Pet Carrier / Cage (`Package` / Pet Carrier SVG)
- ❌ **FORBIDDEN:** Generic Hospital Cross (Health) -> ✅ **REQUIRED:** Veterinary Syringe / Shield (`Syringe`, `ShieldHeart`)

### 2. Semi-3D Depth & Category Soft Tints
Icons placed inside category headers or metric widgets MUST sit inside a rounded soft-bg avatar container (`w-10 h-10 rounded-xl bg-[category-soft] flex items-center justify-center`) with saturated icon strokes (`text-[category-accent]`) and subtle drop shadow filters (`drop-shadow-[0_2px_4px_rgba(0,0,0,0.06)]`).

### 3. Consistent Stroke Geometry
All vector icons enforce a uniform `2px` stroke width (`strokeWidth={2}`) and rounded line caps (`strokeLinecap="round"` `strokeLinejoin="round"`).

---

## Master Icon Category Mapping Table

| Module Category | Permitted OPOS Icon | Lucide Icon Name | Category Soft Bg Token | Accent Color Token |
| :--- | :--- | :--- | :--- | :--- |
| **Vaccines** | Syringe / Immunization | `Syringe` | `--color-vaccine-soft` | `--color-info` (`#3B82F6`) |
| **Parasites** | Shield Bug / Tick Guard | `ShieldCheck` / `Bug` | `--color-parasite-soft` | `--color-success` (`#16A87A`) |
| **Health / Urgent**| Heart Shield / Cross | `ShieldHeart` / `Activity`| `--color-health-soft` | `--color-danger` (`#E4474F`) |
| **Grooming / Care** | Scissors / Sparkles | `Scissors` / `Sparkles` | `--color-care-soft` | `#EC4899` (Rose Pink) |
| **Nutrition / Diet**| Pet Bowl / Apple | `Utensils` / `Apple` | `--color-nutrition-soft`| `--color-warning` (`#F2A23A`)|
| **Hygiene & Litter**| Droplet / Wind | `Droplets` / `Wind` | `--color-hygiene-soft` | `#0D9488` (Teal) |
| **Activity & Play** | Paw Print / Dog Bone | `PawPrint` / `Bone` | `--color-activity-soft`| `--color-primary` (`#6D3DF5`)|
| **Veterinary / SOS**| Stethoscope / Hospital | `Stethoscope` / `Siren` | `--color-vet-soft` | `#4F46E5` (Indigo) |

---

## Icon Sizing Scale

| Size Token | Dimensions (px) | Tailwind Class | Usage Context |
| :--- | :--- | :--- | :--- |
| **`xs`** | `14px x 14px` | `w-3.5 h-3.5` | Inline sub-labels, micro status indicators |
| **`sm`** | `16px x 16px` | `w-4 h-4` | Button left/right icons, input prefix icons |
| **`md` (Default)**| `20px x 20px` | `w-5 h-5` | Standard list row icons, navigation tabs |
| **`lg`** | `24px x 24px` | `w-6 h-6` | Card header category icons, modal titles |
| **`xl`** | `32px x 32px` | `w-8 h-8` | Hero widgets, empty state sub-icons |

---

## Component Interface Specification

```typescript
/* OPIcon Primitive Component Interface (Logical Spec) */
export interface OPIconProps {
  name: string; // Key mapping to Lucide / OPOS pet icon registry
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: string;
}
```

---

## Usage

- Render icons via `<OPIcon name="paw-print" size="md" />` or `<PawPrint className="w-5 h-5 text-primary" />`.

---

## Responsive Behaviour

- Icons maintain fixed pixel boundaries (`16px`, `20px`, `24px`) across mobile and desktop viewports to prevent vector distortion.

---

## Accessibility Notes
- Decorative icons inside buttons or headers must set `aria-hidden="true"`.
- Standalone icon buttons must provide `aria-label="... description ..."` (e.g. `aria-label="Aşı Kaydını Sil"`).

---

## Examples

### DO
- Use `PawPrint` or `Bone` icons for pet activity tracking.
- Use `Syringe` with `--color-vaccine-soft` background for vaccine logs.

### DON'T
- DO NOT use tennis rackets, steak cuts, human fitness dumbells, or generic icons.
- DO NOT use multi-colored unformatted emoji icons inside UI controls.

---

## Migration Notes
- Audit all icon instances across `/src/components/` and replace human-centric or unformatted SVGs with official `OPIcon` pet mappings.
