# Odi Pet - Alternative Product Opportunities & Clean-Slate Re-Engineering Map

This document establishes the CURRENT -> PROBLEM -> OPPORTUNITY -> POSSIBLE FUTURE DIRECTION mapping for clean-slate product re-engineering of Odi Pet.

---

## Opportunity Maps

### 1. Unified Daily Agenda Feed vs Fragmented Sub-Module Navigation
- **ITEM_ID:** `ALT-001`
- **DOMAIN:** Product Architecture & UX Domain
- **CURRENT_APPROACH:** Health, Care, Nutrition, and Estrus are divided into separate top-level tabs and nested sub-pages (`/owner/pets/[id]/vaccines`, `/owner/pets/[id]/nutrition`, etc.).
- **IDENTIFIED_PROBLEM:** Users face navigation fatigue (3–4 clicks to check off a task); daily priorities are scattered across multiple screens.
- **PRODUCT_OPPORTUNITY:** Create a single unified "Daily Pet Agenda" feed on the dashboard that aggregates all due vaccines, parasite pills, food refills, and care tasks in chronological order.
- **POSSIBLE_FUTURE_DIRECTION:** Single-screen daily feed with 1-tap swipe completion, contextual urgency sorting, and smart AI daily summaries.
- **EFFORT_IMPACT_RATING:** Medium Effort / Very High Impact

---

### 2. Camera-First Ambient Scanning vs Manual Form Input
- **ITEM_ID:** `ALT-002`
- **DOMAIN:** AI & Document Intelligence Domain
- **CURRENT_APPROACH:** Users manually select vaccine brands, enter batch lot numbers, and pick dates via forms, with OCR camera scan available as a secondary modal option.
- **IDENTIFIED_PROBLEM:** Manual typing of medical booklets is slow and prone to date typos; users often delay logging historical records.
- **PRODUCT_OPPORTUNITY:** Make "Camera OCR Snap" the default primary action for logging health records. Users snap a photo, AI extracts all fields into a review drawer, and 1 tap saves the record.
- **POSSIBLE_FUTURE_DIRECTION:** Camera-first onboarding where new users photograph their physical pet booklet during onboarding to auto-build their pet's entire historical timeline.
- **EFFORT_IMPACT_RATING:** Low Effort / High Impact

---

### 3. Local-First Offline Mutability vs Network-Dependent API Calls
- **ITEM_ID:** `ALT-003`
- **DOMAIN:** Core App / PWA Engineering Domain
- **CURRENT_APPROACH:** Form submissions make synchronous HTTP REST API calls directly to Supabase endpoints, returning error toasts if offline.
- **IDENTIFIED_PROBLEM:** App fails or stalls when users log pet care in areas with poor internet (e.g. vet clinic basements, rural walks).
- **PRODUCT_OPPORTUNITY:** Implement IndexedDB local-first mutation layer. All user actions update local state instantly and sync to Supabase in the background via Service Worker.
- **POSSIBLE_FUTURE_DIRECTION:** Zero loading spinners for mutations; instant UI updates; background offline queue synchronization.
- **EFFORT_IMPACT_RATING:** High Effort / High Impact

---

### 4. Predictive Smart Feeding & Automated Replenishment vs Manual Portion Entry
- **ITEM_ID:** `ALT-004`
- **DOMAIN:** Nutrition Domain
- **CURRENT_APPROACH:** User enters bag size (kg) and daily gram portion manually. App computes static depletion date.
- **IDENTIFIED_PROBLEM:** Portion needs change as pets age or gain/lose weight; manual portion math is often inaccurate.
- **PRODUCT_OPPORTUNITY:** AI calculates daily gram portion automatically using pet species, age, breed target weight, and activity level, dynamically updating stock depletion predictions.
- **POSSIBLE_FUTURE_DIRECTION:** 1-tap "Reorder Food Bag" integration connected to e-commerce partners before food runs out.
- **EFFORT_IMPACT_RATING:** Medium Effort / High Impact

---

### 5. Instant Shared Care Task Delegation vs Complex Co-Owner Invites
- **ITEM_ID:** `ALT-005`
- **DOMAIN:** IAM & Household Domain
- **CURRENT_APPROACH:** Inviting a family member requires creating a profile, generating invite tokens, sending links, and accepting membership (`pet_memberships`).
- **IDENTIFIED_PROBLEM:** High friction for temporary pet sitters or family members who just need to log a single pill dose while owner is away.
- **PRODUCT_OPPORTUNITY:** Generate 1-tap temporary caregiver web links (passcode-protected or magic link) sent via WhatsApp, allowing sitters to complete tasks without app registration.
- **POSSIBLE_FUTURE_DIRECTION:** Frictionless guest care links with instant push completion notification sent to primary owner's device.
- **EFFORT_IMPACT_RATING:** Medium Effort / High Impact
