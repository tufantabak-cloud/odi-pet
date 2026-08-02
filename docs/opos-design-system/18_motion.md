# OPOS Design System — 18 Motion & Micro-Interactions Architecture

> **Status:** GOVERNANCE LOCKED / OFFICIAL MOTION SPECIFICATION  
> **Authority Level:** MAXIMUM  
> **Scope:** Easing Curves, Micro-Animations, Compression Physics, Reduced Motion  

---

## Purpose
This document specifies the motion design system, animation timing curves, tactile micro-interactions, and accessibility overrides for Odi.Pet. It ensures that UI transitions feel fluid, responsive, luxury-crafted, and physically consistent, while preventing user disorientation or motion sickness.

---

## Scope
Governs:
- Master CSS timing functions and cubic-bezier easing curves.
- Standard transition durations (`150ms`, `300ms`, `500ms`).
- Component micro-interactions:
  - **Press Compression:** `active:scale-[0.98]`
  - **Card Hover Lift:** `hover:translate-y-[-2px]`
  - **Modal Entrance:** `animate-scaleIn` (`0.2s ease`)
  - **List Stagger Entrance:** `animate-fadeInUp` (`0.4s ease forwards`)
  - **Error Shake:** `animate-shakeIn` (`0.5s ease`)
- `prefers-reduced-motion: reduce` accessibility media query overrides.

---

## Principles

### 1. Natural Tactile Physics (Cubic-Bezier Curves)
UI elements in Odi.Pet do not start or stop abruptly with linear motion. Transitions utilize an organic ease-out-expo curve (`cubic-bezier(0.16, 1, 0.3, 1)`), creating a fluid, premium physical movement.

### 2. Micro-Animations for Feedback
Every interactive element provides instant subtle feedback. Buttons compress slightly on press, cards lift on hover, and active navigation icons scale smoothly.

### 3. Absolute Respect for Reduced Motion
User preferences for reduced motion MUST be respected. When `prefers-reduced-motion: reduce` is detected, all animation durations are set to `0.01ms`, instantly disabling motion transitions.

---

## Master Easing Curves & Timing Scale

```css
:root {
  /* Easing Curves */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);  /* Smooth Entrance / Modals */
  --ease-in-out:   cubic-bezier(0.4, 0, 0.2, 1);   /* Smooth Hover / Scale */
  --ease-elastic:  cubic-bezier(0.34, 1.56, 0.64, 1);/* Tactile Pop / Checkbox */

  /* Duration Tokens */
  --duration-fast:   150ms; /* Button press, toggle switch */
  --duration-normal: 300ms; /* Card hover, dropdown slide */
  --duration-slow:   500ms; /* Modal backdrop fade, drawer slide */
}
```

---

## Keyframe Animation Registry

### 1. Fade In & Slide Up (`animate-fadeInUp`)
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fadeInUp {
  animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
```

### 2. Modal Scale Entrance (`animate-scaleIn`)
```css
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}
.animate-scaleIn {
  animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
```

### 3. Error Shake (`animate-shakeIn`)
```css
@keyframes shakeIn {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}
.animate-shakeIn {
  animation: shakeIn 0.5s ease forwards;
}
```

### 4. Staggered List Entrance (`.stagger-children`)
```css
.stagger-children > *:nth-child(1) { animation-delay: 0ms; }
.stagger-children > *:nth-child(2) { animation-delay: 50ms; }
.stagger-children > *:nth-child(3) { animation-delay: 100ms; }
.stagger-children > *:nth-child(4) { animation-delay: 150ms; }
.stagger-children > *:nth-child(5) { animation-delay: 200ms; }
```

---

## Prefers-Reduced-Motion Override (Mandatory)

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## Usage

- Apply `transition-all duration-300 active:scale-[0.98]` to all custom interactive buttons.
- Wrap list containers in `.stagger-children` and `.animate-fadeInUp` for smooth page loading.

---

## Responsive Behaviour

- Motion behavior remains identical across mobile and desktop viewports, with GPU acceleration forced via `will-change: transform`.

---

## Accessibility Notes
- Motion transitions must never exceed 500ms duration.
- Flashing animations (more than 3 flashes per second) are strictly forbidden to prevent seizure triggers.

---

## Examples

### DO
- Use `animate-fadeInUp` for smooth list entry.
- Apply `active:scale-[0.98]` for press physics on buttons.

### DON'T
- DO NOT use jarring linear infinite rotation animations on static page elements.
- DO NOT bypass `prefers-reduced-motion` overrides.

---

## Migration Notes
- Standardize all keyframe animations across `/src/components/` to use official OPOS motion classes.
