# OPOS Design System — 06 Grid & Layout Systems

> **Status:** GOVERNANCE LOCKED / OFFICIAL GRID SPECIFICATION  
> **Authority Level:** MAXIMUM  
> **Scope:** Container Constraints, Multi-Column Grids, Flex Architecture, Viewport Boundaries  

---

## Purpose
This document specifies the layout container structure, grid systems, and structural column alignments for Odi.Pet. It establishes consistent content framing across mobile smartphones, tablets, laptops, and ultra-wide desktop monitors, ensuring fluid layout adaptation without content stretching or clipping.

---

## Scope
Governs:
- Max-width container constraints (`max-w-md`, `max-w-4xl`, `max-w-7xl`).
- 1-column mobile layout stack rules.
- 2-column and 3-column desktop grid architectures.
- Sidebar vs. main content split ratios.
- Horizontal centering and margin auto behaviors.

---

## Principles

### 1. Mobile-First Single-Column Foundation
On mobile viewports (320px - 430px), content flows in a clean, vertically stacked 1-column layout. Cards, form groups, and list items span 100% of the container width minus safe-area horizontal gutters.

### 2. Multi-Column Desktop Elevation
On desktop viewports (>=1024px), the layout smoothly expands into structured multi-column grids (e.g. 2/3 main dashboard feed + 1/3 right-hand side widgets; or 12-column grid system).

### 3. Centered Content Framing
App views MUST NEVER stretch endlessly across ultra-wide monitors (e.g. 2560px). All page contents are bounded inside max-width wrappers (`max-w-7xl` / `1280px`) and horizontally centered (`mx-auto`).

---

## Layout Containers & Breakpoint Rules

| Container Token | Max Width (px) | Horizontal Gutters | Usage Context |
| :--- | :--- | :--- | :--- |
| **`container-auth`** | `440px` (`max-w-md`) | `16px` (`px-4`) | Login, Registration, OTP, Password Reset cards |
| **`container-form`** | `640px` (`max-w-2xl`) | `24px` (`px-6`) | Single-purpose modals, Pet profile onboarding wizard |
| **`container-app`** | `1280px` (`max-w-7xl`)| `16px` (Mobile) / `32px` (Desktop)| Main Dashboard, Pet Detail views, Health Feed |
| **`container-full`** | `100%` | `0px` | Navigation bars, full-screen background canvases |

---

## Grid Column Structures

### 1. Main Dashboard Grid (Desktop >= 1024px)
- **Structure:** 12-Column CSS Grid
- **Split Ratio:** 8 Columns (Main Content / Health Feed) + 4 Columns (Widgets / Reminders Sidebar)
- **Tailwind Specification:** `grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8`
- **Main Column:** `lg:col-span-8`
- **Sidebar Column:** `lg:col-span-4`

### 2. Pet Card Grid (Multi-Pet View)
- **Mobile (< 768px):** 1 Column (`grid-cols-1`)
- **Tablet (768px - 1023px):** 2 Columns (`grid-cols-2 gap-4`)
- **Desktop (>= 1024px):** 3 Columns (`grid-cols-3 gap-6`)

### 3. Metric Widgets Grid
- **Mobile (< 430px):** 2 Columns (`grid-cols-2 gap-3`)
- **Desktop (>= 768px):** 4 Columns (`grid-cols-4 gap-4`)

---

## Usage

- Wrap page contents inside the master layout container:
```tsx
/* Logical Representation of OPScreen Layout Container */
<div className="w-full min-h-screen bg-bg-main">
  <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
    {/* Page Content */}
  </main>
</div>
```

---

## Responsive Behaviour

- **Mobile (< 768px):** All grid columns collapse to single-column flex/grid blocks (`grid-cols-1`). Horizontal scroll containers (`snap-x`) may be used for timeline chips or pet avatars.
- **Desktop (>= 1024px):** Dual-column and multi-column grid layouts activate automatically.

---

## Accessibility Notes
- Responsive layout shifts must not disrupt logical reading order in DOM tree (keyboard focus order must strictly match visual layout).

---

## Examples

### DO
- Use `max-w-7xl mx-auto` for main application pages.
- Use `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` for pet card grids.

### DON'T
- DO NOT allow cards to stretch full screen on 4K desktop screens without max-width bounds.
- DO NOT hardcode absolute pixel widths (`w-[950px]`) on responsive containers.

---

## Migration Notes
- Replace hardcoded pixel container widths across `/src/components/` with standardized OPOS container utility wrappers.
