# Odi Pet - Product Principles

This document articulates the formal Product Principles governing Odi Pet. The principles are categorized into Confirmed (strictly backed by codebase evidence), Inferred (derived logically from system design & OPOS rules), and Future (recommended guidelines for clean-slate product re-engineering).

---

## Category A: Confirmed Product Principles (Supported by Codebase Evidence)

### 1. Single Source of Truth & Zero Fragmented Health State
- **PRINCIPLE_ID:** `PRIN-001`
- **PRINCIPLE:** Medical and health data must have exactly one canonical table and single mutation service across the entire platform. Read-only dashboards and timelines aggregate data but NEVER mutate database rows directly.
- **CATEGORY:** `CONFIRMED`
- **EVIDENCE:** `supabase/migrations/20260715164000_remove_duplicate_vaccines_and_add_unique.sql`, `supabase/migrations/20260715210000_create_parasite_protocol_architecture.sql`, `AGENTS.md` (OPOS Canonical Data Rules).
- **WHY_IT_MATTERS:** Prevents conflicting health records, data corruption, and erroneous dosage calculation across multiple devices.
- **CONFIDENCE:** `CONFIRMED`

---

### 2. Archival-Only Medical History (Hard Delete Prohibited)
- **PRINCIPLE_ID:** `PRIN-002`
- **PRINCIPLE:** Pet health, vaccine, parasite, and prescription history can NEVER be hard-deleted from the database. Deletion requests transition status to `is_archived = true` with timestamps to preserve complete longitudinal medical integrity.
- **CATEGORY:** `CONFIRMED`
- **EVIDENCE:** `supabase/migrations/20260502000001_vaccine_os_v2.sql` (`is_archived` column), `supabase/migrations/20260715210000_create_parasite_protocol_architecture.sql`, `AGENTS.md` (OPOS Cilt 5 & 6).
- **WHY_IT_MATTERS:** Ensures complete diagnostic traceability for veterinarians and prevents accidental loss of critical medical history.
- **CONFIDENCE:** `CONFIRMED`

---

### 3. Human-in-the-Loop AI Governance & Autonomous Mutation Lock
- **PRINCIPLE_ID:** `PRIN-003`
- **PRINCIPLE:** AI systems (OCR Scanner, Gemini Vision, AI Vet Assistant) may NEVER execute direct database writes without explicit user review and confirmation. AI outputs must be visually flagged with the Mor Yıldız (`Sparkles`) indicator and disclaimers.
- **CATEGORY:** `CONFIRMED`
- **EVIDENCE:** `src/app/api/scan-document/route.ts`, `src/components/ai/SmartScannerModal.tsx`, `AGENTS.md` (OPOS Cilt 13 AI Governance).
- **WHY_IT_MATTERS:** Protects pet safety against AI hallucinations or OCR misinterpretations in medical dosages.
- **CONFIDENCE:** `CONFIRMED`

---

### 4. Progressive Profiling & Anti-Question Fatigue
- **PRINCIPLE_ID:** `PRIN-004`
- **PRINCIPLE:** Users must never be subjected to long initial survey forms. Onboarding requires minimum data (Species, Name, Age, Breed). Subsequent data collection must occur contextually in micro-surveys throttled by strict frequency limits.
- **CATEGORY:** `CONFIRMED`
- **EVIDENCE:** `src/lib/profiling-engine.ts`, `supabase/migrations/20260614210707_create_user_survey_stats_table.sql`, `AGENTS.md` (Veri Toplama Stratejisi).
- **WHY_IT_MATTERS:** Maximizes onboarding conversion while continuously enriching user profile over time without user exhaustion.
- **CONFIDENCE:** `CONFIRMED`

---

### 5. Strict Species Isolation (Cat & Dog Only)
- **PRINCIPLE_ID:** `PRIN-005`
- **PRINCIPLE:** The core ecosystem strictly supports Cats (`cat`) and Dogs (`dog`). Database constraints enforce species validation at the schema level to guarantee species-tailored health protocols and age scales.
- **CATEGORY:** `CONFIRMED`
- **EVIDENCE:** `supabase/migrations/20240420000002_restrict_species.sql` (`CHECK (species IN ('cat', 'dog'))`), `src/lib/species.ts`, `AGENTS.md` (Köpek & Kedi Yaş Skalası).
- **WHY_IT_MATTERS:** Ensures 100% precision in medical brand suggestions, dosage algorithms, and growth curves without generic dilution.
- **CONFIDENCE:** `CONFIRMED`

