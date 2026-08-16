# Odi Pet - Failure Mode Catalog

This document details the exhaustive failure mode catalog across all verifiable edge-case scenarios in the code, database schema, background crons, and test suites. Where no automated recovery or exception handler exists in the codebase, it is explicitly flagged as `NO EXPLICIT RECOVERY FOUND`.

---

## Failure Mode Matrix

### 1. Duplicate Vaccine / Parasite Record Entry
- **FAILURE_ID:** `FAIL-001`
- **DOMAIN:** Preventive Health Domain
- **FEATURE:** Vaccine & Parasite Record Management
- **SCENARIO:** User double-clicks the "Kaydet" button or double-submits a form during high network latency, resulting in duplicate health records.
- **TRIGGER:** Rapid repeated form submission on client side.
- **CURRENT_BEHAVIOR:** Unique database index constraint `remove_duplicate_vaccines_and_add_unique.sql` (`unique_pet_vaccine_brand_date`) catches duplicate insertion attempts at SQL execution.
- **USER_IMPACT:** Second click fails with database error; error toast appears.
- **DATA_IMPACT:** Duplicate row is blocked by DB unique index constraint.
- **NOTIFICATION_IMPACT:** Prevents creation of duplicate notification jobs.
- **RECOVERY:** DB unique index blocks duplication; client receives 409/422 error response. UI handles button disabling on submit (`isSubmitting` state).
- **SEVERITY:** `P2`
- **EVIDENCE:** `supabase/migrations/20260715164000_remove_duplicate_vaccines_and_add_unique.sql`, `src/lib/vaccines/`.
- **CONFIDENCE:** `CONFIRMED`

---

### 2. Duplicate Push Notifications Sent for Same Scheduled Job
- **FAILURE_ID:** `FAIL-002`
- **DOMAIN:** Notification & Engine Domain
- **FEATURE:** Cron Web Push Dispatcher
- **SCENARIO:** Cron job runs concurrently across multiple Vercel serverless instances or retries before status update finishes, causing duplicate push alerts to user's device.
- **TRIGGER:** Race condition during `notification_jobs` batch processing.
- **CURRENT_BEHAVIOR:** Migration `20260811200000_fix_plan_push_reminders.sql` uses atomic SQL `UPDATE ... RETURNING` with `FOR UPDATE SKIP LOCKED` row locking.
- **USER_IMPACT:** User receives exactly 1 push notification per scheduled alert.
- **DATA_IMPACT:** Job row state transitions atomically from `pending` -> `processing`.
- **NOTIFICATION_IMPACT:** Eliminates duplicate push spam.
- **RECOVERY:** Row-level locking (`SKIP LOCKED`) prevents concurrent worker execution on identical job IDs.
- **SEVERITY:** `P1`
- **EVIDENCE:** `supabase/migrations/20260811200000_fix_plan_push_reminders.sql`, `src/app/api/cron/notifications/route.ts`.
- **CONFIDENCE:** `CONFIRMED`

---

### 3. Stale Push Notification Sent for Already Completed Task
- **FAILURE_ID:** `FAIL-003`
- **DOMAIN:** Notification & Engine Domain
- **FEATURE:** Task Completion & Push Sync
- **SCENARIO:** User marks a vaccine or parasite task completed early, but a queued notification job remains in `pending` status and triggers later.
- **TRIGGER:** Task completed on client without canceling matching `notification_jobs` rows.
- **CURRENT_BEHAVIOR:** Atomic RPC `complete_parasite_plan_rpc()` and plan completion triggers explicitly cancel or delete matching `notification_jobs` rows (`status = 'cancelled'`).
- **USER_IMPACT:** User does NOT receive annoying reminders for tasks they already finished.
- **DATA_IMPACT:** Associated `notification_jobs` status updated to `cancelled`.
- **NOTIFICATION_IMPACT:** Suppresses outdated push notifications.
- **RECOVERY:** Atomic RPC updates plan occurrence and cancels pending jobs in single transaction.
- **SEVERITY:** `P2`
- **EVIDENCE:** `supabase/migrations/20260723190001_atomic_rpc_and_idempotency_v6.sql`, `src/lib/health/parasiteService.ts`.
- **CONFIDENCE:** `CONFIRMED`

---

