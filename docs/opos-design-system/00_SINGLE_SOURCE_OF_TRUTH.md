# OPOS Design System — 00 Single Source of Truth

> **Status:** GOVERNANCE LOCKED / OFFICIAL SPECIFICATION  
> **Authority Level:** MAXIMUM (Supersedes all legacy UI, ad-hoc styles, inline Tailwind utilities, and historical code)  
> **Scope:** Entire Odi.Pet Web, Mobile (PWA), and Desktop App Interfaces  

---

## Purpose
This document establishes the **OPOS (Odi.Pet Design System)** as the single, absolute, and unchallengeable visual authority for every user interface decision across the entire Odi.Pet product ecosystem. Its primary objective is to enforce 100% visual consistency, premium tactile luxury, soft glassmorphism, rigid brand compliance, and WCAG AA accessibility standards while strictly decoupling visual specifications from production code execution.

---

## Scope
This single source of truth governs:
- All visual design tokens (Colors, Typography, Spacing, Radius, Elevation, Glass Backdrop Blur, Motion).
- All brand identity assets (Official logos, iconography, illustrations, splash elements).
- All UI component specifications (`OPScreen`, `OPGlassCard`, `OPButton`, `OPInput`, `OPBottomSheet`, `OPModal`, `OPBadge`, `OPNavigation`, etc.).
- All layout grids, responsive breakpoints, viewport scaling rules, and safe area paddings.
- All interaction behaviors, micro-animations, motion curves, and tactile feedback dynamics.
- All accessibility rules (WCAG AA contrast, touch target dimensions, focus indicators, VoiceOver labels).

Legacy production code (`/src`) is explicitly stripped of all visual authority and serves exclusively as a container for Business Logic, DOM Hierarchy, Routing, Accessibility relationships, Information Architecture, and State Management.

---

## Principles

### 1. Zero Visual Invention & Zero Visual Inference
No designer, engineer, or AI agent is permitted to invent, infer, or extrapolate colors, fonts, spacing, shadows, border radii, or layout behaviors that are not explicitly documented within `docs/opos-design-system/`. If a visual specification is missing or ambiguous, work must stop until the specification is formally authored and locked.

### 2. Strict Decoupling of Logic and Visuals
Production logic always governs business state, API data flow, and user workflows. OPOS tokens and primitives always govern visual presentation. In any conflict:
- **Business/Functional Conflict:** Production logic wins.
- **Visual/Aesthetic Conflict:** OPOS Visual System wins unconditionally.

### 3. Tactile Glassmorphism & Pet-Centric Identity
The visual identity of Odi.Pet combines soft glassmorphism (lilac/purple canvas backdrops, high-blur glass containers, subtle multi-layered borders) with a vibrant, warm, pet-first aesthetic. Generic human-centric iconography (e.g. tennis rackets, steak cuts, generic badges) is strictly forbidden in favor of pet-dedicated assets (pet food bowls, bones, paws, carriers).

---

## Rules

1. **Mandatory Documentation Preload:** Every automated task, feature migration, or UI build must index the complete OPOS documentation under `docs/opos-design-system/` before reading or touching any component.
2. **Absolute Brand Lock:** Only frozen assets located in `/public/brand/` are legal. Use of PETPAL, FurEver, PawCare, PetBuddy, placeholder logos, AI-generated images, or ad-hoc SVG vectors is grounds for immediate build failure.
3. **Primitive-Only Composition:** Views must be composed strictly of OPOS UI primitives (`OPScreen`, `OPGlassCard`, `OPButton`, `OPInput`, `OPBottomSheet`, `OPModal`, `OPBadge`, `OPIcon`, `OPIllustration`, `OPTypography`). Direct use of raw HTML elements with custom inline Tailwind visual classes is forbidden.
4. **Step-by-Step Approval Protocol:** Screen updates follow a mandatory sequence: Read OPOS -> Read DOM -> Map DOM to OPOS Primitives -> Generate Preview -> Compare -> Human (Tufan) Approval.
5. **Canonical Data & Single Source of Truth:** Each health/pet domain has 1 canonical DB table and 1 mutation service layer. Data duplication and fragmented state across views are strictly prohibited.
6. **Dashboard & Timeline Read-Only Aggregation:** Dashboard, Health Timeline, summary cards, and widgets do not generate data or mutate DB directly. They act purely as read-only aggregation views. All mutations must go through canonical module forms/services.
7. **Health Data Preservation & Archival Only Policy:** Medical and health data (vaccines, antiparasitics, allergies, chronic conditions, prescriptions, lab tests, weight records) can NEVER be hard deleted from the database. Soft delete / archiving (`is_archived = true`, `archived_at`) is mandatory to preserve lifetime medical history.


