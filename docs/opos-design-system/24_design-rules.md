# OPOS Design System — 24 Mandatory Design Rules & Architectural Guardrails

> **Status:** GOVERNANCE LOCKED / OFFICIAL DESIGN RULES SPECIFICATION  
> **Authority Level:** MAXIMUM  
> **Scope:** Core Principles, Technical Guardrails, Design Token Policies, Self-Validation  

---

## Purpose
This document specifies the core design rules, architectural guardrails, and self-validation protocols for Odi.Pet. It acts as an operational checklist to ensure zero visual regression, rigid brand compliance, and complete OPOS token adherence across every design and code delivery.

---

## Scope
Governs:
- Master OPOS Design Rules 1 through 10.
- Mandatory pre-delivery self-validation protocol.
- Architectural guardrails for UI updates.
- Code/Design decoupling enforcement.

---

## The 10 Master OPOS Design Rules

### Rule 1: Single Source of Truth
`docs/opos-design-system/` is the absolute visual authority. No visual decision may be inferred from legacy UI or arbitrary external designs.

### Rule 2: Absolute Brand Lock
Only frozen brand assets residing in `/public/brand/` are legal. Use of PETPAL, FurEver, PawCare, PetBuddy, placeholder logos, AI-generated images, or ad-hoc SVGs is strictly forbidden.

### Rule 3: 16px iOS Viewport Lock
All text input controls, textareas, and select elements MUST enforce `font-size: 16px` (`1rem`) to prevent iOS Safari auto-zoom bugs.

### Rule 4: Soft Glassmorphism Surface Rule
All surface containers MUST leverage frosted glass styling (`bg-white/90 backdrop-blur-xl border border-white`). Plain flat opaque white boxes are forbidden.

### Rule 5: 8px Baseline Grid System
All spacing, padding, margin, and gap measurements MUST be exact multiples of 8px (or 4px micro units). Random pixel values are illegal.

### Rule 6: Tactile Compression Physics
All interactive buttons and clickable cards MUST provide physical press feedback (`active:scale-[0.98]` or `translateY(-2px)` on hover).

### Rule 7: Pet-Centric Iconography
Human-centric or generic icons (tennis rackets, steak cuts, generic bags) are banned. Only pet-dedicated icons (pet food bowls, bones, paws, syringes) are allowed.

### Rule 8: Category Soft Tint Triples
Health modules must pair domain soft background tints with matching saturated category icon fills (Blue for Vaccines, Emerald for Parasites, Crimson for Urgent).

### Rule 9: WCAG AA Accessibility Guarantee
All text combinations must pass WCAG AA contrast (4.5:1 for normal text). All touch targets must enforce a minimum 44px x 44px bounding box.

### Rule 10: OPOS Primitive-Only Composition
Views MUST be composed exclusively from official OP primitives (`OPScreen`, `OPGlassCard`, `OPButton`, `OPInput`, `OPBottomSheet`, `OPModal`, `OPBadge`, `OPIcon`, `OPIllustration`).

---

## Mandatory Pre-Delivery Self-Validation Protocol

Before presenting any screen mockup or delivering code, verify the following 6 questions:

1. **Is any legacy typography visible?** -> If YES: **STOP & REVISE**.
2. **Is any legacy button visible?** -> If YES: **STOP & REVISE**.
3. **Is any legacy input visible?** -> If YES: **STOP & REVISE**.
4. **Is any legacy card visible?** -> If YES: **STOP & REVISE**.
5. **Is any unofficial logo or placeholder asset visible?** -> If YES: **STOP & REVISE**.
6. **Is any direct un-mapped hex code or non-token style used?** -> If YES: **STOP & REVISE**.

---

## Output & Approval Policy
Never claim *"Verified"*, *"100%"*, *"Completed"*, or *"Production Ready"* unless every legacy visual primitive has been replaced by OPOS equivalents and validated against this checklist.

---

## Usage

- Execute the 6-question self-validation checklist before submitting any UI deliverable for review.

---

## Responsive Behaviour

- Rules apply universally across all screen resolutions from 320px to 1920px.

---

## Accessibility Notes
- Guardrails enforce automated 100% WCAG AA compliance across all components.

---

## Examples

### DO
- Follow all 10 Master OPOS Design Rules without exception.
- Run the self-validation protocol prior to delivery.

### DON'T
- DO NOT bypass visual rules for speed or convenience.

---

## Migration Notes
- Incorporate these 10 rules into all automated CI/CD code scanning pipelines.