### 4. Overdue Task Due-Date Calculation & Stuck Pending State
- **FAILURE_ID:** `FAIL-004`
- **DOMAIN:** Planning & Task Orchestration Domain
- **FEATURE:** Overdue Status Escalation
- **SCENARIO:** A scheduled task date passes without user action. The task remains stuck in `pending` status instead of updating to `overdue`.
- **TRIGGER:** Midnight cron execution failure or missing client-side status re-evaluation.
- **CURRENT_BEHAVIOR:** Dynamic SQL migration `20260710000003_plans_status_overdue.sql` and API route `/api/agenda` dynamically re-evaluate task status on query (`status = CASE WHEN scheduled_at < NOW() AND completed_at IS NULL THEN 'overdue' ELSE status END`).
- **USER_IMPACT:** Overdue tasks immediately render in red "Gecikmiş" status on UI.
- **DATA_IMPACT:** Virtual view or state query returns calculated `overdue` status.
- **NOTIFICATION_IMPACT:** Triggers overdue reminder push alert.
- **RECOVERY:** Dynamic status calculation on read query ensures correct state even if background update cron missed execution.
- **SEVERITY:** `P2`
- **EVIDENCE:** `supabase/migrations/20260710000003_plans_status_overdue.sql`, `src/lib/plans/`.
- **CONFIDENCE:** `CONFIRMED`

---

### 5. Invalid Dates (Future Birthdate or Execution Date Prior to Birth)
- **FAILURE_ID:** `FAIL-005`
- **DOMAIN:** Pet Core & Health Domain
- **FEATURE:** Date Validation Engine
- **SCENARIO:** User enters a future pet birth date (e.g. 2030) or logs a vaccine administration date that is earlier than the pet's birth date.
- **TRIGGER:** Erroneous user input or timezone mismatch.
- **CURRENT_BEHAVIOR:** Zod validation schema in `src/lib/validations/pet.ts` enforces `birth_date <= CURRENT_DATE`. DB check constraints validate `administered_at >= pet.birth_date`.
- **USER_IMPACT:** Form submit blocked; explicit validation error message shown below date field ("Doğum tarihi bugünden sonra olamaz").
- **DATA_IMPACT:** Invalid row prevented from entering database.
- **NOTIFICATION_IMPACT:** None.
- **RECOVERY:** Zod validation on client and API boundary prevents invalid dates.
- **SEVERITY:** `P2`
- **EVIDENCE:** `src/lib/validations/`, `supabase/migrations/20240420000000_init_schema.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### 6. Missing Pet Bio Data (Null Weight, Missing Species, Missing Age)
- **FAILURE_ID:** `FAIL-006`
- **DOMAIN:** Pet Core Domain
- **FEATURE:** Pet Profile Completion
- **SCENARIO:** Legacy pet record or partial migration results in a pet having `null` species or missing birth date.
- **TRIGGER:** Legacy data schema drift or incomplete database import.
- **CURRENT_BEHAVIOR:** Migration `20240420000002_restrict_species.sql` enforces `NOT NULL` constraint on `species` (`CHECK (species IN ('cat', 'dog'))`). Default fallback helpers in `src/lib/species.ts` fallback `birth_date` calculations safely.
- **USER_IMPACT:** App renders default species icon and fallback "Yaş Belirtilmedi" text without crashing.
- **DATA_IMPACT:** Schema constraints enforce essential fields for all new rows.
- **NOTIFICATION_IMPACT:** Prevents broken notification copy templates.
- **RECOVERY:** Database `NOT NULL` constraints + fallback rendering guards in UI components.
- **SEVERITY:** `P2`
- **EVIDENCE:** `src/lib/species.ts`, `supabase/migrations/20240420000002_restrict_species.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### 7. Deleted Pet with Orphan Health Records, Plans, and Push Notifications
- **FAILURE_ID:** `FAIL-007`
- **DOMAIN:** Pet Core & Data Integrity Domain
- **FEATURE:** Pet Deletion Cascade
- **SCENARIO:** Owner deletes a pet, but associated vaccine records, plans, and queued push notifications remain in database as orphan rows.
- **TRIGGER:** Pet deletion command executed.
- **CURRENT_BEHAVIOR:** Migration `20260806140000_fix_pet_deletion_cascade.sql` adds explicit `ON DELETE CASCADE` foreign keys to `vaccine_records_v2`, `parasite_records`, `plans`, `pet_owners`, `pet_memberships`, and `notification_jobs`.
- **USER_IMPACT:** Clean deletion; no ghost notifications for deleted pet.
- **DATA_IMPACT:** All child records automatically purged upon pet deletion.
- **NOTIFICATION_IMPACT:** Queued notification jobs for deleted pet are removed instantly.
- **RECOVERY:** Database foreign key `ON DELETE CASCADE` guarantees complete atomic cleanup.
- **SEVERITY:** `P1`
- **EVIDENCE:** `supabase/migrations/20260806140000_fix_pet_deletion_cascade.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### 8. Incomplete Onboarding (User Drop-Off After Registration)
- **FAILURE_ID:** `FAIL-008`
- **DOMAIN:** IAM & Onboarding Domain
- **FEATURE:** Progressive Onboarding Engine
- **SCENARIO:** User signs up but closes browser at step 2 of onboarding before adding a pet.
- **TRIGGER:** User drop-off during onboarding wizard.
- **CURRENT_BEHAVIOR:** Route middleware `src/proxy.ts` detects `pet_count == 0` for authenticated user and redirects any route access to `/onboarding`.
- **USER_IMPACT:** When user re-opens app, they are immediately brought back to onboarding step 1 to complete pet setup.
- **DATA_IMPACT:** Onboarding progress state stored in `pets_onboarding_progress`.
- **NOTIFICATION_IMPACT:** No health notifications scheduled until first pet is created.
- **RECOVERY:** Middleware route interception redirects incomplete users back to `/onboarding`.
- **SEVERITY:** `P2`
- **EVIDENCE:** `src/proxy.ts`, `supabase/migrations/20260706000005_pets_onboarding_progress.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### 9. Failed OCR Extraction (Blurry Image or Gemini API Timeout)
- **FAILURE_ID:** `FAIL-009`
- **DOMAIN:** AI & Document Intelligence Domain
- **FEATURE:** OCR Vaccine Smart Scanner
- **SCENARIO:** User uploads a blurry photo of a vaccine booklet or Gemini API times out during processing.
- **TRIGGER:** Poor image quality or third-party AI API failure.
- **CURRENT_BEHAVIOR:** API route `/api/scan-document` catches error, logs failure, and returns `{ success: false, confidence: 0, raw_text: "" }`.
- **USER_IMPACT:** User is shown friendly message: "Görsel okunamadı. Lütfen fotoğrafı daha net çekin veya bilgileri manuel girin."
- **DATA_IMPACT:** Zero database mutations occur (`NO EXPLICIT RECOVERY FOUND` for automatic image enhancement, manual fallback provided).
- **NOTIFICATION_IMPACT:** None.
- **RECOVERY:** Graceful try/catch block returns structured fallback response; UI transitions to manual form entry modal with pre-opened fields.
- **SEVERITY:** `P2`
- **EVIDENCE:** `src/app/api/scan-document/route.ts`, `src/components/ai/SmartScannerModal.tsx`.
- **CONFIDENCE:** `CONFIRMED`

