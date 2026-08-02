# OPOS Design System — 08 Elevation & Shadow Architecture

> **Status:** GOVERNANCE LOCKED / OFFICIAL ELEVATION SPECIFICATION  
> **Authority Level:** MAXIMUM  
> **Scope:** Drop Shadows, Y-Axis Depth, Layering Z-Index, Ambient Lighting  

---

## Purpose
This document specifies the elevation hierarchy and shadow system for Odi.Pet. It defines how visual surfaces float above the canvas backdrop using soft, multi-layered ambient drop shadows and z-index stacking rules, giving the application a refined tactile depth without heavy, harsh black shadows.

---

## Scope
Governs:
- Master shadow scale (`--shadow-sm`, `--shadow-soft`, `--shadow-medium`, `--shadow-floating`).
- Layering Z-index hierarchy (Base canvas to Toast overlay).
- Hover & active elevation state transitions.
- Light source ambient shadow colors (Slate Navy tints instead of pure black).

---

## Principles

### 1. Soft Ambient Depth (No Pure Black Shadows)
Shadows must feel light, natural, and diffused. OPOS uses multi-stop drop shadows tinted with deep slate navy (`rgba(15, 23, 42, 0.04)` to `rgba(16, 24, 40, 0.14)`). Heavy, pitch-black drop shadows (`rgba(0, 0, 0, 0.5)`) are strictly forbidden.

### 2. Physical Lift on Interaction
Interactive cards and buttons physically rise towards the user when hovered or focused (y-axis translation `-2px` to `-4px` accompanied by expanded shadow diffusion), and compress downward (`scale(0.98)`) when pressed.

---

## Master Shadow Token Registry

| Token Name | Shadow Specification (CSS) | Tailwind Utility Class | Usage Context |
| :--- | :--- | :--- | :--- |
| **`--shadow-sm`** | `0 1px 2px rgba(16, 24, 40, 0.04)` | `shadow-sm` | Small badges, list rows, inactive inputs |
| **`--shadow-soft`** | `0 4px 20px -2px rgba(15, 23, 42, 0.04)` | `shadow-soft` | **Standard OPGlassCard**, Insight Widgets |
| **`--shadow-medium`**| `0 12px 32px -4px rgba(15, 23, 42, 0.08)` | `shadow-medium` | **Card Hover State**, Dropdown Menus, Popovers |
| **`--shadow-floating`**| `0 12px 32px rgba(16, 24, 40, 0.14)` | `shadow-floating` | **OPBottomSheet**, **OPModal**, Sticky Navigation Dock |
| **`--shadow-brand`** | `0 8px 16px rgba(109, 61, 245, 0.25)` | `shadow-brand` | **Primary OPButton Hover State** |

---

## Z-Index Layering Stack Architecture

| Layer Tier | Z-Index Value | Component Examples | Purpose |
| :--- | :--- | :--- | :--- |
| **Base Canvas** | `z-0` | Canvas background, Watermarks | Base background plane |
| **Default Content**| `z-10` | Standard cards, text blocks, grid rows | Resting content elevation |
| **Sticky Headers** | `z-20` | Section headers, sub-navigation tabs | Sticky layout elements |
| **Top Nav / SideNav**| `z-30` | Master header navigation bar, SideNav dock | App-level fixed controls |
| **Floating Action**| `z-40` | Floating SOS button (`OPFAB`), Sticky CTA Bar | High-priority interactive actions |
| **Modal Backdrops**| `z-50` | `OPModal` overlay backdrop, `OPBottomSheet` backdrop | Dimmed background filter |
| **Drawer / Dialog**| `z-60` | Modal surface container, Sheet content | Primary focal overlays |
| **Toasts & Tooltips**| `z-70` | Toast notifications, System alerts | Top-level popovers |

---

## Usage

- **Hover Elevation Transition:**
```css
.card-hover-lift {
  box-shadow: var(--shadow-soft);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.card-hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}
```

---

## Responsive Behaviour

- **Mobile Viewports (<430px):** Mobile drawers utilize `--shadow-floating` to project high contrast elevation over dimmed backdrop filters.
- **Desktop Viewports (>=1024px):** Desktop modals rely on both `--shadow-floating` and glass backdrop blur (`backdrop-blur-2xl`).

---

## Accessibility Notes
- Drop shadows must never replace explicit border lines when border contrast is required for low-vision accessibility. Always pair soft shadows with subtle stroke lines (`border border-border`).

---

## Examples

### DO
- Use `shadow-soft` for resting glass cards and `shadow-medium` on hover.
- Apply brand-tinted drop shadow (`rgba(109, 61, 245, 0.25)`) to primary CTA buttons.

### DON'T
- DO NOT use harsh black drop shadows (`shadow-[0_10px_30px_rgba(0,0,0,0.8)]`).
- DO NOT assign arbitrary high z-indexes like `z-[99999]`.

---

## Migration Notes
- Replace all legacy `shadow-lg`, `shadow-2xl`, and ad-hoc black shadow utilities with official OPOS elevation tokens.
