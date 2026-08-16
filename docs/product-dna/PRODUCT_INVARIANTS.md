# Odi Pet - Core Product Invariants ("Do Not Lose" Rules)

This document establishes the "Do Not Lose" product rules for Odi Pet, classified into `MUST PRESERVE`, `SHOULD PRESERVE`, and `OPTIONAL`. These invariants define the non-negotiable architectural and functional core that must survive any future redesign or clean-slate re-engineering.

---

## 1. MUST PRESERVE (Non-Negotiable Invariants)

### Invariant 1: Single Source of Truth & Archival-Only Health Records
- **INVARIANT_ID:** `INV-001`
- **NAME:** Canonical Data Model & Archival Integrity
- **CLASSIFICATION:** `MUST PRESERVE`
- **RATIONALE:** Medical history (vaccines, parasite treatments, diseases, prescriptions) can NEVER be hard-deleted or stored across multiple fragmented tables. Deletion requests MUST transition records to `is_archived = true`. Read-only dashboards and timelines aggregate data but never perform direct database mutations.
- **CODE_EVIDENCE:** `supabase/migrations/20260502000001_vaccine_os_v2.sql`, `supabase/migrations/20260715210000_create_parasite_protocol_architecture.sql`, `AGENTS.md` (OPOS Cilt 5 & 6).
- **CONFIDENCE:** `CONFIRMED`

---

### Invariant 2: Human-in-the-Loop AI Governance & Mutation Lock
- **INVARIANT_ID:** `INV-002`
- **NAME:** Safe AI Integration & Human Approval Gate
- **CLASSIFICATION:** `MUST PRESERVE`
- **RATIONALE:** AI systems (OCR Scanner, Gemini Vision, AI Vet Assistant) must NEVER execute autonomous or unapproved writes to the database. All AI-extracted data MUST pass through a Human-in-the-Loop review UI, display the Mor Yıldız (`Sparkles`) visual indicator, and present mandatory medical disclaimers.
- **CODE_EVIDENCE:** `src/app/api/scan-document/route.ts`, `src/components/ai/SmartScannerModal.tsx`, `AGENTS.md` (OPOS Cilt 13).
- **CONFIDENCE:** `CONFIRMED`

---

### Invariant 3: Row Level Security (RLS) & Multi-Owner Household Isolation
- **INVARIANT_ID:** `INV-003`
- **NAME:** RLS Security & Shared Household Access
- **CLASSIFICATION:** `MUST PRESERVE`
- **RATIONALE:** Every database table containing pet or user data must have strict Row Level Security (RLS) policies enforcing household ownership via `pet_owners` / `pet_memberships`. Unauthenticated or cross-account access MUST be blocked at the PostgreSQL engine level.
- **CODE_EVIDENCE:** `supabase/migrations/20260529000002_enforce_rls_priority_1.sql`, `supabase/migrations/20260728120000_canonical_pet_memberships_phase0.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### Invariant 4: Strict Species Isolation (Cats & Dogs Only)
- **INVARIANT_ID:** `INV-004`
- **NAME:** Cat and Dog Species Boundaries
- **CLASSIFICATION:** `MUST PRESERVE`
- **RATIONALE:** The core product is strictly built for Cats (`cat`) and Dogs (`dog`). Age scale algorithms (`Yavru`, `Yetişkin`, `Yaşlı`), vaccine protocol templates, and parasite dosage tables depend on strict species validation.
- **CODE_EVIDENCE:** `supabase/migrations/20240420000002_restrict_species.sql` (`CHECK (species IN ('cat', 'dog'))`), `src/lib/species.ts`, `AGENTS.md` (Köpek & Kedi Yaş Skalası).
- **CONFIDENCE:** `CONFIRMED`

---

## 2. SHOULD PRESERVE (High-Value Operational Invariants)

### Invariant 5: Progressive Profiling & Anti-Question Fatigue
- **INVARIANT_ID:** `INV-005`
- **NAME:** Contextual Micro-Surveys & Throttled Profiling
- **CLASSIFICATION:** `SHOULD PRESERVE`
- **RATIONALE:** Onboarding must remain fast and short. Contextual data collection prompts must be throttled by user survey fatigue limits (`user_survey_stats`) to maintain high user retention.
- **CODE_EVIDENCE:** `src/lib/profiling-engine.ts`, `supabase/migrations/20260614210707_create_user_survey_stats_table.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### Invariant 6: Granular Refill Engine for Food Stock
- **INVARIANT_ID:** `INV-006`
- **NAME:** Food Package Depletion & Refill Alert Logic
- **CLASSIFICATION:** `SHOULD PRESERVE`
- **RATIONALE:** Daily portioning and package weight tracking provide automated refill alerts, preventing pet food stockouts and creating a key monetization anchor.
- **CODE_EVIDENCE:** `src/lib/nutrition/`, `supabase/migrations/20260723220000_food_catalog_and_assignments.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### Invariant 7: OPOS Design Bible v1.0 Foundational Tokens
- **INVARIANT_ID:** `INV-007`
- **NAME:** 24px Corner Radius & 8pt Grid Rhythm
- **CLASSIFICATION:** `SHOULD PRESERVE`
- **RATIONALE:** The soft, premium visual feel relies on 24px radius containers (`rounded-3xl`), 8pt grid rhythm (`p-2`, `p-4`, `p-6`), and Lucide rounded outline icons. Keyframe animations must be subtle (`active:scale-[0.98]`).
- **CODE_EVIDENCE:** `AGENTS.md` (OPOS Foundations & Token Anayasası), `src/app/globals.css`.
- **CONFIDENCE:** `CONFIRMED`

---

## 3. OPTIONAL (Safe to Alter / Adapt)

### Invariant 8: Specific Navigation Hierarchy & Module Layouts
- **INVARIANT_ID:** `INV-008`
- **NAME:** Tab Bar Navigation & Dashboard Layout Structure
- **CLASSIFICATION:** `OPTIONAL`
- **RATIONALE:** The current multi-tab arrangement (Overview, Calendar, Health, Care, Nutrition) can be freely redesigned into a unified single-stream daily agenda feed or alternative dashboard layout without violating core invariants.
- **CODE_EVIDENCE:** `src/components/navigation/`, `src/app/(app)/owner/pets/[id]/page.tsx`.
- **CONFIDENCE:** `HIGH CONFIDENCE`

---

### Invariant 9: Legacy Survey Toast Visual Presentation
- **INVARIANT_ID:** `INV-009`
- **NAME:** Micro-Survey Popup Presentation Component
- **CLASSIFICATION:** `OPTIONAL`
- **RATIONALE:** While the underlying throttling rules (`INV-005`) must be preserved, the visual UI container for micro-surveys can be altered to fit new visual themes.
- **CODE_EVIDENCE:** `src/components/architecture/ExperienceOrchestratorHost.tsx`.
- **CONFIDENCE:** `HIGH CONFIDENCE`