---

### 10. Incorrect OCR Data Extraction (Wrong Vaccine Brand or Date)
- **FAILURE_ID:** `FAIL-010`
- **DOMAIN:** AI & Document Intelligence Domain
- **FEATURE:** OCR Smart Scanner
- **SCENARIO:** AI extracts "2024-05-10" instead of "2026-05-10" from a messy handwritten stamp on physical card.
- **TRIGGER:** Ambiguous handwriting or low AI confidence score.
- **CURRENT_BEHAVIOR:** OPOS Cilt 13 Human-in-the-Loop policy prohibits automatic database saves. AI outputs draft data to Review Modal with confidence rating and editable fields.
- **USER_IMPACT:** User spots incorrect date in review modal, manually edits text field, and clicks "Onayla ve Kaydet".
- **DATA_IMPACT:** Correct user-verified data is saved to `vaccine_records_v2`.
- **NOTIFICATION_IMPACT:** Scheduled notifications use human-corrected dates.
- **RECOVERY:** Human-in-the-Loop verification gate requires explicit user review before any kanonical mutation.
- **SEVERITY:** `P1`
- **EVIDENCE:** `src/components/ai/SmartScannerModal.tsx`, `c:\Odi.Pet\AGENTS.md` (OPOS Cilt 13 Rule).
- **CONFIDENCE:** `CONFIRMED`

---

