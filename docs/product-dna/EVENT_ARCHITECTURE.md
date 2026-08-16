# EVENT ARCHITECTURE & SYSTEM TRIGGER CONSEQUENCE CATALOG

**System:** Odi Pet Platform  
**Scope:** Forensic Catalog of System Events, Triggers, Processors, and Multi-System Consequences  
**Audit Date:** August 12, 2026  
**Status:** FORENSIC BASELINE SPECIFICATION (READ-ONLY AUDIT)  

---

## 1. SYSTEM EVENT CATALOG MATRIX

Odi Pet utilizes an event-driven architecture combining database triggers, API event handlers, cron background runners, Edge Functions, and Service Worker push notifications.

| Event Name | Event Trigger | Source Component | Event Processor | Database Effect | User Effect | Notification Effect | Evidence Rating |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `user.signup` | New row inserted into `auth.users` | Supabase Auth Engine | Trigger `on_auth_user_created` | Inserts or updates `profiles` row with initial email & name | Redirected to Onboarding Wizard | Welcome email & push notification enqueued | `CONFIRMED` — [`all_in_one_supabase.sql:L173`](file:///c:/Odi.Pet/all_in_one_supabase.sql#L173) |
| `pet.created` | Form submission on `/api/pets` | `PetFormModal` / Wizard | [`src/app/api/pets/route.ts`](file:///c:/Odi.Pet/src/app/api/pets/route.ts) | Inserts `pets` row; triggers `backfill_existing_pets_into_memberships` | Pet visible in pet selector dropdown | Protocol schedules initialized; notification jobs queued | `CONFIRMED` — [`20260810000000_backfill_existing_pets_into_memberships.sql`](file:///c:/Odi.Pet/supabase/migrations/20260810000000_backfill_existing_pets_into_memberships.sql) |
| `vaccine.due_date.passed` | System timestamp passes `due_date` | Background Cron (`/api/cron/plans`) | [`create-overdue-vaccine-notifications.ts`](file:///c:/Odi.Pet/src/lib/notifications/create-overdue-vaccine-notifications.ts) | Updates `plans.status = 'overdue'` | Red "Gecikmiş" badge displayed on health timeline | Inserts `notifications` row; enqueues Web Push job | `CONFIRMED` — [`20260710000003_plans_status_overdue.sql`](file:///c:/Odi.Pet/supabase/migrations/20260710000003_plans_status_overdue.sql) |
| `vaccine.administered` | User completes vaccine item | API POST `/api/vaccines` | RPC `complete_vaccine_plan_and_record` | Inserts `vaccine_records_v2`; updates plan `completed`; creates next booster | Health timeline updated with verified record badge | Green toast notification; clears overdue alerts | `CONFIRMED` — [`20260723190001_atomic_rpc_and_idempotency_v6.sql`](file:///c:/Odi.Pet/supabase/migrations/20260723190001_atomic_rpc_and_idempotency_v6.sql) |
| `parasite.applied` | User completes parasite item | API POST `/api/parasite-suggestions` | RPC `complete_parasite_plan` | Inserts `parasite_records`; advances `parasite_plan_items` | Parasite protection status updated to "Koruma Altında" | Success toast displayed; schedules next dosage alert | `CONFIRMED` — [`20260716000000_parasite_plan_completion.sql`](file:///c:/Odi.Pet/supabase/migrations/20260716000000_parasite_plan_completion.sql) |
| `food.swapped` | User changes pet food SKU | API POST `/api/nutrition` | RPC `swap_pet_food_assignment` | Sets `ended_at = NOW()` on old assignment; creates new row | 7-day transition banner displayed on nutrition card | Daily transition stage reminders scheduled | `CONFIRMED` — [`20260724180000_nutrition_assignment_swap.sql`](file:///c:/Odi.Pet/supabase/migrations/20260724180000_nutrition_assignment_swap.sql) |
| `estrus.heat.detected` | Proestrus/estrus observation logged | Form `/owner/pets/[id]/estrus` | [`createEstrusNotifications.ts`](file:///c:/Odi.Pet/src/lib/notifications/createEstrusNotifications.ts) | Inserts `pet_estrus_observations`; updates cycle phase | Reproductive heat forecast chart rendered | Heat phase alert & ovulation window push sent | `CONFIRMED` — [`20260715000000_estrus_notifications.sql`](file:///c:/Odi.Pet/supabase/migrations/20260715000000_estrus_notifications.sql) |
| `lost_report.published` | User publishes lost pet alert | Form `/owner/lost-report` | RPC `can_publish_pet_lost_report` | Inserts `lost_reports` with status `published` | Public SOS link generated & share modal opened | Emergency push broadcast sent to nearby pet owners | `CONFIRMED` — [`20260724233000_complete_lost_report_wizard.sql`](file:///c:/Odi.Pet/supabase/migrations/20260724233000_complete_lost_report_wizard.sql) |
| `ocr.document.scanned` | Image uploaded in scanner | API POST `/api/scan-document` | [`scan-document/route.ts`](file:///c:/Odi.Pet/src/app/api/scan-document/route.ts) | Uploads file to storage; consumes usage quota; logs in `smart_scanner_records` | Verification modal pre-filled with extracted JSON | Extraction success notification shown | `CONFIRMED` — [`src/app/api/scan-document/route.ts`](file:///c:/Odi.Pet/src/app/api/scan-document/route.ts) |
| `orchestrator.evaluated` | Client mounts pet detail page | GET `/api/orchestrator/evaluate` | [`/api/orchestrator/evaluate/route.ts`](file:///c:/Odi.Pet/src/app/api/orchestrator/evaluate/route.ts) | Reads campaign rules; logs event in `orchestrator_analytics` | Renders dynamic bottom sheet prompt (e.g. Monthly Growth) | No external push (In-App UI element) | `CONFIRMED` — [`20260803000003_experience_orchestrator.sql`](file:///c:/Odi.Pet/supabase/migrations/20260803000003_experience_orchestrator.sql) |

---

## 2. DETAILED EVENT IMPACT BREAKDOWN SPECIFICATIONS

### 1. `vaccine.due_date.passed` (Vaccine Overdue Cascade)
- **EVENT:** Vaccine Overdue Escalation
- **TRIGGER:** Clock time exceeds `plans.due_date` where `status = 'pending'`.
- **SOURCE:** Background cron endpoint `/api/cron/plans`.
- **PROCESSOR:** [`create-overdue-vaccine-notifications.ts`](file:///c:/Odi.Pet/src/lib/notifications/create-overdue-vaccine-notifications.ts) & [`20260710000003_plans_status_overdue.sql`](file:///c:/Odi.Pet/supabase/migrations/20260710000003_plans_status_overdue.sql).
- **DATABASE EFFECT:**
  - `UPDATE public.plans SET status = 'overdue' WHERE due_date < NOW() AND status = 'pending';`
  - `INSERT INTO public.notifications (profile_id, pet_id, title, message) VALUES (...);`
  - `INSERT INTO public.notification_jobs (notification_id, status) VALUES (...);`
- **USER EFFECT:** UI displays red "Gecikmiş Aşı" warning card on pet dashboard and health timeline.
- **NOTIFICATION EFFECT:** Edge Function sends Web Push notification to registered PWA devices; Service Worker tags lock screen alert with tag `vaccine:${vaccine_id}:overdue`.
- **SIDE EFFECTS:** Recalculates pet profile completeness and health status score.
- **EVIDENCE:** `CONFIRMED` — Code source: [`src/lib/notifications/create-overdue-vaccine-notifications.ts`](file:///c:/Odi.Pet/src/lib/notifications/create-overdue-vaccine-notifications.ts).

---

### 2. `vaccine.administered` (Atomic Vaccine Record Creation)
- **EVENT:** Vaccine Administration & Completion
- **TRIGGER:** User submits vaccine completion modal with date, brand, and lot number.
- **SOURCE:** API endpoint `/api/vaccines`.
- **PROCESSOR:** Atomic RPC `complete_vaccine_plan_and_record` ([`20260723190001_atomic_rpc_and_idempotency_v6.sql`](file:///c:/Odi.Pet/supabase/migrations/20260723190001_atomic_rpc_and_idempotency_v6.sql)).
- **DATABASE EFFECT:**
  - `INSERT INTO public.vaccine_records_v2 (pet_id, title, brand, lot_number, date, next_date) VALUES (...);`
  - `UPDATE public.plans SET status = 'completed', completed_at = NOW() WHERE id = target_plan_id;`
  - `INSERT INTO public.plans (pet_id, title, due_date, status) VALUES (..., calculated_next_date, 'pending');`
- **USER EFFECT:** Displays success green toast; updates health timeline to show completed green badge; advances calendar to next booster date.
- **NOTIFICATION EFFECT:** Emits WebSocket update to open tabs; clears pending overdue alerts.
- **SIDE EFFECTS:** Updates pet immunization compliance status.
- **EVIDENCE:** `CONFIRMED` — Code source: [`supabase/migrations/20260723190001_atomic_rpc_and_idempotency_v6.sql`](file:///c:/Odi.Pet/supabase/migrations/20260723190001_atomic_rpc_and_idempotency_v6.sql).

---

### 3. `food.swapped` (7-Day Diet Swap Cascade)
- **EVENT:** Pet Food Swap & Transition Activation
- **TRIGGER:** Owner changes active food assignment to a new food SKU.
- **SOURCE:** API endpoint `/api/nutrition`.
- **PROCESSOR:** RPC `swap_pet_food_assignment` ([`20260724180000_nutrition_assignment_swap.sql`](file:///c:/Odi.Pet/supabase/migrations/20260724180000_nutrition_assignment_swap.sql)).
- **DATABASE EFFECT:**
  - `UPDATE public.pet_food_assignments SET ended_at = NOW() WHERE pet_id = target_pet_id AND ended_at IS NULL;`
  - `INSERT INTO public.pet_food_assignments (pet_id, food_sku_id, started_at) VALUES (...);`
- **USER EFFECT:** Replaces active food card; displays 7-day transition guide widget (25% -> 50% -> 75% -> 100%).
- **NOTIFICATION EFFECT:** Schedules 7 daily feeding transition check-in prompts in `notification_jobs`.
- **SIDE EFFECTS:** Emits telemetry event `food_assignment_swapped`.
- **EVIDENCE:** `CONFIRMED` — Code source: [`supabase/migrations/20260724180000_nutrition_assignment_swap.sql`](file:///c:/Odi.Pet/supabase/migrations/20260724180000_nutrition_assignment_swap.sql).

---

### 4. `ocr.document.scanned` (Smart Scanner OCR Flow)
- **EVENT:** Smart Scanner Document OCR Processing
- **TRIGGER:** Owner uploads passport/vaccine document photo.
- **SOURCE:** API endpoint `/api/scan-document`.
- **PROCESSOR:** [`src/app/api/scan-document/route.ts`](file:///c:/Odi.Pet/src/app/api/scan-document/route.ts) with Google Gemini Vision API.
- **DATABASE EFFECT:**
  - Saves file to Supabase private storage `vaccine-documents`.
  - Executes `getUsageEngine().consumeUsage()` to increment feature usage in `feature_usages`.
  - Logs scan metadata in `smart_scanner_records`.
- **USER EFFECT:** Opens verification modal presenting extracted fields (microchip number, vaccine title, date, lot number) for human confirmation.
- **NOTIFICATION EFFECT:** Toast alert indicating scan parsing complete.
- **SIDE EFFECTS:** In accordance with OPOS Vol 13, NO automatic database insertion occurs without explicit user "Confirm & Save" action.
- **EVIDENCE:** `CONFIRMED` — Code source: [`src/app/api/scan-document/route.ts`](file:///c:/Odi.Pet/src/app/api/scan-document/route.ts).
