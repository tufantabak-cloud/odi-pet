# OPOS Design System — 10 Button Component Specifications (`OPButton`)

> **Status:** GOVERNANCE LOCKED / OFFICIAL BUTTON SPECIFICATION  
> **Authority Level:** MAXIMUM  
> **Scope:** Primary, Secondary, Outline, Ghost, Danger, FAB, Loading & Icon Button Variants  

---

## Purpose
This document defines the complete specification for all button controls in Odi.Pet (`OPButton`). It dictates exact visual styling, sizing, corner radii, hover/active compression physics, focus indicators, loading states, and accessibility standards for interactive action triggers across the product.

---

## Scope
Governs:
- Master `OPButton` primitive and its variants:
  - **Primary CTA** (`variant="primary"`)
  - **Secondary** (`variant="secondary"`)
  - **Outline** (`variant="outline"`)
  - **Ghost** (`variant="ghost"`)
  - **Danger / Destructive** (`variant="danger"`)
  - **Floating Action Button / SOS** (`OPFAB`)
- Button sizes (`sm`, `md`, `lg`).
- Compression physics (`active:scale-[0.98]`).
- Loading spinner integration & disabled states.
- iOS touch target enforcement (minimum 44x44px).

---

## Principles

### 1. Tactile Compression Physics
All interactive buttons MUST provide immediate physical feedback upon tap/click. OPOS buttons compress slightly inward (`transform: scale(0.98)`) on press with a smooth `150ms` ease-out cubic-bezier transition, creating a satisfying tactile button feel.

### 2. High-Contrast Brand Primary CTA
Primary action buttons use solid brand purple (`#6D3DF5` / `#4F2DBA`) with crisp white typography (`#FFFFFF`), rounded `--radius-btn` (18px) corners, and a subtle glowing brand drop shadow (`shadow-brand` / `rgba(109, 61, 245, 0.25)`).

### 3. Clear State Messaging
Buttons must clearly communicate their current state: Hover, Active, Focus, Loading (with integrated spinner), and Disabled (`opacity-50 cursor-not-allowed`).

---

## Button Variants & Styling Specs

### 1. Primary CTA (`variant="primary"`)
- **Visual Spec:** `bg-primary text-white rounded-btn px-7 py-3 font-semibold hover:bg-primary-dark hover:shadow-[0_8px_16px_rgba(109,61,245,0.25)] transition-all duration-300 flex justify-center items-center active:scale-[0.98] cursor-pointer`
- **Background:** `#6D3DF5` (Hover: `#4E24C8`)
- **Text Color:** `#FFFFFF`
- **Corner Radius:** `18px` (`--radius-btn`)
- **Usage:** Primary form submit, main page call-to-action ("Giriş Yap", "Aşı Kaydet", "Devam Et").

### 2. Secondary Button (`variant="secondary"`)
- **Visual Spec:** `border border-border text-text-primary bg-primary-soft rounded-btn px-7 py-3 font-semibold hover:bg-primary/10 hover:text-primary transition-all duration-300 flex justify-center items-center shadow-sm active:scale-[0.98] cursor-pointer`
- **Background:** `#F2EEFF`
- **Text Color:** `#6D3DF5`
- **Corner Radius:** `18px`
- **Usage:** Secondary non-blocking actions ("Vazgeç", "Filtrele", "Düzenle").

### 3. Outline Button (`variant="outline"`)
- **Visual Spec:** `border border-border text-text-primary bg-surface rounded-btn px-7 py-3 font-semibold hover:border-primary/40 hover:bg-primary-soft/50 hover:text-primary transition-all duration-300 active:scale-[0.98] cursor-pointer`
- **Background:** `#FFFFFF` (Solid / Glass)
- **Text Color:** `#161B2A`
- **Border:** `1px solid #E6E9EF`

### 4. Danger / Destructive Button (`variant="danger"`)
- **Visual Spec:** `bg-danger text-white rounded-btn px-7 py-3 font-semibold hover:bg-danger/90 hover:shadow-[0_8px_16px_rgba(228,71,79,0.25)] transition-all duration-300 active:scale-[0.98] cursor-pointer`
- **Background:** `#E4474F`
- **Text Color:** `#FFFFFF`
- **Usage:** Destructive actions ("Kaydı Sil", "Profil Kaldır", "İptal Et").

### 5. Floating Action Button (`OPFAB` / SOS Variant)
- **Visual Spec:** `fixed bottom-6 right-6 w-14 h-14 bg-danger text-white rounded-full shadow-floating flex items-center justify-center z-40 active:scale-95 animate-pulseHighlight`
- **Size:** `56px x 56px` (`rounded-full`)
- **Usage:** Emergency SOS action, quick pet health log creation.

---

## Button Size Scale Matrix

| Size Token | Height | Horizontal Padding | Typography Class | Min Touch Box |
| :--- | :--- | :--- | :--- | :--- |
| **`sm`** | `36px` (`h-9`) | `16px` (`px-4`) | `text-caption` (13px semibold) | **44px x 44px** (via transparent touch padding) |
| **`md` (Default)**| `48px` (`h-12`) | `24px` (`px-6`) | `text-button` (15px semibold) | **48px x 48px** |
| **`lg`** | `56px` (`h-14`) | `32px` (`px-8`) | `text-body-lg` (16px semibold) | **56px x 56px** |

---

## Component Interface Specification

```typescript
/* OPButton Component Prop Interface (Logical Spec) */
export interface OPButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}
```

---

## Usage

- Replace all raw `<button className="...">` elements with `<OPButton variant="...">Text</OPButton>`.

---

## Responsive Behaviour

- **Mobile Viewports (<430px):** Form submit buttons automatically expand to full width (`w-full` / `fullWidth={true}`). Sticky bottom CTA bar grounds primary action above mobile gesture bar.
- **Desktop Viewports (>=1024px):** Buttons shrink-wrap around label content (`w-auto`) with fixed minimum width (`min-w-[140px]`).

---

## Accessibility Notes
- Disabled buttons set `aria-disabled="true"` and `tabIndex={-1}`.
- Loading buttons display an animated SVG spinner and append `aria-busy="true"`.
- Focus ring: `focus:outline-none focus:ring-4 focus:ring-primary/20`.

---

## Examples

### DO
- Use `<OPButton variant="primary" size="md">Aşı Ekle</OPButton>` for primary actions.
- Use `isLoading={true}` state during form submissions.

### DON'T
- DO NOT use generic Tailwind buttons (`bg-purple-600 rounded-lg p-2`).
- DO NOT create sharp-cornered 0px radius buttons.

---

## Migration Notes
- All legacy button classes (`btn-primary`, `btn-secondary`, custom purple div buttons) across `/src/components/` must be refactored to `OPButton`.