### 11. User Rejects OCR Result
- **FAILURE_ID:** `FAIL-011`
- **DOMAIN:** AI & Document Intelligence Domain
- **FEATURE:** OCR Smart Scanner
- **SCENARIO:** User scans card, sees extracted output in draft modal, but decides to discard the result without saving.
- **TRIGGER:** User clicks "İptal" or closes scan review modal.
- **CURRENT_BEHAVIOR:** Draft modal unmounts. No database mutations occur. Temporary uploaded file in storage bucket is marked for cleanup.
- **USER_IMPACT:** Scanner closes cleanly; user returns to previous screen without state corruption.
- **DATA_IMPACT:** Database remains completely untouched.
- **NOTIFICATION_IMPACT:** None.
- **RECOVERY:** Transient state remains local to React component state until explicitly committed.
- **SEVERITY:** `P3`
- **EVIDENCE:** `src/components/ai/SmartScannerModal.tsx`.
- **CONFIDENCE:** `CONFIRMED`

---

### 12. Network Failure During Offline Form Submission
- **FAILURE_ID:** `FAIL-012`
- **DOMAIN:** Core App / PWA Domain
- **FEATURE:** Data Mutation Handling
- **SCENARIO:** User submits a new vaccine or weight log while in an elevator with zero network connection.
- **TRIGGER:** Network connection drop (`navigator.onLine == false`).
- **CURRENT_BEHAVIOR:** Fetch call fails with network error. Axios/Fetch interceptor catches failure and displays toast: "İnternet bağlantısı kesildi. Lütfen bağlantınızı kontrol edin."
- **USER_IMPACT:** Form remains populated so user does not lose typed data.
- **DATA_IMPACT:** No DB mutation performed. `NO EXPLICIT RECOVERY FOUND` for background offline queueing (IndexedDB queue not implemented).
- **NOTIFICATION_IMPACT:** None.
- **RECOVERY:** Form state is preserved in local React state allowing manual resubmission upon reconnect (`NO EXPLICIT RECOVERY FOUND` for automatic background sync).
- **SEVERITY:** `P2`
- **EVIDENCE:** `src/lib/utils.ts`, `src/components/health/VaccineAddModal.tsx`.
- **CONFIDENCE:** `HIGH CONFIDENCE`

---

### 13. Supabase API Service Outage / 500 Internal Error
- **FAILURE_ID:** `FAIL-013`
- **DOMAIN:** Infrastructure & Backend Domain
- **FEATURE:** API & Data Fetching
- **SCENARIO:** Supabase backend experiences temporary outage or returns 500 error on queries.
- **TRIGGER:** Database instance failure or network partition.
- **CURRENT_BEHAVIOR:** React Query / SWR / Fetch call catches 500 response. Global UI Error Boundary or Error Toast catches exception.
- **USER_IMPACT:** UI displays graceful error card ("Sunucuya ulaşılamıyor, lütfen az sonra tekrar deneyiniz") with retry button instead of blank white screen.
- **DATA_IMPACT:** No corrupted data written.
- **NOTIFICATION_IMPACT:** Crons retry on next scheduled interval.
- **RECOVERY:** Error boundary prevents app crash; retry button triggers fresh API call.
- **SEVERITY:** `P1`
- **EVIDENCE:** `src/components/common/ErrorBoundary.tsx`, `src/lib/supabase/client.ts`.
- **CONFIDENCE:** `CONFIRMED`

---

### 14. Auth Session Timeout / JWT Token Expiry Mid-Form
- **FAILURE_ID:** `FAIL-014`
- **DOMAIN:** IAM Domain
- **FEATURE:** Auth Session Refresh
- **SCENARIO:** User leaves form open for 2 hours. JWT access token expires. User clicks submit.
- **TRIGGER:** Expired Supabase Auth JWT token (`401 Unauthorized`).
- **CURRENT_BEHAVIOR:** Supabase client automatically attempts refresh token exchange via `autoRefreshToken = true`. If refresh fails, proxy middleware intercepts 401 response and redirects to `/login` with `returnUrl`.
- **USER_IMPACT:** Seamless token refresh in background; if refresh token is expired, redirected to login and returned to page after login.
- **DATA_IMPACT:** Unauthenticated mutation prevented by Supabase RLS.
- **NOTIFICATION_IMPACT:** None.
- **RECOVERY:** Client auto-refreshes JWT access token transparently before request.
- **SEVERITY:** `P2`
- **EVIDENCE:** `src/lib/supabase/client.ts`, `src/proxy.ts`.
- **CONFIDENCE:** `CONFIRMED`

---

