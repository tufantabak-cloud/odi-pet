# STRUCTURED BUSINESS RULE ENGINE & POLICY SPECIFICATION

**System:** Odi Pet Platform  
**Scope:** Formal Inventory of Core Application Business Rules & Validation Engine Specifications  
**Audit Date:** August 12, 2026  
**Status:** FORENSIC BASELINE SPECIFICATION (READ-ONLY AUDIT)  

---

## EXECUTIVE RULE ENGINE MATRIX

This document details the formal business rules governing system behavior across all 13 domains. Every rule is assigned a unique `RULE_ID`, trigger event, evaluation condition, execution process, user effect, database effect, source code path, and evidence rating.

| Rule ID | Business Domain | Rule Summary | Source File Location | Evidence Rating |
| :--- | :--- | :--- | :--- | :--- |
| `RULE-IAM-001` | IAM & Access | Mandatory Profile Auto-Creation on Signup | [`all_in_one_supabase.sql:L173`](file:///c:/Odi.Pet/all_in_one_supabase.sql#L173) | `CONFIRMED` |
| `RULE-PET-001` | Pet Core | Species-Based Age Group Classification | [`src/lib/species.ts`](file:///c:/Odi.Pet/src/lib/species.ts) | `CONFIRMED` |
| `RULE-PET-002` | Pet Core | Multi-Owner RBAC Permission Hierarchy | [`20260728120000_canonical_pet_memberships_phase0.sql`](file:///c:/Odi.Pet/supabase/migrations/20260728120000_canonical_pet_memberships_phase0.sql) | `CONFIRMED` |
| `RULE-MED-001` | Medical Health | Prohibition of Hard Deletion on Medical Records | [`20260715164000_remove_duplicate_vaccines_and_add_unique.sql`](file:///c:/Odi.Pet/supabase/migrations/20260715164000_remove_duplicate_vaccines_and_add_unique.sql) | `CONFIRMED` |
| `RULE-MED-002` | Medical Health | Atomic Plan Completion & Record Creation | [`20260723190001_atomic_rpc_and_idempotency_v6.sql`](file:///c:/Odi.Pet/supabase/migrations/20260723190001_atomic_rpc_and_idempotency_v6.sql) | `CONFIRMED` |
| `RULE-PAR-001` | Parasite | Weight & Age Range Dosage Validation | [`20260715210000_create_parasite_protocol_architecture.sql`](file:///c:/Odi.Pet/supabase/migrations/20260715210000_create_parasite_protocol_architecture.sql) | `CONFIRMED` |
| `RULE-EST-001` | Estrus | Unique Open Cycle Constraint | [`20260715113000_add_unique_open_cycle_index.sql`](file:///c:/Odi.Pet/supabase/migrations/20260715113000_add_unique_open_cycle_index.sql) | `CONFIRMED` |
| `RULE-EST-002` | Estrus & Breeding | Medical Clearance for Breeding Eligibility | [`evaluateBreedingEligibility.ts`](file:///c:/Odi.Pet/src/lib/estrus/evaluateBreedingEligibility.ts) | `CONFIRMED` |
| `RULE-NUT-001` | Nutrition | 7-Day Gradual Food Transition Swap Rule | [`20260724180000_nutrition_assignment_swap.sql`](file:///c:/Odi.Pet/supabase/migrations/20260724180000_nutrition_assignment_swap.sql) | `CONFIRMED` |
| `RULE-SOS-001` | Emergency SOS | Lost Pet Report Publication Qualification | [`20260724233000_complete_lost_report_wizard.sql`](file:///c:/Odi.Pet/supabase/migrations/20260724233000_complete_lost_report_wizard.sql) | `CONFIRMED` |
| `RULE-AI-001` | AI Scanner | Pre-Execution Entitlement Quota Deduction | [`src/app/api/scan-document/route.ts`](file:///c:/Odi.Pet/src/app/api/scan-document/route.ts) | `CONFIRMED` |
| `RULE-AI-002` | AI Governance | OPOS Vol 13 Human-In-The-Loop Verification | [`src/app/api/scan-document/route.ts`](file:///c:/Odi.Pet/src/app/api/scan-document/route.ts) | `CONFIRMED` |
| `RULE-ORCH-001`| Orchestrator | Cooldown Period Enforcement on Campaigns | [`20260806123000_monthly_growth_orchestrator.sql`](file:///c:/Odi.Pet/supabase/migrations/20260806123000_monthly_growth_orchestrator.sql) | `CONFIRMED` |

---

## DETAILED BUSINESS RULE SPECIFICATIONS

### `RULE-IAM-001`: Mandatory Profile Auto-Creation
- **RULE_ID:** `RULE-IAM-001`
- **DOMAIN:** User Identity & IAM Domain
- **TRIGGER:** `AFTER INSERT ON auth.users`
- **CONDITION:** New user successfully authenticated via email/OAuth signup.
- **INPUT:** `new.id`, `new.email`, `new.raw_user_meta_data`
- **PROCESS:** Triggers PL/pgSQL function `handle_new_user()`. Parses `first_name`, `full_name`, or `name` metadata key; defaults to `'Kullanıcı'` if null; inserts row into `public.profiles`. Operates `ON CONFLICT (id) DO UPDATE`.
- **OUTPUT:** New row inserted in `profiles` table.
- **SIDE_EFFECT:** Emits `user.created` telemetry event.
- **USER_EFFECT:** User profile initialized seamlessly without signup block.
- **DATABASE_EFFECT:** Guaranteed 1-to-1 parity between `auth.users` and `public.profiles`.
- **SOURCE:** [`all_in_one_supabase.sql:L140-L176`](file:///c:/Odi.Pet/all_in_one_supabase.sql#L140-L176).
- **CONFIDENCE:** `CONFIRMED`

---

### `RULE-PET-001`: Species-Based Age Group Classification
- **RULE_ID:** `RULE-PET-001`
- **DOMAIN:** Pet Core Domain
- **TRIGGER:** Pet birth date evaluation or species profile render.
- **CONDITION:** Pet birth date known (`birth_date != NULL`).
- **INPUT:** `birth_date`, `species` (`cat` or `dog`).
- **PROCESS:** Evaluates age in calendar years:
  - **Yavru (Puppy/Kitten):** 0 - 1 year (0 <= age < 1)
  - **Yetişkin (Adult):** 1 - 7 years (1 <= age < 7)
  - **Yaşlı (Senior):** 7 - 12 years (7 <= age < 12)
  - **Yaşlı (12+) (Senior+):** 12+ years (age >= 12)
- **OUTPUT:** Category string enum (`yavru`, `yetiskin`, `yasli`, `yasli_12_plus`).
- **SIDE_EFFECT:** Drives protocol assignment algorithms.
- **USER_EFFECT:** Age badge displayed on pet profile card matching official Turkish age standards.
- **DATABASE_EFFECT:** Used in view queries and protocol matcher functions.
- **SOURCE:** [`src/lib/species.ts`](file:///c:/Odi.Pet/src/lib/species.ts), [`AGENTS.md:L11-L22`](file:///c:/Odi.Pet/AGENTS.md#L11-L22).
- **CONFIDENCE:** `CONFIRMED`

---

### `RULE-MED-001`: Medical Data Archival Only (Hard Delete Prohibition)
- **RULE_ID:** `RULE-MED-001`
- **DOMAIN:** Medical & Preventive Health Domain
- **TRIGGER:** User or system attempts deletion of a medical/health record (`vaccines`, `parasites`, `health_diseases`, `health_medications`).
- **CONDITION:** Application request targeting medical table deletion.
- **INPUT:** Target record `id`.
- **PROCESS:** Application service or database rule converts hard DELETE SQL query into an UPDATE query setting `is_archived = true` and `archived_at = NOW()`.
- **OUTPUT:** Record remains in DB with `is_archived = true`.
- **SIDE_EFFECT:** Historical medical chain integrity preserved.
- **USER_EFFECT:** Record hidden from active timeline; remains accessible in archived history.
- **DATABASE_EFFECT:** Prevents loss of diagnostic or vaccination history.
- **SOURCE:** [`supabase/migrations/20260715164000_remove_duplicate_vaccines_and_add_unique.sql`](file:///c:/Odi.Pet/supabase/migrations/20260715164000_remove_duplicate_vaccines_and_add_unique.sql), [`AGENTS.md (OPOS Vol 5 Rules)`](file:///c:/Odi.Pet/AGENTS.md).
- **CONFIDENCE:** `CONFIRMED`

---

### `RULE-MED-002`: Atomic Plan Completion & Record Creation
- **RULE_ID:** `RULE-MED-002`
- **DOMAIN:** Medical & Preventive Health Domain
- **TRIGGER:** User submits completed vaccination modal.
- **CONDITION:** Valid `pet_id`, `plan_id`, administration `date`, and `brand` provided.
- **INPUT:** `p_pet_id`, `p_plan_id`, `p_date`, `p_brand`, `p_lot_number`.
- **PROCESS:** Executes RPC `complete_vaccine_plan_and_record`. Inside a single database transaction:
  1. Inserts verified row into `vaccine_records_v2`.
  2. Updates target `plans` row `status = 'completed'` and `completed_at = NOW()`.
  3. Calculates next booster date based on vaccine protocol.
  4. Inserts new `plans` row for next scheduled booster.
- **OUTPUT:** Returns transaction status `{ success: true, record_id: UUID }`.
- **SIDE_EFFECT:** Guarantees zero orphaned plans or missing medical records.
- **USER_EFFECT:** Interface instantly reflects completed status and displays next booster date.
- **DATABASE_EFFECT:** Single atomic commit guarantees data consistency across `vaccine_records_v2` and `plans`.
- **SOURCE:** [`supabase/migrations/20260723190001_atomic_rpc_and_idempotency_v6.sql`](file:///c:/Odi.Pet/supabase/migrations/20260723190001_atomic_rpc_and_idempotency_v6.sql).
- **CONFIDENCE:** `CONFIRMED`

---

### `RULE-NUT-001`: 7-Day Gradual Food Transition Swap Rule
- **RULE_ID:** `RULE-NUT-001`
- **DOMAIN:** Nutrition & Feeding Domain
- **TRIGGER:** User assigns a new commercial pet food SKU to an active pet.
- **CONDITION:** Pet currently has an active `pet_food_assignments` row.
- **INPUT:** `p_pet_id`, `p_new_food_sku_id`.
- **PROCESS:** Executes RPC `swap_pet_food_assignment`:
  1. Updates active assignment `ended_at = NOW()`.
  2. Creates new assignment row starting `started_at = NOW()`.
  3. Calculates 7-day transition mixing schedule:
     - Days 1-2: 25% New Food / 75% Old Food
     - Days 3-4: 50% New Food / 50% Old Food
     - Days 5-6: 75% New Food / 25% Old Food
     - Day 7+: 100% New Food
- **OUTPUT:** Returns active assignment record ID.
- **SIDE_EFFECT:** Schedules daily feeding transition reminder tasks in `notification_jobs`.
- **USER_EFFECT:** Displays interactive 7-day mixing guide widget on nutrition tab to protect pet digestive health.
- **DATABASE_EFFECT:** Archives previous assignment while preserving full feeding history.
- **SOURCE:** [`supabase/migrations/20260724180000_nutrition_assignment_swap.sql`](file:///c:/Odi.Pet/supabase/migrations/20260724180000_nutrition_assignment_swap.sql).
- **CONFIDENCE:** `CONFIRMED`

---

### `RULE-EST-001`: Unique Open Estrus Cycle Constraint
- **RULE_ID:** `RULE-EST-001`
- **DOMAIN:** Reproductive & Estrus Domain
- **TRIGGER:** Attempt to insert a new row in `pet_estrus_cycles` where `status != 'completed'`.
- **CONDITION:** Target female pet already has an active cycle in `proestrus`, `estrus`, `diestrus`, or `anestrus`.
- **INPUT:** `pet_id`, `status`.
- **PROCESS:** Database partial unique index `idx_pet_estrus_cycles_unique_open` (`CREATE UNIQUE INDEX ... ON pet_estrus_cycles(pet_id) WHERE status != 'completed'`) evaluates conflict.
- **OUTPUT:** Database rejects insert with unique constraint violation if an active cycle exists.
- **SIDE_EFFECT:** Application prompts user to complete or close existing cycle before logging a new one.
- **USER_EFFECT:** Prevents overlapping or invalid estrus cycle entries.
- **DATABASE_EFFECT:** Guarantees database integrity for reproductive forecasting algorithms.
- **SOURCE:** [`supabase/migrations/20260715113000_add_unique_open_cycle_index.sql`](file:///c:/Odi.Pet/supabase/migrations/20260715113000_add_unique_open_cycle_index.sql).
- **CONFIDENCE:** `CONFIRMED`

---

### `RULE-AI-002`: Human-In-The-Loop Verification Requirement
- **RULE_ID:** `RULE-AI-002`
- **DOMAIN:** AI & Smart Scanner Domain
- **TRIGGER:** Gemini Vision OCR extraction completes on document photo.
- **CONDITION:** AI successfully parses document fields into JSON.
- **INPUT:** Gemini JSON output payload.
- **PROCESS:** API returns parsed fields to client UI. Prohibits direct SQL mutation of canonical tables (`vaccine_records_v2`, `pets`, `health_records`) during the API call. Requires explicit user action ("Confirm & Save") in client modal to execute insertion.
- **OUTPUT:** Client UI populates review form fields.
- **SIDE_EFFECT:** Ensures user inspects lot numbers, dates, and vaccine titles before saving.
- **USER_EFFECT:** User retains full control over medical record accuracy.
- **DATABASE_EFFECT:** Zero unverified AI data writes to canonical tables.
- **SOURCE:** [`src/app/api/scan-document/route.ts:L233-L240`](file:///c:/Odi.Pet/src/app/api/scan-document/route.ts#L233-L240), [`AGENTS.md (OPOS Vol 13 Rules)`](file:///c:/Odi.Pet/AGENTS.md).
- **CONFIDENCE:** `CONFIRMED`
