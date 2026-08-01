# OPOS Phase 5 — Reusable Component Governance

## Governed UI Components
1. **`<Illustration />`:** Mandatory wrapper for rendering any OPOS illustration.
2. **`<EmptyState />`:** Standardized container for empty views, supporting `illustrationId`.
3. **`<CoachMark />`:** Progressive onboarding hint card.
4. **`<SmartCardBanner />`:** Progressive profiling card wrapper.
5. **`<PetHeroCard />`:** Locked hero component (Requires owner approval).

## Prohibition List
- ❌ Inline SVG illustrations replacing master assets
- ❌ CSS `background-image` illustrations
- ❌ Raw `<img>` tags referencing illustration paths directly
