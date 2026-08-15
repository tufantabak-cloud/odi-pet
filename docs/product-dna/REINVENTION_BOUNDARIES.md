# Odi Pet - Safe Reinvention Boundaries

This document defines the "Safe to Reinvent" boundaries for Odi Pet. It establishes which user interface elements, navigation architectures, onboarding flows, component compositions, and interaction patterns can be completely redesigned in a clean-slate re-engineering effort without breaking core business logic or database invariants.

---

## 1. Navigation & Information Architecture (IA) Reinvention

```
CURRENT (Deep Tab Hierarchy):
Dashboard -> Pet Selection -> Health Tab -> Sub-Categories -> Modals (3-4 clicks)

SAFE REINVENTION DIRECTION (Single-Stream Daily Agenda):
Dashboard -> Unified Timeline Feed (All Today's Tasks & Insights in 1 tap)
```

- **SAFE TO REINVENT:**
  - Replacing the multi-tab layout (Overview, Calendar, Health, Care, Nutrition, Estrus) with a single-stream "Daily Pet Feed".
  - Re-imagining the bottom navigation bar into a contextual floating action bar or unified search hub.
  - Collapsing deep sub-menus into slide-over drawers or smart search commands.
- **RESTRICTION:** Must maintain underlying domain services and canonical entity routes.

---

## 2. Onboarding & Registration Flow Reinvention

- **SAFE TO REINVENT:**
  - Transitioning the multi-step modal onboarding into a conversational AI-driven setup wizard or interactive card swipe interface.
  - Adding instant camera avatar generation and animated species illustrations.
  - Combining user registration and pet creation into a seamless single-screen flow.
- **RESTRICTION:** Must preserve strict species isolation (`cat` | `dog` check) and populate `pets_onboarding_progress`.

---

## 3. Dashboard Layout & Widget Composition

- **SAFE TO REINVENT:**
  - Re-architecting the Pet Hero Card layout, status widgets, and action shortcuts.
  - Replacing static cards with dynamic, context-aware "Smart Widgets" that reorder automatically based on urgency (e.g. overdue vaccine jumps to top position).
  - Introducing customizable drag-and-drop dashboard sections for multi-pet owners.
- **RESTRICTION:** Pet Hero Card refactoring must comply with OPOS Design Bible v1.0 standards and receive explicit user confirmation if touching locked files (`PetHeroCard.tsx`).

---

## 4. Form & Modal Input Interactions

- **SAFE TO REINVENT:**
  - Replacing standard select dropdowns and date pickers with custom tactile wheels, visual product cards, or voice input.
  - Introducing automatic camera OCR invocation as the default primary entry method for new health records.
  - Implementing instant local autosave (draft persistence) on form inputs.
- **RESTRICTION:** Human-in-the-Loop review UI (`SmartScannerModal.tsx`) must be preserved before database commit.

---

## 5. Notification & Task Management UX

- **SAFE TO REINVENT:**
  - Redesigning task completion from a standard checkbox into a swipe-to-complete or gesture-driven interaction.
  - Consolidating Web Push, in-app notifications, and calendar events into a single unified "Activity Center".
  - Adding custom sound effects or celebratory haptic feedback upon completing health tasks.
- **RESTRICTION:** Background cron atomic batching (`FOR UPDATE SKIP LOCKED`) and VAPID notification payload rules must be preserved.

---

## 6. Visual Language & Branding Polish Boundaries

- **SAFE TO REINVENT:**
  - Refining color gradient accents, glassmorphic blur intensity, and dark mode color palettes.
  - Updating component micro-interactions and smooth page transitions (`duration-200 ease-out`).
  - Expanding the official illustration library (`/public/brand/`).
- **RESTRICTION:** Must strictly enforce Plus Jakarta Sans Variable typography, 24px corner radius (`rounded-3xl`), Lucide Rounded Outline icons, and official brand assets (no unauthorized third-party pet brand logos).