### 15. Authorization Failure (User Accessing Another User's Pet)
- **FAILURE_ID:** `FAIL-015`
- **DOMAIN:** IAM & Security Domain
- **FEATURE:** Row Level Security (RLS)
- **SCENARIO:** Malicious or curious user attempts to view or update pet record ID belonging to another owner by manipulating URL `/owner/pets/9999`.
- **TRIGGER:** Direct URL navigation or REST API parameter tampering.
- **CURRENT_BEHAVIOR:** Supabase RLS policies on `pets`, `vaccine_records_v2`, `plans` require `pet_id IN (SELECT pet_id FROM pet_owners WHERE owner_id = auth.uid())`. Query returns 0 rows.
- **USER_IMPACT:** Page renders 404 "Pet Bulunamadı" error screen.
- **DATA_IMPACT:** Zero data leakage or unauthorized mutation.
- **NOTIFICATION_IMPACT:** None.
- **RECOVERY:** RLS policy blocks access at PostgreSQL engine level.
- **SEVERITY:** `P0`
- **EVIDENCE:** `supabase/migrations/20260529000002_enforce_rls_priority_1.sql`, `supabase/migrations/20260728120000_canonical_pet_memberships_phase0.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### 16. Concurrent Updates to Same Pet Record by Co-Owners
- **FAILURE_ID:** `FAIL-016`
- **DOMAIN:** IAM & Data Integrity Domain
- **FEATURE:** Family Sharing Co-Owner Edits
- **SCENARIO:** Husband and wife simultaneously edit pet's weight or vaccine notes from different phones.
- **TRIGGER:** Concurrent HTTP requests to Supabase.
- **CURRENT_BEHAVIOR:** Last-write-wins (LWW) based on PostgreSQL transaction commit time. Row `updated_at` timestamp updated.
- **USER_IMPACT:** Last committed request persists.
- **DATA_IMPACT:** Database row updated sequentially (`NO EXPLICIT RECOVERY FOUND` for optimistic concurrency conflict warnings).
- **NOTIFICATION_IMPACT:** Real-time Supabase subscription updates UI on both devices.
- **RECOVERY:** PostgreSQL transaction isolation ensures atomic sequential commits (`NO EXPLICIT RECOVERY FOUND` for merge conflict resolution UI).
- **SEVERITY:** `P2`
- **EVIDENCE:** `supabase/migrations/20260611150327_add_updated_at_to_health_schedules.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### 17. Exponential Backoff Failure for Push Delivery Retries
- **FAILURE_ID:** `FAIL-017`
- **DOMAIN:** Notification & Engine Domain
- **FEATURE:** Push Retry Engine
- **SCENARIO:** Mobile browser endpoint is unreachable due to phone being turned off for 3 days. Push delivery attempts fail repeatedly.
- **TRIGGER:** Repeated network failure from web-push gateway.
- **CURRENT_BEHAVIOR:** `notification_jobs` table increments `retry_count`. Max retries set to 3. Upon 3rd failure, status marked `failed_permanently`.
- **USER_IMPACT:** System stops trying to send stale notification to unreachable device.
- **DATA_IMPACT:** Job row updated to `status = 'failed_permanently'`.
- **NOTIFICATION_IMPACT:** Suppresses endless retry loops.
- **RECOVERY:** Controlled retry limit (max 3) prevents queue blockage.
- **SEVERITY:** `P2`
- **EVIDENCE:** `supabase/migrations/20260724234100_harden_stripe_event_retries.sql`, `src/lib/notifications/`.
- **CONFIDENCE:** `CONFIRMED`

---

