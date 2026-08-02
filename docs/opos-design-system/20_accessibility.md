# OPOS Design System — 20 Accessibility Standards & WCAG AA Compliance

> **Status:** GOVERNANCE LOCKED / OFFICIAL ACCESSIBILITY SPECIFICATION  
> **Authority Level:** MAXIMUM  
> **Scope:** WCAG 2.1 AA Standards, Contrast Ratios, ARIA Roles, Focus Indicators, Touch Targets, Screen Readers  

---

## Purpose
This document establishes the mandatory accessibility specifications for Odi.Pet. It enforces compliance with WCAG 2.1 Level AA guidelines, ensuring that users with low vision, motor impairments, cognitive differences, or assistive devices (VoiceOver, TalkBack, NVDA) can navigate, understand, and operate every feature seamlessly.

---

## Scope
Governs:
- Color contrast ratio enforcement (4.5:1 text, 3:1 graphical controls).
- Minimum touch target dimensions (44px x 44px).
- Visible keyboard focus indicator rings (`focus:ring-4 focus:ring-primary/20`).
- ARIA semantics, roles, states, and properties (`aria-label`, `aria-expanded`, `aria-busy`, `role="dialog"`).
- Keyboard navigation shortcuts and logical focus traps for modals.
- Screen reader announcements for dynamic alerts and toasts.

---

## Principles

### 1. Universal Design Accessibility
Accessibility is not an afterthought; it is built into every OPOS primitive by default. Components MUST pass automated axe-core and lighthouse accessibility audits with a 100% score before deployment.

### 2. Strict 44px Minimum Touch Target Rule
All interactive elements—buttons, icon toggles, checkbox bounding boxes, drop-down options, navigation items—MUST provide a minimum touch bounding target of **44px x 44px** per iOS Human Interface & Android Material guidelines.

### 3. Clear Keyboard Focus Traps
When a modal dialog (`OPModal`) or bottom sheet (`OPBottomSheet`) opens, keyboard focus MUST be trapped inside the overlay, automatically focusing the first interactive element and returning focus to the trigger button upon close.

---

## WCAG 2.1 AA Compliance Checklist & Standards

| Requirement Category | Standard Specification | Enforced Metric | Implementation Pattern |
| :--- | :--- | :--- | :--- |
| **Normal Text Contrast**| WCAG 1.4.3 | Minimum **4.5:1** ratio | Primary Navy (`#161B2A`) on Light Canvas (`#F6F7FA`) |
| **Large Text Contrast** | WCAG 1.4.3 | Minimum **3.0:1** ratio | Bold Headings 18px+ |
| **UI Components Contrast**| WCAG 1.4.11| Minimum **3.0:1** ratio | Button borders, input focus rings |
| **Touch Target Size** | WCAG 2.5.5 | Minimum **44px x 44px** | Enforced via touch padding `p-2` or `min-h-[44px]` |
| **Focus Indicator** | WCAG 2.4.7 | Visible 4px focus ring | `focus:ring-4 focus:ring-primary/20 focus:outline-none` |
| **Form Input Binding** | WCAG 1.3.1 | Explicit Label-Input link | `<label htmlFor="email">` paired with `<input id="email">` |
| **Error Feedback** | WCAG 3.3.1 | `role="alert"` + live region| Real-time validation message below input |
| **Screen Reader Text** | WCAG 1.1.1 | Text alternative for SVGs | `alt="..."` or `aria-label="..."` |

---

## Modal Focus Trap & Keyboard Navigation Rules

```typescript
/* Keyboard Navigation Rules for OPModal & OPBottomSheet */
- ESC Key: Triggers modal close handler.
- TAB Key: Cycles forward through interactive elements inside modal frame.
- SHIFT + TAB: Cycles backward through interactive elements.
- Initial Focus: Automatically set to modal primary input or close button.
```

---

## Screen Reader Announcement Patterns

```html
<!-- Live Region for Form Error Alerts -->
<div role="alert" aria-live="assertive" className="text-danger text-caption">
  E-posta adresi biçimi geçersiz.
</div>

<!-- Dynamic Toast Notification Announcement -->
<div role="status" aria-live="polite" className="sr-only">
  Aşı kaydı başarıyla eklendi.
</div>
```

---

## Usage

- Test all screens using keyboard navigation (`TAB`, `SHIFT+TAB`, `ENTER`, `SPACEBAR`, `ESC`).
- Verify VoiceOver (iOS/macOS) and TalkBack (Android) announce element labels correctly.

---

## Responsive Behaviour

- Touch target sizes (`44px x 44px`) remain strictly enforced across both desktop mouse pointer and mobile touch viewports.

---

## Accessibility Notes
- Color MUST NEVER be used as the sole visual indicator of state. Always pair color changes with text labels or distinct SVG icons (e.g. Red border + Alert Circle icon for input errors).

---

## Examples

### DO
- Provide `aria-label="Aşı Detaylarını Kapat"` on close icon buttons.
- Enforce 44px touch targets on icon-only buttons.

### DON'T
- DO NOT remove outline focus rings (`outline-none` without custom focus ring fallback).
- DO NOT use tiny 20px touch buttons on mobile screens.

---

## Migration Notes
- Audit all custom components in `/src/components/` and inject missing ARIA attributes, label bindings, and focus ring utilities.
