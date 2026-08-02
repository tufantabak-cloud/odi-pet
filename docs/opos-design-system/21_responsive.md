# OPOS Design System — 21 Responsive Breakpoints & Viewport Architecture

> **Status:** GOVERNANCE LOCKED / OFFICIAL RESPONSIVE SPECIFICATION  
> **Authority Level:** MAXIMUM  
> **Scope:** Viewport Breakpoints (320px to 1920px), Layout Shifts, Touch vs. Desktop, Font Scaling  

---

## Purpose
This document specifies the responsive layout system, breakpoint grid logic, font scaling behavior, container width constraints, and platform adaptation rules for Odi.Pet. It guarantees flawless visual presentation across small smartphones (320px iPhone SE), standard smartphones (390px/430px), tablets (768px/1024px), laptops (1280px/1440px), and ultra-wide desktop monitors (1920px).

---

## Scope
Governs:
- Master breakpoint scale (`320px`, `360px`, `390px`, `430px`, `768px`, `1024px`, `1280px`, `1440px`, `1920px`).
- Fluid container widths (`max-w-md`, `max-w-2xl`, `max-w-7xl`).
- Structural navigation switches (Floating Bottom Dock -> Desktop SideNav).
- Typography scaling curves.
- PWA viewport meta tags and safe-area insets.

---

## Principles

### 1. Mobile-First Architecture
CSS and component structures are authored **mobile-first**. Base styles apply to mobile smartphones (320px - 430px), with progressive enhancement queries (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) adding multi-column layouts and desktop enhancements as viewport width expands.

### 2. Zero Horizontal Viewport Overflow
No page, modal, card, or table in Odi.Pet may cause horizontal scrollbar leakage (`overflow-x: hidden` enforced on page wrapper). Content must reflow or snap cleanly inside the visible viewport.

### 3. Touch vs. Cursor Pointer Physics
On mobile touch viewports (<768px), interactive elements prioritize large touch targets (44px+) and bottom drawer sheets (`OPBottomSheet`). On desktop cursor viewports (>=1024px), elements utilize hover lift transitions (`translateY(-2px)`), side navigation bars, and centered overlay dialogs (`OPModal`).

---

## Master Breakpoint Scale & Layout Matrix

| Breakpoint | Width (px) | Tailwind Prefix | Device Context | Primary Layout Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Micro Mobile** | `320px` | Base (`<360px`)| iPhone SE, Compact devices | 1 Column, 28px header logo, tight horizontal padding (`px-3`) |
| **Compact Mobile**| `360px` | Base | Standard Android phones | 1 Column, standard input sizing, full-width buttons |
| **Standard Mobile**| `390px` | Base | iPhone 14/15/16 | 1 Column, Floating Bottom Dock active, 16px page padding |
| **Pro Mobile** | `430px` | Base | iPhone Pro Max, Pixel XL | 1 Column, generous 20px card padding |
| **Tablet Portrait**| `768px` | `md:` | iPad, Android Tablets | 2 Column Grid, Side-drawer support, centered auth card |
| **Tablet Landscape**|`1024px`| `lg:` | iPad Pro, Small Laptops | 12-Column Grid (8+4 split), **Desktop SideNav active**, Bottom Dock hidden |
| **Standard Laptop**|`1280px`| `xl:` | MacBook Air, 13" Laptops| 12-Column Grid, `max-w-7xl` container framing |
| **Desktop HD** | `1440px`| `2xl:` | 24" Desktop Monitors | Multi-column grid, centered content container |
| **Ultra-Wide HD** | `1920px`| `3xl:` | 27"+ Ultra-wide Monitors| Bounded inside `1280px` centered container with ambient background glow |

---

## Responsive Viewport Meta Lock

```html
<!-- Enforced Viewport Meta Tag for Index / Head -->
<meta 
  name="viewport" 
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" 
/>
```

---

## Responsive Component Adaptation Rules

### 1. Navigation Switching
- `< 1024px` (`lg`): Render `<BottomNav />` floating glass dock. Hide `<SideNav />`.
- `>= 1024px` (`lg`): Render `<SideNav />` fixed left sidebar (`w-64`). Hide `<BottomNav />`.

### 2. Modal & Dialog Switching
- `< 768px` (`md`): Render `<OPBottomSheet />` pulling up from bottom screen edge with `rounded-t-[28px]`.
- `>= 768px` (`md`): Render `<OPModal />` centered in viewport with backdrop blur and `rounded-[28px]`.

---

## Usage

- Test every UI view at 320px, 390px, 768px, 1024px, and 1440px viewports.

---

## Responsive Behaviour

- Page content automatically scales and reflows seamlessly across device orientation shifts (Portrait <-> Landscape).

---

## Accessibility Notes
- Responsive layout adaptations must preserve identical DOM reading order for VoiceOver screen readers regardless of screen size.

---

## Examples

### DO
- Use `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` for responsive card grids.
- Ensure viewport meta tag includes `viewport-fit=cover` for notch integration.

### DON'T
- DO NOT use hardcoded fixed pixel widths (`w-[850px]`) on card wrappers.
- DO NOT allow horizontal scrolling on mobile viewports.

---

## Migration Notes
- Audit all page layouts across `/src/components/` to verify clean breakpoint scaling from 320px to 1920px.