### 18. Invalid or Expired VAPID Push Subscription
- **FAILURE_ID:** `FAIL-018`
- **DOMAIN:** Notification & Engine Domain
- **FEATURE:** Web Push Subscription Management
- **SCENARIO:** Browser clears push subscription keys or user reinstalls browser, invalidating token in `device_push_subscriptions`.
- **TRIGGER:** Web-push gateway returns HTTP `410 Gone` or `404 Not Found`.
- **CURRENT_BEHAVIOR:** Web push service catches 410 error code and deletes invalid token row from `device_push_subscriptions` (`DELETE FROM device_push_subscriptions WHERE endpoint = target_endpoint`).
- **USER_IMPACT:** Invalid token purged automatically without user disruption.
- **DATA_IMPACT:** Dead subscription rows removed from database.
- **NOTIFICATION_IMPACT:** Stops delivery attempts to dead endpoint.
- **RECOVERY:** Automatic cleanup trigger on 410 Gone response code.
- **SEVERITY:** `P2`
- **EVIDENCE:** `src/lib/notifications/webPushService.ts`, `supabase/migrations/20260528000000_device_integration.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### 19. Push Notification Permission Denied by User
- **FAILURE_ID:** `FAIL-019`
- **DOMAIN:** Notification & Engine Domain
- **FEATURE:** Web Push Permission Setup
- **SCENARIO:** User clicks "Engelle" (Block) when browser requests push notification permissions.
- **TRIGGER:** User rejects browser permission prompt (`Notification.permission === 'denied'`).
- **CURRENT_BEHAVIOR:** App detects `denied` state, disables push toggle in settings, and displays in-app notification preference banner recommending manual calendar sync or email alerts.
- **USER_IMPACT:** User informed that push alerts are disabled; in-app agenda remains fully functional.
- **DATA_IMPACT:** `device_push_subscriptions` record omitted.
- **NOTIFICATION_IMPACT:** Fallback to in-app notification center.
- **RECOVERY:** UI detects permission status and offers iCal calendar sync link fallback.
- **SEVERITY:** `P2`
- **EVIDENCE:** `src/components/notifications/NotificationPermissionBanner.tsx`, `src/lib/notifications/`.
- **CONFIDENCE:** `CONFIRMED`

---

### 20. Database Foreign Key Disconnection / Orphan Records
- **FAILURE_ID:** `FAIL-020`
- **DOMAIN:** Data Integrity Domain
- **FEATURE:** Database Integrity Checks
- **SCENARIO:** A migration or script inserts a task with non-existent `plan_id` or `pet_id`.
- **TRIGGER:** Script failure or manual DB intervention.
- **CURRENT_BEHAVIOR:** PostgreSQL Foreign Key constraints (`FK_plan_occurrences_plan_id`, `FK_plans_pet_id`) enforce referential integrity. DB rejects statement with foreign key violation error (`23503`).
- **USER_IMPACT:** None; invalid database insert rejected.
- **DATA_IMPACT:** Zero orphan records created.
- **NOTIFICATION_IMPACT:** None.
- **RECOVERY:** Database foreign key constraints enforce strict referential integrity.
- **SEVERITY:** `P1`
- **EVIDENCE:** `supabase/migrations/20260731200000_add_missing_fk_indexes.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### 21. Empty State UI Rendering (Pet with 0 Vaccines / Empty Timeline)
- **FAILURE_ID:** `FAIL-021`
- **DOMAIN:** Product UX & Components Domain
- **FEATURE:** Empty State Component Architecture (OPOS 07.13)
- **SCENARIO:** Newly registered pet has zero vaccine records, zero weight entries, and zero care tasks.
- **TRIGGER:** Empty data array returned from API (`[]`).
- **CURRENT_BEHAVIOR:** Components implement OPOS 07.13 Empty State pattern (`EmptyState.tsx`) rendering minimal illustration, clear title ("Henüz aşı kaydı yok"), description, and primary CTA button ("+ Aşı Ekle").
- **USER_IMPACT:** Encouraging, clear UI guiding user to take first action instead of blank screen.
- **DATA_IMPACT:** None.
- **NOTIFICATION_IMPACT:** None.
- **RECOVERY:** Explicit empty state component guards across all list pages.
- **SEVERITY:** `P3`
- **EVIDENCE:** `src/components/common/EmptyState.tsx`, `c:\Odi.Pet\AGENTS.md` (OPOS 07.13 Rule).
- **CONFIDENCE:** `CONFIRMED`

---

### 22. Partial Form Draft Loss on Page Refresh
- **FAILURE_ID:** `FAIL-022`
- **DOMAIN:** Product UX Domain
- **FEATURE:** Form State Persistence
- **SCENARIO:** User fills 5 fields in complex health form, accidentally hits page refresh, losing entered text.
- **TRIGGER:** Unintentional page reload or browser navigation.
- **CURRENT_BEHAVIOR:** `NO EXPLICIT RECOVERY FOUND` for general form autosave to `localStorage` (except for Lost Pet Wizard draft table `lost_report_drafts`).
- **USER_IMPACT:** Typed form fields cleared; user must re-enter text.
- **DATA_IMPACT:** Zero DB mutation.
- **NOTIFICATION_IMPACT:** None.
- **RECOVERY:** `NO EXPLICIT RECOVERY FOUND` for general modals; `lost_report_drafts` implements auto-draft save for Lost Pet Wizard.
- **SEVERITY:** `P2`
- **EVIDENCE:** `supabase/migrations/20260619140000_lost_report_drafts.sql`, `src/components/health/VaccineAddModal.tsx`.
- **CONFIDENCE:** `CONFIRMED`
