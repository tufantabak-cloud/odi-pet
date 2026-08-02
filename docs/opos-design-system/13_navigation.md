# OPOS Design System — 13 Navigation Component Specifications (`OPNavigation`, BottomNav & SideNav)

> **Status:** GOVERNANCE LOCKED / OFFICIAL NAVIGATION SPECIFICATION  
> **Authority Level:** MAXIMUM  
> **Scope:** Floating Mobile Bottom Navigation Dock, Desktop SideNav, Top Header, Breadcrumbs  

---

## Purpose
This document defines the complete navigation architecture for Odi.Pet (`OPNavigation`, `BottomNav`, `SideNav`, `PageHeader`). It details the floating glass mobile bottom dock, desktop fixed sidebar navigation, active tab highlights, indicator pills, and safe-area dock padding across the application.

---

## Scope
Governs:
- Floating Mobile Bottom Navigation Dock (`BottomNav` / `OPBottomNav`).
- Desktop Fixed Sidebar Navigation (`SideNav` / `OPSideNav`).
- Top Application Page Header (`PageHeader`).
- Breadcrumbs & Smart Back Button (`SmartBackButton`).
- Active navigation item visual states (Magenta/Purple glow, scale micro-animations).

---

## Principles

### 1. Floating Glass Dock Aesthetic (Mobile)
Mobile bottom navigation DOES NOT stick as an opaque flat rectangle to the very bottom of the screen. Instead, it floats gracefully above the bottom edge as a glass dock (`bg-white/80 backdrop-blur-xl border border-white/40 shadow-floating rounded-full mx-4 mb-4`), preserving safe-area clearance for OS gesture bars.

### 2. Active Tab Visual Feedback
Active navigation items display a vibrant brand magenta/purple icon fill (`#6D3DF5`), a soft background highlight pill (`#F2EEFF`), and a subtle dot indicator below the icon, accompanied by a soft scale transition (`scale-110`).

### 3. Cross-Platform Responsive Adaptation
- **Mobile (<768px):** Primary navigation via Floating Mobile Bottom Dock. Desktop SideNav hidden.
- **Desktop (>=1024px):** Primary navigation via Desktop Fixed Left SideNav. Mobile Bottom Dock hidden.

---

## Navigation Component Specifications

### 1. Mobile Floating Bottom Navigation Dock (`BottomNav`)
- **Container Spec:** `fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-md bg-white/85 backdrop-blur-xl border border-white/50 rounded-full shadow-floating px-4 py-2.5 flex justify-around items-center z-30`
- **Active Tab Spec:** `flex flex-col items-center gap-1 text-primary scale-105 transition-all duration-300 relative`
- **Inactive Tab Spec:** `flex flex-col items-center gap-1 text-text-secondary hover:text-text-primary transition-all duration-300`
- **Active Indicator Pill:** `w-1.5 h-1.5 bg-primary rounded-full absolute -bottom-1`

### 2. Desktop Left Sidebar Navigation (`SideNav`)
- **Container Spec:** `fixed top-0 left-0 h-screen w-64 bg-surface/90 backdrop-blur-xl border-r border-border p-6 flex flex-col justify-between z-30 hidden lg:flex`
- **Header:** Houses official horizontal brand logo (`odi-logo-horizontal.svg`).
- **Nav Link Spec:** `flex items-center gap-3.5 px-4 py-3 rounded-2xl font-semibold text-text-secondary hover:bg-primary-soft hover:text-primary transition-all duration-300`
- **Active Link Spec:** `bg-primary text-white shadow-brand hover:bg-primary-dark hover:text-white`

### 3. Page Header (`PageHeader`)
- **Container Spec:** `w-full flex items-center justify-between py-4 mb-6 border-b border-border/40`
- **Elements:**
  - Left Slot: `SmartBackButton` + Page Title (`text-h1` / 24px) + Subtitle (`text-body` / 14px).
  - Right Slot: Action buttons slot (e.g. `NotificationBell`, Profile Avatar).

---

## Component Interface Specification

```typescript
/* OPNavigation Item Interface (Logical Spec) */
export interface OPNavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  badgeCount?: number;
}
```

---

## Usage

- Render `BottomNav` inside root application layout for mobile viewports.
- Render `SideNav` inside root application layout for desktop viewports.

---

## Responsive Behaviour

- **Mobile Viewports (<768px):** Bottom Dock displayed, fixed at `bottom-4`.
- **Tablet Viewports (768px - 1023px):** SideNav or top header bar activates depending on orientation.
- **Desktop Viewports (>=1024px):** Fixed Left SideNav (`w-64`) stays mounted on all pages.

---

## Accessibility Notes
- Navigation containers must use `<nav aria-label="Ana Navigasyon">`.
- Active tabs must set `aria-current="page"`.
- Keyboard navigation must support Tab and Arrow keys to switch between navigation items.

---

## Examples

### DO
- Use floating glass dock styling for mobile bottom navigation.
- Apply `aria-current="page"` to the active navigation link.

### DON'T
- DO NOT use flat opaque black or grey bottom bars that clip the screen edges.
- DO NOT obscure the mobile dock with un-padded page content (always apply `pb-28` to scroll container).

---

## Migration Notes
- Replace all legacy un-styled bottom bars in `/src/components/` with `BottomNav` / `OPBottomNav`.
