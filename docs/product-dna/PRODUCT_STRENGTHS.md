# Odi Pet - Empirical Analysis of Product Strengths

This document details the verified empirical strengths, domain depth, and architectural highlights of the Odi Pet platform, complete with exact codebase and database citations.

---

## 1. Medical Protocol & Preventive Health Rigor (v2 Engine)
- **STRENGTH:** Odi Pet does not treat vaccinations or parasite treatments as plain static text notes. It embeds a dynamic protocol engine (`vaccine_protocols`, `parasite_protocols`) that calculates dose timing based on species, target age in days, active ingredients, and brand durations.
- **CODE EVIDENCE:**
  - `src/services/vaccineProtocolService.ts`
  - `src/lib/health/parasiteService.ts`
  - `supabase/migrations/20260605000001_vaccine_parasite_protocols.sql`
  - `supabase/migrations/20260715210000_create_parasite_protocol_architecture.sql`
- **WHY IT STANDS OUT:** Guarantees medical precision for pet health routines instead of generic calendar entries.

---

## 2. Canonical Data Architecture & Archival-Only Policy
- **STRENGTH:** Enforces strict Single Source of Truth (SSOT) rules. Medical history can never be hard-deleted (`is_archived = true`). Read-only aggregation views (Dashboard, Timeline) decouple viewing from database mutations.
- **CODE EVIDENCE:**
  - `supabase/migrations/20260502000001_vaccine_os_v2.sql`
  - `supabase/migrations/20260715164000_remove_duplicate_vaccines_and_add_unique.sql`
  - `AGENTS.md` (OPOS Canonical Data Rules).
- **WHY IT STANDS OUT:** Prevents data fragmentation, protects historical health records against accidental deletion, and provides zero-loss longitudinal health history.

---

## 3. Safe Human-in-the-Loop AI Governance
- **STRENGTH:** Integrates cutting-edge Gemini Vision AI for camera document scanning while maintaining strict safety governance. AI outputs must pass human review before database mutation and feature prominent visual indicator (`Sparkles`) + medical disclaimers.
- **CODE EVIDENCE:**
  - `src/app/api/scan-document/route.ts`
  - `src/components/ai/SmartScannerModal.tsx`
  - `supabase/migrations/20260531180000_smart_scanner.sql`
- **WHY IT STANDS OUT:** Combines state-of-the-art AI convenience with zero medical liability risk.

---

## 4. Anti-Survey Fatigue & Progressive Profiling Engine
- **STRENGTH:** Features an automated profiling engine that tracks prompt frequency per user (`user_survey_stats`). It enforces strict throttling (e.g. minimum 72 hours between prompts, max 3 per month) to eliminate user question fatigue.
- **CODE EVIDENCE:**
  - `src/lib/profiling-engine.ts`
  - `supabase/migrations/20260614210707_create_user_survey_stats_table.sql`
  - `supabase/migrations/20260803000003_experience_orchestrator.sql`
- **WHY IT STANDS OUT:** Keeps onboarding fast and friction-free while continuously enriching user insights over time.

---

## 5. Multi-Owner Family Sharing & Granular RLS Security
- **STRENGTH:** Supports multi-person pet households through a robust membership model (`pet_memberships`, `pet_owners`). Roles (Owner, Co-owner, Caregiver) control permissions via PostgreSQL RLS policies.
- **CODE EVIDENCE:**
  - `src/lib/membership/`
  - `supabase/migrations/20240425000000_multi_owner.sql`
  - `supabase/migrations/20260728120000_canonical_pet_memberships_phase0.sql`
- **WHY IT STANDS OUT:** Enables seamless family co-parenting of pets while maintaining tight access control.

---

## 6. Granular Refill Engine for Nutrition & Weight Tracking
- **STRENGTH:** Calculates exact food stock depletion dates based on food brand package size and daily gram portions, scheduling automated push alerts before food runs out.
- **CODE EVIDENCE:**
  - `src/lib/nutrition/`
  - `supabase/migrations/20260723220000_food_catalog_and_assignments.sql`
  - `supabase/migrations/20260724180000_nutrition_assignment_swap.sql`
- **WHY IT STANDS OUT:** Prevents unexpected food stockouts and creates high-value recurring commerce opportunities.

---

## 7. Dynamic Experience Orchestrator & Feature Registry
- **STRENGTH:** Enterprise-grade feature entitlement registry (`feature_registry`, `experience_rules`) allowing backend-driven feature gating, plan tier checks, versioning, and A/B test rule execution.
- **CODE EVIDENCE:**
  - `src/lib/architecture/`
  - `supabase/migrations/20260806220000_feature_registry_phase1.sql`
  - `supabase/migrations/20260807040000_atomic_usage_and_integrity.sql`
- **WHY IT STANDS OUT:** Enables flexible feature monetization, feature flagging, and dynamic UI customization without redeploying code.
