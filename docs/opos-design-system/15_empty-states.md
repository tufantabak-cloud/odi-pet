# OPOS Design System — 15 Empty States & Error Feedback (`EmptyState` & `ErrorState`)

> **Status:** GOVERNANCE LOCKED / OFFICIAL EMPTY STATE SPECIFICATION  
> **Authority Level:** MAXIMUM  
> **Scope:** Zero Data Layouts, Error Feedback Banners, Skeleton Loaders, Retry Actions  

---

## Purpose
This document specifies empty states, zero-data views, error feedback screens, and loading skeletons for Odi.Pet (`EmptyState`, `ErrorState`, `Skeleton`). It guarantees that users never encounter blank screens, raw unhandled error tracebacks, or confusing empty lists.

---

## Scope
Governs:
- Master `EmptyState` component architecture.
- Master `ErrorState` component architecture.
- Master `Skeleton` loading state primitive.
- Official pet-centric empty state illustrations (`/public/brand/illustrations/empty-state-pet.svg`).
- Action CTA triggers on empty/error states ("Aşı Ekle", "Yeniden Deneyin").

---

## Principles

### 1. Encouraging & Helpful Zero States
Empty states are not failures; they are opportunities to guide the user toward their first action. Every empty list (no pets, no vaccine records, no medical logs) MUST display a warm pet-centric illustration, an encouraging title, a explanatory description, and a clear primary action button.

### 2. Graceful Error Recovery
When a network or API request fails, Odi.Pet displays a clean, user-friendly `ErrorState` card featuring an error icon, a clear Turkish explanation (e.g. *"Bağlantı Hatası: Veriler alınamadı"*), and a primary retry button (`OPButton` with `leftIcon={<RefreshCw />}`). Raw JSON errors or broken blank frames are strictly illegal.

### 3. Skeleton Loading Smoothness
During data fetching, views MUST NOT display harsh flickering blank layouts or full-screen spinner blockades. Instead, content cards render matching `Skeleton` pulse blocks (`bg-border-main/60 animate-pulse rounded-card`) to preserve layout structure.

---

## Master Empty State Spec (`EmptyState`)

- **Container Spec:** `w-full p-8 sm:p-12 bg-surface/80 backdrop-blur-xl rounded-card border border-white/40 shadow-soft flex flex-col items-center justify-center text-center animate-fadeInUp`
- **Illustration Spec:** `w-40 h-40 sm:w-48 sm:h-48 mb-6 object-contain`
- **Title Spec:** `text-h2 font-bold text-text-primary mb-2`
- **Description Spec:** `text-body text-text-secondary max-w-sm mb-6`
- **CTA Spec:** `<OPButton variant="primary" size="md">... Primary Action ...</OPButton>`

---

## Master Error State Spec (`ErrorState`)

- **Container Spec:** `w-full p-6 bg-danger-soft/60 backdrop-blur-md rounded-card border border-danger/20 flex flex-col items-center justify-center text-center animate-shakeIn`
- **Icon Spec:** `w-12 h-12 text-danger mb-3 p-3 bg-danger/10 rounded-full`
- **Title Spec:** `text-h3 font-bold text-text-primary mb-1`
- **Description Spec:** `text-body text-text-secondary mb-4`
- **Action Spec:** `<OPButton variant="outline" size="sm" onClick={retry}>Yeniden Deneyin</OPButton>`

---

## Master Skeleton Primitive (`Skeleton`)

- **Visual Spec:** `bg-surface-secondary animate-pulse rounded-md`
- **Variants:**
  - Card Skeleton: `w-full h-40 rounded-card`
  - Text Line Skeleton: `w-3/4 h-4 rounded-md`
  - Avatar Skeleton: `w-12 h-12 rounded-full`

---

## Component Interface Specification

```typescript
/* EmptyState Component Prop Interface (Logical Spec) */
export interface EmptyStateProps {
  illustration?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}
```

---

## Usage

- Use `EmptyState` whenever an array of records (e.g. `vaccines.length === 0`) returns empty.
- Use `ErrorState` inside error boundaries or when query fetching fails.

---

## Responsive Behaviour

- **Mobile Viewports (<430px):** Empty state illustration resizes to `140px x 140px`. Padding reduces to `24px` (`p-6`).
- **Desktop Viewports (>=1024px):** Empty state illustration renders at `192px x 192px` inside a centered card container.

---

## Accessibility Notes
- Empty state illustrations must feature descriptive alt tags or `aria-hidden="true"` when purely decorative.
- Error state containers must include `role="alert"`.

---

## Examples

### DO
- Render `<EmptyState title="Henüz Aşı Kaydı Bulunmuyor" description="Pamuk'un aşı takvimini takip etmek için ilk aşıyı ekleyin." actionLabel="Aşı Ekle" onAction={openModal} />`.
- Show skeleton placeholders while data is loading.

### DON'T
- DO NOT display empty blank white space when a list has zero items.
- DO NOT display raw technical stack traces (`TypeError: Cannot read property 'map' of undefined`).

---

## Migration Notes
- Refactor all ad-hoc empty divs and raw error text across `/src/components/` into `EmptyState` and `ErrorState` components.
