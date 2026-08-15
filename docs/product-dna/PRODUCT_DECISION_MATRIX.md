# Odi Pet - Product Architectural Decision Matrix

This document presents the structured Decision Matrix evaluating all core architectural, data, UI, and feature choices in Odi Pet. Each entry includes the Verdict (`KEEP`, `RETHINK`, `REINVENT`) and explicit strategic rationale.

---

## Decision Matrix

### 1. Single Source of Truth & Archival-Only Health Records
- **DECISION_ID:** `DEC-001`
- **AREA:** Data Architecture & Medical Integrity
- **CURRENT_APPROACH:** Kanonical tables (`vaccine_records_v2`, `parasite_records`) enforce single mutation point and hard-delete prohibition (`is_archived = true`).
- **WHY_IT_EXISTS:** Designed to prevent data fragmentation, medical record loss, and conflicting dosage calculations.
- **STRENGTH:** High diagnostic integrity, zero medical history loss, vet-grade record traceability.
- **WEAKNESS:** Requires careful handling of archived rows in read queries to prevent showing deleted records in active UI.
- **VERDICT:** **`KEEP`**
- **RATIONALE:** Fundamental core invariant of Odi Pet; non-negotiable for medical reliability and vet compliance.

---

### 2. Species Isolation (Cat & Dog Only)
- **DECISION_ID:** `DEC-002`
- **AREA:** Pet Core Taxonomy
- **CURRENT_APPROACH:** Database check constraint `pets_species_check` strictly limits species to `cat` or `dog`.
- **WHY_IT_EXISTS:** Ensures 100% precision in medical protocols, age scale models, and brand dosage catalogs.
- **STRENGTH:** Focused domain depth; eliminates generic, inaccurate protocol math.
- **WEAKNESS:** Excludes exotic pets (birds, rabbits).
- **VERDICT:** **`KEEP`**
- **RATIONALE:** Cats and dogs represent 95%+ of domestic pet health management demand. Specificity drives medical trust.

---

### 3. Human-in-the-Loop AI Vision OCR Scanner
- **DECISION_ID:** `DEC-003`
- **AREA:** AI & Document Intelligence
- **CURRENT_APPROACH:** Gemini Vision reads physical cards; extracted data is shown in a Draft Review Modal (`SmartScannerModal.tsx`) requiring user click to commit to DB.
- **WHY_IT_EXISTS:** Complies with OPOS Cilt 13 AI Governance to prevent AI hallucinations from mutating medical database rows autonomously.
- **STRENGTH:** Zero AI mutation risk; user maintains 100% control over health data accuracy.
- **WEAKNESS:** Adds one extra confirmation tap for the user.
- **VERDICT:** **`KEEP`**
- **RATIONALE:** Safety and medical accuracy paramount; Human-in-the-Loop is mandatory for health AI.

---

### 4. Multi-Tab Navigation Hierarchy (Health, Care, Nutrition, Estrus)
- **DECISION_ID:** `DEC-004`
- **AREA:** User Interface & Information Architecture
- **CURRENT_APPROACH:** Deep nested tab menus under pet profile (`/owner/pets/[id]/vaccines`, etc.).
- **WHY_IT_EXISTS:** Built incrementally as new feature modules were added to the codebase.
- **STRENGTH:** Clear categorization of individual feature settings.
- **WEAKNESS:** Navigation friction (3–4 clicks to check off simple daily task).
- **VERDICT:** **`REINVENT`**
- **RATIONALE:** Clean-slate re-engineering should replace deep nested tabs with a single-stream "Daily Pet Agenda Feed" on the home dashboard.

---

### 5. Progressive Profiling & Anti-Question Fatigue Engine
- **DECISION_ID:** `DEC-005`
- **AREA:** User Onboarding & Data Collection
- **CURRENT_APPROACH:** `user_survey_stats` table tracks prompt frequency, enforcing minimum 72h cooldown between micro-survey prompts.
- **WHY_IT_EXISTS:** Prevents user survey fatigue while continuously enriching profile data over time.
- **STRENGTH:** Fast initial onboarding; high long-term profile completion rate.
- **WEAKNESS:** Requires background rules engine evaluation on navigation events.
- **VERDICT:** **`KEEP`**
- **RATIONALE:** Essential for user retention and conversion optimization.

---

### 6. Synchronous HTTP REST Mutations vs Local-First Sync
- **DECISION_ID:** `DEC-006`
- **AREA:** PWA & Data Fetching Layer
- **CURRENT_APPROACH:** React components invoke direct Supabase REST API endpoints for state changes.
- **WHY_IT_EXISTS:** Standard web application architecture pattern.
- **STRENGTH:** Simple mental model; straightforward debugging.
- **WEAKNESS:** Fails during offline network connectivity (e.g. vet clinic basements).
- **VERDICT:** **`RETHINK`**
- **RATIONALE:** Transitioning to IndexedDB local-first optimistic mutations with background service worker sync will dramatically improve mobile app speed and offline reliability.

---

### 7. VAPID Web Push Notification Engine
- **DECISION_ID:** `DEC-007`
- **AREA:** Re-Engagement & Alerts
- **CURRENT_APPROACH:** Service Worker (`sw.ts`) + VAPID keys + cron batching (`notification_jobs`).
- **WHY_IT_EXISTS:** Delivers push alerts to mobile and desktop browsers without requiring native store apps.
- **STRENGTH:** Zero app store friction; direct re-engagement push delivery.
- **WEAKNESS:** Token invalidation on browser cache clear require active client resubscription hooks.
- **VERDICT:** **`KEEP` (WITH CLIENT RECOVERY ENHANCEMENT)**
- **RATIONALE:** Web Push is the primary re-engagement pillar for PWA; add active client subscription health checks on app launch.
