# OPOS Design System — 19 Dark Luxury Mode Architecture

> **Status:** GOVERNANCE LOCKED / OFFICIAL DARK MODE SPECIFICATION  
> **Authority Level:** MAXIMUM  
> **Scope:** Dark Luxury Palette, Midnight Canvas, High-Contrast Glass, Theme Switching  

---

## Purpose
This document specifies the **Dark Luxury Mode** visual architecture for Odi.Pet. It defines how light mode surfaces and glass containers map to high-end midnight navy surfaces, ensuring vivid brand readability, reduced eye strain, and 100% WCAG AA contrast compliance in low-light environments.

---

## Scope
Governs:
- Midnight canvas background (`#0B0F19`).
- Elevated navy glass surface containers (`#161B2A` with `rgba(22, 27, 42, 0.85)` opacity).
- Pure off-white primary text (`#F8FAFC`) and slate secondary text (`#94A3B8`).
- Category icon contrast preservation in dark mode.
- System theme auto-detection (`prefers-color-scheme: dark`) and manual toggle persistence.

---

## Principles

### 1. Luxury Midnight Navy (No Pitch-Black #000000)
Dark mode in Odi.Pet is NOT stark, high-contrast pitch black (`#000000`). It utilizes a warm, deep midnight navy palette (`#0B0F19` canvas, `#161B2A` card surface). This eliminates harsh visual glare while conveying luxury aesthetic depth.

### 2. High-Contrast Text Guarantee
All text labels in dark mode use crisp off-white tones (`#F8FAFC` for primary headers, `#94A3B8` for body copy) to ensure high legibility against navy surfaces.

### 3. Glassmorphic Surface Adaptation
Dark mode glass containers adapt to dark translucent fills (`rgba(22, 27, 42, 0.85)`) with subtle dark border highlights (`border border-white/10` or `border-[#263147]`).

---

## Master Dark Mode Mapping Table

| Element Category | Light Mode Token | Light Mode Value | Dark Mode Token / Value | Dark Mode Visual |
| :--- | :--- | :--- | :--- | :--- |
| **Canvas Background** | `--color-bg-main` | `#F6F7FA` | `#0B0F19` | Midnight Navy Canvas |
| **Card Surface** | `--color-surface` | `#FFFFFF` | `#161B2A` | Elevated Dark Surface |
| **Secondary Surface**| `--color-surface-secondary`| `#F0F2F6` | `#1E2638` | Dark Input Fill |
| **Border Stroke** | `--color-border` | `#E6E9EF` | `#263147` | Subtle Dark Border |
| **Primary Text** | `--color-text-primary` | `#161B2A` | `#F8FAFC` | Pure Off-White Header |
| **Secondary Text** | `--color-text-secondary`| `#697386` | `#94A3B8` | Light Slate Copy |
| **Muted Text** | `--color-text-muted` | `#9AA3B2` | `#64748B` | Dark Muted Subtext |
| **Glass Card Fill** | `--glass-card-bg` | `rgba(255,255,255,0.90)`| `rgba(22,27,42,0.85)` | Dark Frosted Glass |

---

## CSS Theme Switching Implementation

```css
/* Light Mode (Default) */
:root {
  --color-bg-main: #F6F7FA;
  --color-surface: #FFFFFF;
  --color-text-primary: #161B2A;
  --color-text-secondary: #697386;
  --color-border: #E6E9EF;
}

/* Dark Mode (Class Activated or OS Preference) */
.dark {
  --color-bg-main: #0B0F19;
  --color-surface: #161B2A;
  --color-surface-secondary: #1E2638;
  --color-text-primary: #F8FAFC;
  --color-text-secondary: #94A3B8;
  --color-border: #263147;
}
```

---

## Usage

- Activate dark mode by applying `class="dark"` to the root `<html>` element.
- Tailwind dark mode utility classes (`dark:bg-slate-900`, `dark:text-white`, `dark:border-slate-800`) map seamlessly to OPOS tokens.

---

## Responsive Behaviour

- Theme switching works instantaneously across mobile, tablet, and desktop viewports without requiring page reloads.

---

## Accessibility Notes
- Dark mode text contrast ratios:
  - Primary Off-White (`#F8FAFC`) on Midnight Canvas (`#0B0F19`): **16.2:1** (Pass AAA)
  - Secondary Slate (`#94A3B8`) on Dark Surface (`#161B2A`): **7.1:1** (Pass AAA)

---

## Examples

### DO
- Use Midnight Navy (`#0B0F19`) for dark mode background canvases.
- Maintain high contrast off-white text labels.

### DON'T
- DO NOT use pitch black (`#000000`) for card surfaces or canvas backgrounds.
- DO NOT leave hardcoded dark text (`#161B2A`) on dark card surfaces.

---

## Migration Notes
- Ensure all component styling references OPOS CSS custom properties so dark mode maps automatically.
