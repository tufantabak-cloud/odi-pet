# OPOS Design System — 09 Glassmorphism & Surface System

> **Status:** GOVERNANCE LOCKED / OFFICIAL GLASS SYSTEM SPECIFICATION  
> **Authority Level:** MAXIMUM  
> **Scope:** Backdrop Blur, Glass Opacities, White Border Highlights, Lilac Glow Canvas  

---

## Purpose
This document defines the signature **Soft Glassmorphism** architecture of Odi.Pet. Glassmorphism is the core visual differentiator of Odi.Pet, creating a multi-layered, frosted-glass aesthetic where content floats gracefully over subtle lilac radial glows and soft background gradients.

---

## Scope
Governs:
- Master canvas radial background gradient.
- Glass container fill opacities (`rgba(255, 255, 255, 0.90)` / `0.80`).
- Backdrop blur values (`backdrop-blur-sm` to `backdrop-blur-2xl`).
- Glass border highlights (`border border-white/40` or `border border-white/20`).
- Performance constraints & hardware acceleration.

---

## Principles

### 1. Frosted Lilac Canvas Integration
Glass surfaces MUST ALWAYS sit over the official Odi.Pet lilac-tinted canvas backdrop (`#F6F7FA` with radial gradient `rgba(109, 61, 245, 0.04)`). Placing frosted glass over plain flat white or dark grey destroys the glass effect.

### 2. Multi-Layer Border Reflection
Every glass container features a crisp, semi-transparent white top/side stroke (`border border-white/40` or `border border-white/20`). This mimics physical glass light refraction along container edges.

### 3. GPU Performance Optimization
`backdrop-filter: blur(...)` can be computationally expensive on low-end mobile devices. OPOS mandates hardware-accelerated CSS properties (`will-change: transform`, `transform: translateZ(0)`) and enforces strict maximum blur limits (`16px` to `24px`).

---

## Master Glass Surface Tokens & Specs

```css
:root {
  /* Canvas Background */
  --canvas-bg-radial: radial-gradient(100% 100% at 50% 0%, rgba(109, 61, 245, 0.04) 0%, rgba(246, 247, 250, 1) 50%);

  /* Standard Glass Container */
  --glass-card-bg:          rgba(255, 255, 255, 0.90);
  --glass-card-border:      rgba(255, 255, 255, 0.40);
  --glass-card-blur:        16px;

  /* Elevated Overlay Glass (Modals / Sheets) */
  --glass-overlay-bg:       rgba(255, 255, 255, 0.95);
  --glass-overlay-border:   rgba(255, 255, 255, 0.60);
  --glass-overlay-blur:     24px;

  /* Input Glass Surface */
  --glass-input-bg:         rgba(255, 255, 255, 0.80);
  --glass-input-blur:       8px;
}
```

---

## Mapped Tailwind Glass Utility Classes

| Class Name | Composition | Usage Context |
| :--- | :--- | :--- |
| **`.card-base`** | `bg-surface/90 backdrop-blur-xl border border-white shadow-soft` | Standard `OPGlassCard` |
| **`.input-base`** | `bg-surface/80 backdrop-blur-sm border border-border-main rounded-input` | Standard `OPInput` |
| **`.glass-modal`** | `bg-white/95 backdrop-blur-2xl border border-white/60 shadow-floating` | `OPModal` & `OPBottomSheet` |
| **`.glass-nav`** | `bg-white/80 backdrop-blur-md border-b border-border/50` | Sticky Top Header / SideNav |

---

## Surface Hierarchy Layers

```
[ Layer 4: Floating Modals / Sheets ] -> bg-white/95 backdrop-blur-2xl border-white/60 shadow-floating
[ Layer 3: OPGlassCard Containers ]   -> bg-white/90 backdrop-blur-xl border-white/40 shadow-soft
[ Layer 2: Input Controls ]           -> bg-white/80 backdrop-blur-sm border-border
[ Layer 1: Lilac Canvas Backdrop ]    -> #F6F7FA + radial-gradient(rgba(109,61,245,0.04))
```

---

## Usage

- Wrap main content views inside `<OPScreen>` to ensure the canvas backdrop and glass context are automatically mounted.

---

## Responsive Behaviour

- **Mobile Viewports (<430px):** On low-power mobile devices or when battery saver is active, backdrop blur gracefully falls back to `bg-white/95` without rendering bugs.

---

## Accessibility Notes
- Glass containers must maintain a minimum 90% white fill opacity (`rgba(255,255,255,0.90)`) behind body text to guarantee text contrast against background gradients.

---

## Examples

### DO
- Combine `bg-white/90` with `backdrop-blur-xl` and `border border-white` for cards.
- Ensure the root `<body>` renders the lilac radial canvas gradient.

### DON'T
- DO NOT use low-opacity glass (`bg-white/30`) behind primary body text (causes severe text legibility failure).
- DO NOT stack multiple heavy blur layers (`backdrop-blur-3xl`) inside scrollable list rows.

---

## Migration Notes
- Replace all legacy solid white (`bg-white`) card containers with frosted `OPGlassCard` surfaces.
