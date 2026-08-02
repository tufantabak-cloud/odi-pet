# OPOS Design System — 07 Border Radius Tokens & Geometry

> **Status:** GOVERNANCE LOCKED / OFFICIAL CORNER RADIUS SPECIFICATION  
> **Authority Level:** MAXIMUM  
> **Scope:** Corner Radii Scale, Card Curves, Input Radii, Sheet Curvatures, Pill Shapes  

---

## Purpose
This document defines the mathematical corner radius scale and curvature aesthetics for Odi.Pet. It enforces modern, organic, friendly rounded shapes across cards, buttons, modals, input fields, and badges to convey tactile luxury while completely eliminating legacy sharp corners.

---

## Scope
Governs:
- Master radius scale (`--radius-xs` to `--radius-sheet` and `--radius-chip`).
- Element-specific curvature assignments.
- Nested radius harmony rules (outer radius vs. inner radius calculations).
- Mobile sheet top corner radii (`rounded-t-[28px]`).

---

## Principles

### 1. Organic & Friendly Tactile Curves
Sharp 0px corners or harsh right angles are completely forbidden for surface containers and interactive elements. Curves communicate soft, approachable pet-first design aesthetics.

### 2. Nested Radius Harmony
When an inner child element resides inside a parent container, the child's corner radius MUST be mathematically proportional to the parent container's radius:
$$\text{Radius}_{\text{inner}} = \text{Radius}_{\text{outer}} - \text{Padding}_{\text{container}}$$
This prevents awkward visual gap distortions between inner highlights and outer card borders.

---

## Master Border Radius Scale

| Token Name | Rem / Pixel Value | Tailwind Utility Class | Usage Context |
| :--- | :--- | :--- | :--- |
| **`--radius-xs`** | `8px` (`0.5rem`) | `rounded-lg` / `rounded-xs` | Micro chips, inner avatar borders, tooltips |
| **`--radius-sm`** | `12px` (`0.75rem`) | `rounded-xl` / `rounded-input` | **Form Input Fields**, Checkboxes, Dropdowns |
| **`--radius-md`** | `16px` (`1.0rem`) | `rounded-2xl` / `rounded-card` | **Standard OPGlassCard**, Action Modals |
| **`--radius-btn`**| `18px` (`1.125rem`)| `rounded-btn` | **OPButton**, Primary CTA Action Controls |
| **`--radius-lg`** | `20px` (`1.25rem`) | `rounded-[20px]` | Hero Pet Cards, Dashboard Highlight Widgets |
| **`--radius-sheet`**| `24px` / `28px` | `rounded-sheet` / `rounded-t-[28px]` | **OPBottomSheet**, Mobile Drawer Headers |
| **`--radius-chip`** | `9999px` | `rounded-full` | Status Pills, Avatar Circles, Floating FAB |

---

## Element Radius Assignment Matrix

| UI Component | Assigned Radius Token | Tailwind Class | Notes |
| :--- | :--- | :--- | :--- |
| **`OPButton`** | `--radius-btn` (18px) | `rounded-btn` / `rounded-2xl` | Smooth tactile action button |
| **`OPInput` / `FormField`** | `--radius-sm` (12px) | `rounded-input` / `rounded-xl` | Precise form field border |
| **`OPGlassCard`** | `--radius-md` (16px) | `rounded-card` / `rounded-2xl` | Core surface container |
| **`PetHeroCard`** | `--radius-lg` (20px) | `rounded-[20px]` | Elevated hero banner |
| **`OPModal` (Desktop)** | `--radius-modal` (28px)| `rounded-[28px]` | Centered backdrop modal |
| **`OPBottomSheet` (Mobile)**| `--radius-sheet` (28px)| `rounded-t-[28px]` | Bottom sheet top corners |
| **`OPBadge` / Pills** | `--radius-chip` (9999px)| `rounded-full` | Fully rounded pill status |

---

## Usage

- Always use pre-defined theme classes (`rounded-card`, `rounded-btn`, `rounded-input`) rather than arbitrary inline styles.

---

## Responsive Behaviour

- **Mobile Viewports (<430px):** Bottom sheets enforce `rounded-t-[28px] rounded-b-none` to seamlessly lock against the bottom screen boundary.
- **Desktop Viewports (>=1024px):** Modals enforce complete 28px curvature on all four corners (`rounded-[28px]`).

---

## Accessibility Notes
- Corner radii must not crop or clip inner focus indicator rings (`ring-4 ring-primary/20`).

---

## Examples

### DO
- Use `rounded-2xl` (16px) for standard glass cards.
- Use `rounded-btn` (18px) for primary action buttons.

### DON'T
- DO NOT use 0px sharp corners (`rounded-none`) on cards or buttons.
- DO NOT mix incompatible corner radii within the same container stack (e.g. 8px input inside a 20px card with 4px inner button).

---

## Migration Notes
- Replace all legacy `rounded-md` (6px) or `rounded-sm` (2px) button and card classes with official OPOS radius tokens.
