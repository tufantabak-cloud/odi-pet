# ADR-001: Sprint X Architecture Decisions & Guard Rails

**Status:** APPROVED / ACTIVE  
**Date:** 1 Ağustos 2026  
**Author:** Antigravity Architecture Team  
**Scope:** Odi.Pet Operational Platform Optimization (Sprint X.1 — X.5)  

---

## Executive Summary

Sprint X introduced core architecture improvements to eliminate data corruption, duplicate execution, un-normalized string inputs, and uncoordinated cron background tasks. This Architecture Decision Record (ADR) establishes the permanent architectural invariants of Odi.Pet.

---

## 1. Architecture Invariants

### 1.1 Unified Orchestrator Architecture
- **Decision:** All background cron tasks MUST be orchestrated through the central `/api/cron/orchestrator` pipeline.
- **Rule:** No standalone background cron route may be scheduled in `vercel.json` except `/api/cron/orchestrator`.
- **Policy:** Decommissioned cron routes MUST return a fail-closed response: `{ status: 'disabled', reason: '...' }`.

### 1.2 Unified Vaccine Record Service (`createVaccineRecord`)
- **Decision:** `src/lib/vaccines/createVaccineRecord.ts` is the SINGLE SOURCE OF TRUTH for writing vaccine records to `vaccine_records_v2`.
- **Rule:** Direct raw insertions into `vaccine_records_v2` bypassing `createVaccineRecord()` from user-facing flows are STRICTLY PROHIBITED.
- **Benefits:** Enforces brand ID lookup/fallback normalization, protocol matching, and prevents trigger failures.

### 1.3 Confidence Level Translation Layer
- **Decision:** `src/lib/vaccines/confidenceLevels.ts` (`normalizeConfidenceLevel()`) is the SINGLE SOURCE OF TRUTH for confidence level normalization.
- **Rule:** All confidence level values inserted into DB MUST be normalized to match the database `CHECK (confidence_level IN ('verified', 'user_reported', 'estimated'))` constraint.
- **Mapping:**
  - `'verified'`, `'high'` → `'verified'`
  - `'user_reported'`, `'manual'`, `'medium'`, `'low'` → `'user_reported'`
  - `'estimated'`, `'ocr'`, `'system'` → `'estimated'`
  - Fallback / null / invalid → `'user_reported'`

### 1.4 Legal Required Rabies Vaccination Planning
- **Decision:** Kuduz (`DOG_RABIES`, `CAT_RABIES`) automatic planning is included alongside core protocols in `src/features/pets/vaccination-algorithm.ts`.
- **Rule:** `is_core` domain property semantic meaning is UNTOUCHED (`is_core: t.mandatory_level === 'core'`). `legal_required` filtering is managed exclusively via `isIncluded` with feature flag `ENABLE_LEGAL_REQUIRED_PLANS`.
- **Safety:** Setting `ENABLE_LEGAL_REQUIRED_PLANS=false` restores legacy pre-X.2 core-only planning bit-for-bit.

### 1.5 Overdue Notification Recovery Architecture
- **Decision:** `src/lib/notifications/recoverOverdueNotifications.ts` is a pure orchestration layer that delegates all notification creation to canonical `createOverdueVaccineNotifications()`.
- **Rule:** Zero business logic duplication (%0 duplication). Notification payload creation and Postgres `23505` duplicate constraint handling remain exclusively inside canonical `createOverdueVaccineNotifications()`.

---

## 2. Architectural Regression Checklist

Before any production release or pull request merge, the following automated checklist MUST pass:

- [ ] `tsc --noEmit --skipLibCheck` outputs 0 errors.
- [ ] `vercel.json` contains ONLY `/api/cron/orchestrator` in `crons`.
- [ ] All 9 decommissioned cron routes return `{ status: 'disabled' }`.
- [ ] `createVaccineRecord()` is used for vaccine creation.
- [ ] `normalizeConfidenceLevel()` translates all confidence level inputs.
- [ ] `is_core` domain meaning is untouched in `vaccination-algorithm.ts`.
- [ ] `recoverOverdueNotifications()` has 0% logic duplication.
- [ ] All unit and integration test suites pass (100% PASSED).

---

## 3. Enforcement

Automated enforcement is guaranteed by:
1. `scripts/check-architecture-guards.mjs`
2. `src/lib/architecture/__tests__/architecture-guards.test.ts`
3. `.github/workflows/architecture-guard.yml`
