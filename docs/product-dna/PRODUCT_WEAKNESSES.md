# Odi Pet - Empirical Analysis of Product Weaknesses & Friction Points

This document provides a frank, empirical analysis of verified product weaknesses, UX friction points, and technical bottlenecks within the Odi Pet codebase, complete with exact citations and remediation recommendations.

---

## 1. Lack of Offline Mutation Layer & Draft Autosave
- **WEAKNESS:** Submitting forms (vaccines, parasite records, weight logs) while offline results in network failure errors without automatic background syncing. Draft state in forms is lost if page reloads.
- **CODE EVIDENCE:**
  - `FAIL-012` in `FAILURE_MODE_CATALOG.md`
  - `src/components/health/VaccineAddModal.tsx`
- **USER IMPACT:** User loses typed text during intermittent network drops; poor UX in vet clinic basements.
- **REMEDIATION:** Implement IndexedDB local mutation queue + Service Worker background sync.

---

## 2. Legacy Table Schema Drift & Redundant Entities
- **WEAKNESS:** The codebase contains legacy database tables (e.g. legacy `vaccines` alongside `vaccine_records_v2`) created during earlier iterations. Although migrations have cleaned up many FKs, legacy code paths occasionally reference old schemas.
- **CODE EVIDENCE:**
  - `supabase/migrations/20240420000006_health_module.sql` (legacy `vaccines`)
  - `supabase/migrations/20260502000001_vaccine_os_v2.sql` (kanonical `vaccine_records_v2`)
- **USER IMPACT:** Maintenance complexity for developers; slight risk of schema query confusion.
- **REMEDIATION:** Execute a final migration dropping remaining legacy views and unused table aliases.

---

## 3. Deep Navigation Hierarchy & Sub-Menu Friction
- **WEAKNESS:** To check a specific hygiene task or log a single weight entry, users must navigate through: Home -> Pet Profile -> Health/Care Tab -> Specific Category Sub-Menu -> Open Modal (3–4 clicks).
- **CODE EVIDENCE:**
  - `src/app/(app)/owner/pets/[id]/page.tsx`
  - `src/components/navigation/`
- **USER IMPACT:** Excessive clicks for simple daily logging routines.
- **REMEDIATION:** Replace deep sub-menus with a single-stream daily agenda feed on the main dashboard.

---

## 4. Mobile Push Notification VAPID Subscription Expiry Handling
- **WEAKNESS:** Web Push subscriptions stored in `device_push_subscriptions` expire or become invalid when users clear browser cache. The app relies on passive re-registration rather than active background subscription renewal checks.
- **CODE EVIDENCE:**
  - `src/sw.ts`
  - `src/lib/notifications/webPushService.ts`
- **USER IMPACT:** Push notifications may silently stop delivering until the user re-opens the notification settings screen.
- **REMEDIATION:** Add an active subscription health check hook on every PWA launch.

---

## 5. Stale Task Recalculation on Protocol Schema Update
- **WEAKNESS:** When an admin updates a vaccine or parasite protocol (e.g. changes interval from 60 to 90 days), existing scheduled `plan_occurrences` for pets are not automatically backfilled unless re-triggered.
- **CODE EVIDENCE:**
  - `supabase/migrations/20260605000001_vaccine_parasite_protocols.sql`
- **USER IMPACT:** Pets with existing plans retain old protocol schedules until the current occurrence completes.
- **REMEDIATION:** Add a background migration RPC that recalculates pending future occurrences when protocol parameters update.

---

## 6. Error Recovery Gaps (`NO EXPLICIT RECOVERY FOUND`)
- **WEAKNESS:** As cataloged in `FAILURE_MODE_CATALOG.md`, several edge cases (such as offline network drops `FAIL-012` and concurrent edit merge conflicts `FAIL-016`) lack explicit automated recovery handlers.
- **CODE EVIDENCE:**
  - `FAILURE_MODE_CATALOG.md` (`FAIL-012`, `FAIL-016`)
- **USER IMPACT:** System relies on basic error toasts or last-write-wins without active conflict resolution UI.
- **REMEDIATION:** Add explicit offline queue retry handlers and optimistic UI conflict warnings.