---

## Category B: Inferred Product Principles (Derived Logically from System Architecture)

### 6. Mobile-First Tactile Feedback & Predictable Motion
- **PRINCIPLE_ID:** `PRIN-006`
- **PRINCIPLE:** Interactive elements must provide physical tactile feedback on press (`active:scale-[0.98]`) and smooth elevation transitions on hover (`duration-200 ease-out`). Motion must feel responsive without aggressive or distracting visual animations.
- **CATEGORY:** `INFERRED`
- **EVIDENCE:** `AGENTS.md` (OPOS Foundations & Token Anayasası), `src/components/pets/PetHeroCard.tsx`.
- **WHY_IT_MATTERS:** Delivers a premium, native app-like touch experience across PWA and mobile browsers.
- **CONFIDENCE:** `HIGH CONFIDENCE`

---

### 7. Soft Glassmorphic Tonal Stacking Over Heavy Shadows
- **PRINCIPLE_ID:** `PRIN-007`
- **PRINCIPLE:** Interface depth must be achieved through semi-transparent camification (`backdrop-blur-md`), subtle borders (`border-slate-100`), and widely diffused soft shadows (`rgba(15,23,42,0.04)`), strictly prohibiting heavy black shadows (`shadow-2xl`).
- **CATEGORY:** `INFERRED`
- **EVIDENCE:** `AGENTS.md` (OPOS Design Bible v1.0), `src/app/globals.css`.
- **WHY_IT_MATTERS:** Creates an inviting, modern aesthetic that feels light, clean, and trustworthy for pet parents.
- **CONFIDENCE:** `HIGH CONFIDENCE`

---

### 8. Role-Based Shared Household Ownership
- **PRINCIPLE_ID:** `PRIN-008`
- **PRINCIPLE:** Pets are owned by households, not isolated individuals. Family members can be invited as Co-owners or Caregivers with distinct permission levels enforced by Row Level Security (RLS).
- **CATEGORY:** `INFERRED`
- **EVIDENCE:** `supabase/migrations/20240425000000_multi_owner.sql`, `supabase/migrations/20260728120000_canonical_pet_memberships_phase0.sql`.
- **WHY_IT_MATTERS:** Reflects real-world co-parenting behaviors and creates an organic household growth engine.
- **CONFIDENCE:** `HIGH CONFIDENCE`

---

## Category C: Future Product Principles (Recommended for Clean-Slate Redesign)

### 9. Zero-Click Ambient Context & Predictive Task Automation
- **PRINCIPLE_ID:** `PRIN-009`
- **PRINCIPLE:** The system should infer care needs based on pet age, weight trends, and weather/seasonality, auto-suggesting upcoming tasks without requiring manual configuration by the user.
- **CATEGORY:** `FUTURE`
- **EVIDENCE:** Inferred from `src/lib/insight-engine.ts` potential.
- **WHY_IT_MATTERS:** Shifts user effort from manual logging to effortless 1-tap confirmation.
- **CONFIDENCE:** `INFERRED`

---

### 10. Instant Offline First & Optimistic UI Mutability
- **PRINCIPLE_ID:** `PRIN-010`
- **PRINCIPLE:** All user mutations (log weight, mark vaccine given, add note) must render instantaneously on UI via local IndexedDB storage and background sync queues, eliminating network loading spinners.
- **CATEGORY:** `FUTURE`
- **EVIDENCE:** Inferred from offline friction analysis (`FAIL-012`).
- **WHY_IT_MATTERS:** Provides true native mobile app speed and zero friction in low-connectivity areas (e.g. vet clinic basements).
- **CONFIDENCE:** `INFERRED`

---

### 11. Unified Single-Stream Daily Agenda
- **PRINCIPLE_ID:** `PRIN-011`
- **PRINCIPLE:** Health, nutrition, care, and estrus events should merge into a single chronological stream on the home screen, eliminating navigation depth across separate module tabs.
- **CATEGORY:** `FUTURE`
- **EVIDENCE:** Inferred from navigation redundancy audit.
- **WHY_IT_MATTERS:** Delivers instant clarity on "What does my pet need today?" in under 3 seconds.
- **CONFIDENCE:** `INFERRED`
