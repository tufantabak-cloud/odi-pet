# OPOS Design System — 11 Input Component Specifications (`OPInput` & Form Controls)

> **Status:** GOVERNANCE LOCKED / OFFICIAL INPUT SPECIFICATION  
> **Authority Level:** MAXIMUM  
> **Scope:** Text Inputs, Email, Password, Search, Dropdowns, Textareas, Checkboxes, Radios, Switches, OTP, iOS Lock  

---

## Purpose
This document defines the complete form input specification for Odi.Pet (`OPInput`, `OPCheckbox`, `OPSwitch`, `OPDropdown`, etc.). It enforces a strict **16px iOS typography lock** (eliminating viewport auto-zoom bugs), frosted glass surfaces, soft focus rings, helper text validation, and cross-platform touch accessibility.

---

## Scope
Governs:
- Master `OPInput` primitive for text, email, password, and search.
- Specialty form controls (`OPCheckbox`, `OPRadio`, `OPSwitch`, `OPDropdown`, `OPTextarea`, `OPOTPInput`).
- Strict 16px font lock (`fontSize: 16px` / `text-base`).
- Focus ring glow (`focus:border-primary/50 focus:ring-4 focus:ring-primary/10`).
- Validation state indicators (Error Crimson, Success Emerald).
- Placeholder typography and disabled states.

---

## Principles

### 1. 16px iOS Viewport Lock (NON-NEGOTIABLE)
All input controls MUST render text at a minimum font size of **16px** (`1rem`). On iOS Safari, any form input with a font size smaller than 16px causes the OS to automatically zoom into the text field upon tap, breaking responsive layout viewports and forcing users to manually pinch-zoom out.

### 2. Glassmorphic Surface & Soft Focus Glow
Inputs sit on a semi-transparent glass surface (`bg-white/80 backdrop-blur-sm border border-border`) with a `--radius-sm` (12px) curve. On focus, the border transitions smoothly to brand purple (`#6D3DF5`) surrounded by a 4px soft purple ambient ring (`ring-4 ring-primary/10`).

### 3. Clear Feedback & Helper Labels
Every form field must be paired with an explicit label (`OPFormField`), optional helper text, and real-time error messaging rendered below the field in crimson red (`#E4474F`).

---

## Master Input Styling Specs

### Standard Text / Email / Password Input (`OPInput`)
- **Container Spec:** `w-full bg-surface/80 backdrop-blur-sm border border-border shadow-[0_2px_10px_rgba(0,0,0,0.02)] rounded-input h-12 px-4 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 hover:border-[#CBD5E1] transition-all duration-300 text-text-primary placeholder:text-text-secondary/60`
- **Height:** `48px` (`h-12`)
- **Font Size:** `16px` (**LOCKED**)
- **Corner Radius:** `12px` (`--radius-sm`)
- **Placeholder Color:** `#697386` with `60%` opacity

### Checkbox Control (`OPCheckbox`)
- **Visual Spec:** `w-5 h-5 rounded-md border-2 border-border text-primary focus:ring-primary/20 transition-all checked:bg-primary checked:border-primary cursor-pointer`
- **Size:** `20px x 20px` (Touch bounding box extended to `44px x 44px`)

### Switch / Toggle Control (`OPSwitch`)
- **Visual Spec:** `w-11 h-6 bg-border-main peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary`
- **Track Dimensions:** `44px x 24px`

---

## Validation State Matrix

| State | Border Token | Focus Ring Token | Helper Text Color | Icon Indicator |
| :--- | :--- | :--- | :--- | :--- |
| **Default** | `--color-border` (`#E6E9EF`) | `ring-primary/10` | `#697386` (Secondary) | None |
| **Focus** | `--color-primary` (`#6D3DF5`)| `ring-primary/20` | `#6D3DF5` (Primary) | Focus ring active |
| **Success** | `--color-success` (`#16A87A`)| `ring-success/20` | `#16A87A` (Emerald) | Checkmark SVG |
| **Error** | `--color-danger` (`#E4474F`) | `ring-danger/20` | `#E4474F` (Crimson) | Alert Circle SVG |
| **Disabled** | `#E2E8F0` | None | `#9AA3B2` (Muted) | Lock Icon |

---

## Component Interface Specification

```typescript
/* OPInput Component Prop Interface (Logical Spec) */
export interface OPInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
```

---

## Usage

- Wrap inputs inside `<OPFormField>` to ensure consistent label typography, mandatory asterisk markers, and validation error messages.

---

## Responsive Behaviour

- **Mobile Viewports (<430px):** Inputs span `100%` container width. Native iOS/Android keyboards trigger smooth viewport scroll to keep active input centered above keyboard.
- **Desktop Viewports (>=1024px):** Form fields arrange in structured 2-column grid layouts where appropriate (`grid-cols-2 gap-4`).

---

## Accessibility Notes
- All inputs must feature explicit `id` and `<label htmlFor="...">` bindings.
- Inputs with errors append `aria-invalid="true"` and `aria-describedby="[field-id]-error"`.

---

## Examples

### DO
- Enforce `font-size: 16px` (`text-base`) on every input and select element.
- Provide clear error messaging below the field when validation fails.

### DON'T
- DO NOT set input font sizes to 14px or 12px (triggers iOS auto-zoom bug).
- DO NOT use native unstyled `<input>` elements without OPOS glass wrappers.

---

## Migration Notes
- Replace all raw `<input className="p-2 border rounded">` elements across `/src/components/` with `<OPInput>`.
