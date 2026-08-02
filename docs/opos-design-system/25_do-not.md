# OPOS Design System — 25 Forbidden Patterns Catalogue (DO NOT)

> **Status:** GOVERNANCE LOCKED / OFFICIAL BLACKLIST SPECIFICATION  
> **Authority Level:** MAXIMUM  
> **Scope:** Comprehensive Blacklist of Forbidden Patterns, Anti-Patterns, and Legacy Visuals  

---

## Purpose
This document provides a comprehensive, explicit blacklist of forbidden visual patterns, anti-patterns, illegal asset usages, and bad practices for Odi.Pet. If any item listed in this catalogue appears in component code, styling definitions, or screen designs, the build or delivery must be **IMMEDIATELY REJECTED**.

---

## Scope
Governs:
- Forbidden brand assets and placeholder names (`PETPAL`, `FurEver`, `PawCare`, `PetBuddy`).
- Forbidden legacy UI primitives (Legacy buttons, legacy cards, legacy inputs).
- Forbidden typography, color, spacing, radius, and shadow anti-patterns.
- Forbidden code practices (Direct hex codes, ad-hoc inline styles, un-wrapped SVGs).

---

## The Complete Blacklist Catalogue

### 1. Forbidden Brand Assets & Placeholder Names
- ❌ **STRICTLY FORBIDDEN:** Use of fake brand names: `PETPAL`, `FurEver`, `PawCare`, `PetBuddy`, `PetCare`, `FurryFriends`.
- ❌ **STRICTLY FORBIDDEN:** AI-generated mascot logos, placeholder clip-art, or random pet SVGs downloaded from unverified sources.
- ❌ **STRICTLY FORBIDDEN:** Modifying official vector paths, skewing, or re-coloring official brand logos in `/public/brand/`.

### 2. Forbidden Legacy UI Primitives
- ❌ **STRICTLY FORBIDDEN:** Using raw `<button>` elements with arbitrary Tailwind classes (`bg-purple-600 rounded-full px-4 py-2`). Must use `OPButton`.
- ❌ **STRICTLY FORBIDDEN:** Using flat opaque white card containers (`bg-white rounded-xl shadow-sm`). Must use `OPGlassCard`.
- ❌ **STRICTLY FORBIDDEN:** Using raw un-styled `<input>` controls. Must use `OPInput` or `FormField`.
- ❌ **STRICTLY FORBIDDEN:** Using legacy custom modal wrapper divs without glass backdrop blur. Must use `OPModal` or `OPBottomSheet`.

### 3. Forbidden Typography Anti-Patterns
- ❌ **STRICTLY FORBIDDEN:** Input text font sizes smaller than 16px (`text-xs`, `text-sm` on inputs triggers iOS viewport zoom bug).
- ❌ **STRICTLY FORBIDDEN:** Mixing random font families (Times New Roman, Arial, Comic Sans, ad-hoc Google Fonts).
- ❌ **STRICTLY FORBIDDEN:** Pure black text (`#000000`). Must use Deep Navy (`#161B2A` / `--color-text-primary`).

### 4. Forbidden Color & Token Anti-Patterns
- ❌ **STRICTLY FORBIDDEN:** Direct hex code usage inside component files (e.g. `bg-[#6D3DF5]`, `text-[#123456]`). All colors must use OPOS CSS tokens.
- ❌ **STRICTLY FORBIDDEN:** Harsh pitch-black drop shadows (`shadow-[0_10px_30px_rgba(0,0,0,0.8)]`). Must use soft slate navy ambient shadows (`--shadow-soft`).

### 5. Forbidden Spacing & Radius Anti-Patterns
- ❌ **STRICTLY FORBIDDEN:** Odd pixel spacing values (`mt-[13px]`, `p-[27px]`). Must align to 8px grid (`--space-1` to `--space-12`).
- ❌ **STRICTLY FORBIDDEN:** Sharp 0px corners (`rounded-none`) on cards or buttons.

### 6. Forbidden Icon & Illustration Anti-Patterns
- ❌ **STRICTLY FORBIDDEN:** Human-centric icons (tennis rackets for activity, steak cuts for nutrition, generic bags for carriers).
- ❌ **STRICTLY FORBIDDEN:** Pasting 500-line raw SVG XML blocks directly inside page files. Must use `<OPIllustration>` or `<OPIcon>`.

---

## Anti-Pattern Summary Table

| Category | Forbidden Pattern (DON'T) | Authorized OPOS Pattern (DO) |
| :--- | :--- | :--- |
| **Brand Name** | `PETPAL` / `FurEver` / `PetBuddy` | **Odi.Pet** |
| **Logos** | AI-generated / Stock PNG logos | Frozen `/public/brand/logos/` SVGs |
| **Button** | `<button className="bg-purple-600">` | `<OPButton variant="primary">` |
| **Card** | `<div className="bg-white p-4">` | `<OPGlassCard>` |
| **Input Font**| `text-sm` (14px) on form input | **`text-base` (16px LOCKED)** |
| **Text Color** | `#000000` (Pure Black) | `--color-text-primary` (`#161B2A`) |
| **Colors** | Direct hex codes `bg-[#3800A4]` | Semantic CSS tokens `var(--color-primary)` |
| **Shadow** | Harsh black `rgba(0,0,0,0.5)` | Ambient slate `--shadow-soft` |
| **Icons** | Tennis racket for activity | `PawPrint` / `Bone` |

---

## Enforcement Protocol
If an automated CI check or human reviewer detects ANY blacklisted item in a PR or screen submission:
1. **STOP IMMEDIATELY**.
2. **REJECT DELIVERY**.
3. Output `REVISION REQUIRED` followed by the exact list of forbidden elements found.

---

## Usage

- Cross-reference code changes against this blacklist before submitting PRs or mockups.

---

## Responsive Behaviour

- Blacklist restrictions apply universally across all screen sizes.

---

## Accessibility Notes
- Blacklist prevents visual anti-patterns that breach WCAG AA accessibility rules.

---

## Examples

### DO
- Reject any code containing direct hex values or forbidden brand names.

### DON'T
- DO NOT allow forbidden patterns to enter production under any circumstances.

---

## Migration Notes
- Automatically scan the codebase and flag any remaining instances of blacklisted elements for refactoring.