---

## Measurements & Core System Specs

| Category | Token / Value | Measurement / Spec | Notes |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `bg-main` | `#F6F7FA` with radial glow `rgba(109, 61, 245, 0.04)` | Lilac-tinted luxury background |
| **Glass Surface** | `surface-glass` | `rgba(255, 255, 255, 0.90)` + `backdrop-blur(16px)` | Standard card elevation |
| **Primary Brand Color**| `--color-primary` | `#6D3DF5` | Solid vibrant brand purple |
| **Base Typography** | `--font-family` | Plus Jakarta Sans / Inter | Enforced across all platforms |
| **Base Grid Unit** | `--space-2` | 8px incremental grid system | 4px, 8px, 12px, 16px, 20px, 24px, 32px |
| **Base Corner Radius** | `--radius-md` | 16px (`1rem`) | Enforced card & input radius |
| **Min Touch Target** | `--touch-min` | 44px x 44px | iOS Human Interface Guidelines lock |

---

## Token References
All OPOS documents reference the central CSS tokens registered in `:root` and `@theme`:
- Colors: `--color-primary`, `--color-primary-dark`, `--color-primary-soft`, `--color-bg-main`, `--color-surface`, `--color-text-primary`, `--color-text-secondary`, `--color-border`.
- Radius: `--radius-xs` (8px), `--radius-sm` (12px), `--radius-md` (16px), `--radius-lg` (20px), `--radius-sheet` (28px).
- Shadow: `--shadow-sm`, `--shadow-md`, `--shadow-floating`.
- Motion: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo), compression physics `active:scale-[0.98]`.

---

## Usage

### Document Navigation & Hierarchy
When implementing or auditing any UI feature, consult the OPOS suite in the following mandatory order:
1. `00_SINGLE_SOURCE_OF_TRUTH.md` (System Governance)
2. `01_brand.md` & `02_logo.md` (Brand Identity & Identity Assets)
3. `03_typography.md` & `04_color-tokens.md` (Core Visual Tokens)
4. `05_spacing.md` - `09_glass-system.md` (Layout & Structural Tokens)
5. `10_buttons.md` - `17_illustrations.md` (Component Specifications)
6. `18_motion.md` - `21_responsive.md` (Interaction & Platform Behaviors)
7. `22_component-library.md` - `25_do-not.md` (Implementation Standards & Blacklist)

---

## Responsive Behaviour
- **Mobile First (320px - 430px):** Single-column stacked layouts, bottom drawer sheets (`OPBottomSheet`), floating bottom navigation dock, sticky primary CTA bars.
- **Tablet (768px - 1024px):** Dual-column grid layouts, centered modal dialogs (`OPModal`), side-drawer navigation support.
- **Desktop (1280px - 1920px):** Multi-column split views, fixed sidebar navigation (`SideNav`), centered content max-widths (`max-w-7xl`), elevated desktop cards.

---

## Accessibility Notes
- All interactive components maintain a contrast ratio of at least 4.5:1 against their backgrounds for text and 3:1 for graphical controls.
- All touch targets must adhere to the 44px minimum bounding box rule.
- Focus outlines must use standard `--color-primary` with 4px focus ring offset (`focus:ring-4 focus:ring-primary/20`).
- Motion transitions must respect `prefers-reduced-motion: reduce` by zeroing duration.

---

## Examples

### DO
```markdown
- Utilize <OPGlassCard> with documented OPOS padding (--space-4) and radius (--radius-md).
- Use official brand assets from /public/brand/logos/odi-logo-primary.svg.
- Apply semantic color tokens (var(--color-primary)) for interactive states.
```

### DON'T
```markdown
- DO NOT use arbitrary hex codes (e.g. bg-[#3b82f6]) inside view code.
- DO NOT copy visual styles, inline paddings, or border-radius values from legacy components.
- DO NOT use placeholder logos (PETPAL, FurEver, PawCare, PetBuddy).
- DO NOT invent custom button shapes or drop shadows outside OPOS definitions.
```

---

## Migration Notes
- Legacy UI code in `src/components/` must be systematically upgraded to OPOS primitives.
- Existing business logic handlers, Supabase hooks, and React Hook Form validation schemas must be preserved line-for-line during visual migration.
- Styling classes must be replaced completely by OPOS token utilities and primitive props.

---

## Future Compatibility
- The OPOS Design System is version-locked. Any proposed modification to tokens, brand assets, or primitive interfaces requires an official RFC and explicit written approval from Tufan.
- Backward compatibility with Web, iOS PWA, Android PWA, and desktop viewports is guaranteed through rigid CSS custom property mappings.
