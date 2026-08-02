# OPOS Design System — 14 Form Architecture & Progressive Profiling (`OPFormField`)

> **Status:** GOVERNANCE LOCKED / OFFICIAL FORM SPECIFICATION  
> **Authority Level:** MAXIMUM  
> **Scope:** Form Layouts, Field Wrapping, Progressive Profiling, Validation, Micro-Surveys  

---

## Purpose
This document specifies the form architecture, field layout standards, validation behavior, and Progressive Profiling workflows for Odi.Pet. It details how forms collect pet health data seamlessly without overwhelming users with long, tedious forms.

---

## Scope
Governs:
- Master `OPFormField` wrapper component.
- Form layout grids (Single column mobile, multi-column desktop).
- Progressive Profiling 3-tier data collection roadmap (Onboarding -> Contextual -> Micro-Surveys).
- Real-time validation, error states, and helper text messaging.
- Sticky submit action bars for mobile.

---

## Principles

### 1. Progressive Profiling (Zero Exhaustive Long Forms)
Users MUST NEVER be forced to fill out long, empty, multi-page forms upfront. Odi.Pet enforces a progressive profiling workflow:
- **Tier 1 (Onboarding):** Absolute minimum data required to function (Species, Name, Age/DOB, Breed, Gender, Weight).
- **Tier 2 (Contextual Profiling):** Request additional data (Microchip ID, rabies certificate, primary vet contact) ONLY when the user activates a feature that requires it (e.g. Smart Card generation, SOS lost pet broadcast).
- **Tier 3 (Micro-Surveys & AI Engine):** Single-click 1-question micro-surveys integrated into daily routines, governed by question-fatigue limits.

### 2. 16px iOS Input Lock (Mandatory)
Every input control within form fields MUST enforce `font-size: 16px` (`text-base`) to prevent iOS Safari auto-zooming.

### 3. Clear Label & Validation Hierarchy
Each form field features a clear label above, mandatory red asterisk markers (`*`), and real-time validation error feedback rendered directly beneath the field.

---

## Master Form Field Component (`OPFormField`)

```typescript
/* Logical Specification of OPFormField Component */
export interface OPFormFieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
}
```

### Visual Styling Specs
- **Label Spec:** `block text-label font-semibold text-text-primary mb-2`
- **Asterisk Spec:** `text-danger ml-0.5`
- **Helper Text Spec:** `text-caption text-text-secondary mt-1.5`
- **Error Text Spec:** `text-caption text-danger font-medium mt-1.5 flex items-center gap-1 animate-fadeInUp`

---

## Form Layout Grids & Spacing

### 1. Vertical Field Spacing
- Gap between consecutive form fields: `16px` (`space-y-4` or `gap-4`).
- Gap between form field sections: `24px` (`space-y-6` or `gap-6`).

### 2. Multi-Column Form Grid (Desktop >= 768px)
```html
<form className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
  <OPFormField label="Evcil Hayvan Adı" required>
    <OPInput name="name" placeholder="Örn: Pamuk" />
  </OPFormField>
  <OPFormField label="Irk / Cins" required>
    <OPInput name="breed" placeholder="Örn: British Shorthair" />
  </OPFormField>
</form>
```

---

## Progressive Profiling Roadmap Architecture

```
[ Tier 1: Onboarding Form ]      -> Minimum 6 fields (Species, Name, Age, Breed, Gender, Weight)
                                         |
                                         v
[ Tier 2: Contextual Modal ]     -> Requested ONLY upon action (e.g., "Aşı Belgesi Yükle")
                                         |
                                         v
[ Tier 3: Daily Micro-Survey ]   -> 1-Click single question widget on Dashboard (e.g., "Pamuk bu ay kısırlaştırıldı mı?")
```

---

## Usage

- Always wrap input elements inside `<OPFormField>`.
- Integrate React Hook Form and Zod schemas for client-side and server-side validation.

---

## Responsive Behaviour

- **Mobile Viewports (<430px):** Form fields stack in 1 column. Primary submit button locks into a sticky bottom CTA container (`fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-border z-30`).
- **Desktop Viewports (>=768px):** Forms expand into structured 2-column or 3-column grid layouts.

---

## Accessibility Notes
- Form field labels must bind to input `id` attributes via `htmlFor`.
- Error messages must set `role="alert"` and link to inputs via `aria-describedby`.

---

## Examples

### DO
- Use `<OPFormField label="Kilo (kg)" required error={errors.weight?.message}>` for form controls.
- Implement progressive profiling to collect non-essential data contextually.

### DON'T
- DO NOT display 20 empty text fields on onboarding registration.
- DO NOT use unlabelled raw inputs without accessible field wrappers.

---

## Migration Notes
- Refactor all direct form inputs across `/src/components/` to use `<OPFormField>` wrappers.
