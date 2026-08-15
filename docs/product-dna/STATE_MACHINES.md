# FORMAL STATE MACHINE SPECIFICATIONS

**System:** Odi Pet Platform  
**Scope:** Strict Formal State Machines across 10 Core Application Sub-systems  
**Audit Date:** August 12, 2026  
**Status:** FORENSIC BASELINE SPECIFICATION (READ-ONLY AUDIT)  

---

## 1. STATE MACHINE OVERVIEW TABLE

Every workflow in Odi Pet is governed by deterministic state machines. Each machine enforces exact entry conditions, exit conditions, allowed transition edges, and system side effects.

| Sub-system | Formal State Machine Name | State Variables | Total States | Primary Source Code File | Evidence Rating |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Pet Identity** | `PetProfileFSM` | `status`, `is_archived` | 4 | [`20260728120000_canonical_pet_memberships_phase0.sql`](file:///c:/Odi.Pet/supabase/migrations/20260728120000_canonical_pet_memberships_phase0.sql) | `CONFIRMED` |
| **2. Vaccine Record** | `VaccineFSM` | `status`, `is_archived` | 5 | [`20260723190001_atomic_rpc_and_idempotency_v6.sql`](file:///c:/Odi.Pet/supabase/migrations/20260723190001_atomic_rpc_and_idempotency_v6.sql) | `CONFIRMED` |
| **3. Parasite Treatment** | `ParasiteFSM` | `status`, `is_archived` | 5 | [`20260716000000_parasite_plan_completion.sql`](file:///c:/Odi.Pet/supabase/migrations/20260716000000_parasite_plan_completion.sql) | `CONFIRMED` |
| **4. Care Plan** | `CarePlanFSM` | `status` | 5 | [`20260518000000_care_plans.sql`](file:///c:/Odi.Pet/supabase/migrations/20260518000000_care_plans.sql) | `CONFIRMED` |
| **5. Agenda Task** | `TaskFSM` | `status` (`pending`, `completed`, `overdue`, `dismissed`) | 4 | [`20260710000003_plans_status_overdue.sql`](file:///c:/Odi.Pet/supabase/migrations/20260710000003_plans_status_overdue.sql) | `CONFIRMED` |
| **6. Notification** | `NotificationFSM` | `is_read`, `job_status` | 4 | [`dispatch-notifications/route.ts`](file:///c:/Odi.Pet/src/app/api/cron/dispatch-notifications/route.ts) | `CONFIRMED` |
| **7. Food Assignment** | `FoodAssignmentFSM` | `status`, `ended_at` | 4 | [`20260724180000_nutrition_assignment_swap.sql`](file:///c:/Odi.Pet/supabase/migrations/20260724180000_nutrition_assignment_swap.sql) | `CONFIRMED` |
| **8. OCR Scan Job** | `OCRScanFSM` | `status`, `quota_consumed` | 5 | [`scan-document/route.ts`](file:///c:/Odi.Pet/src/app/api/scan-document/route.ts) | `CONFIRMED` |
| **9. AI Processing** | `AIProcessingFSM` | `job_status` | 5 | [`jobPipelineService.ts`](file:///c:/Odi.Pet/src/lib/content/jobPipelineService.ts) | `CONFIRMED` |
| **10. User Onboarding** | `OnboardingFSM` | `step`, `is_completed` | 5 | [`useOnboardingProgress.ts`](file:///c:/Odi.Pet/src/hooks/useOnboardingProgress.ts) | `CONFIRMED` |

---

## 2. DETAILED STATE MACHINE SPECIFICATIONS

### 1. Pet Profile State Machine (`PetProfileFSM`)
- **STATES:** `DRAFT`, `ACTIVE`, `FAMILY_SHARED`, `ARCHIVED`.
- **SPECIFICATION:**
  - `DRAFT`: Entry: User clicks "Add Pet"; Exit: Basic info saved; Transitions to: `ACTIVE`. Side Effects: None.
  - `ACTIVE`: Entry: Profile created; Exit: Invite sent or archive requested; Transitions to: `FAMILY_SHARED`, `ARCHIVED`. Side Effects: Protocol matching triggers initial plans.
  - `FAMILY_SHARED`: Entry: Co-owner/caregiver accepts token; Exit: Revoked by owner; Transitions to: `ACTIVE`. Side Effects: Emits `pet.membership.accepted`.
  - `ARCHIVED`: Entry: Soft delete request; Exit: None (Terminal state); Transitions to: None. Side Effects: Sets `is_archived = true`, hides from active queries.
- **EVIDENCE:** `CONFIRMED` — Source: [`supabase/migrations/20260728120000_canonical_pet_memberships_phase0.sql`](file:///c:/Odi.Pet/supabase/migrations/20260728120000_canonical_pet_memberships_phase0.sql).

---

### 2. Vaccine Record State Machine (`VaccineFSM`)
- **STATES:** `PLANNED`, `UPCOMING`, `ADMINISTERED`, `OVERDUE`, `ARCHIVED`.
- **SPECIFICATION:**
  - `PLANNED`: Entry: Species protocol auto-match; Exit: Current date within 14 days of `due_date`; Transitions to: `UPCOMING`. Side Effects: None.
  - `UPCOMING`: Entry: `due_date - NOW() <= 14 days`; Exit: RPC `complete_vaccine_plan_and_record` executed OR `NOW() > due_date`; Transitions to: `ADMINISTERED`, `OVERDUE`. Side Effects: Queues push reminder.
  - `OVERDUE`: Entry: `NOW() > due_date` without completion; Exit: RPC `complete_vaccine_plan_and_record` executed; Transitions to: `ADMINISTERED`. Side Effects: Marks plan overdue; enqueues overdue notification.
  - `ADMINISTERED`: Entry: RPC execution with date/lot number; Exit: Soft delete request; Transitions to: `ARCHIVED`. Side Effects: Creates next booster occurrence.
  - `ARCHIVED`: Entry: Archival request; Exit: None (Terminal state); Transitions to: None. Side Effects: Sets `is_archived = true`.
- **EVIDENCE:** `CONFIRMED` — Source: [`supabase/migrations/20260723190001_atomic_rpc_and_idempotency_v6.sql`](file:///c:/Odi.Pet/supabase/migrations/20260723190001_atomic_rpc_and_idempotency_v6.sql).

---

### 3. Parasite Treatment State Machine (`ParasiteFSM`)
- **STATES:** `PROTOCOL_MATCHED`, `ACTIVE`, `DOSAGE_APPLIED`, `EXPIRED`, `ARCHIVED`.
- **SPECIFICATION:**
  - `PROTOCOL_MATCHED`: Entry: Pet breed/weight matched to protocol; Exit: Plan activated; Transitions to: `ACTIVE`. Side Effects: None.
  - `ACTIVE`: Entry: Schedule generated; Exit: RPC `complete_parasite_plan` executed OR date passed; Transitions to: `DOSAGE_APPLIED`, `EXPIRED`. Side Effects: Queues administration reminder.
  - `DOSAGE_APPLIED`: Entry: Execution of `complete_parasite_plan`; Exit: Soft delete request; Transitions to: `ARCHIVED`. Side Effects: Inserts into `parasite_records`.
  - `EXPIRED`: Entry: Date passed without application; Exit: Late completion via RPC; Transitions to: `DOSAGE_APPLIED`. Side Effects: Overdue notification dispatched.
  - `ARCHIVED`: Entry: Archival request; Exit: None (Terminal state); Transitions to: None. Side Effects: Sets `is_archived = true`.
- **EVIDENCE:** `CONFIRMED` — Source: [`supabase/migrations/20260716000000_parasite_plan_completion.sql`](file:///c:/Odi.Pet/supabase/migrations/20260716000000_parasite_plan_completion.sql).

---

### 4. Care Plan State Machine (`CarePlanFSM`)
- **STATES:** `DRAFT`, `ACTIVE`, `PAUSED`, `COMPLETED`, `CANCELLED`.
- **SPECIFICATION:**
  - `DRAFT`: Entry: Plan creation wizard opened; Exit: Form submitted; Transitions to: `ACTIVE`. Side Effects: None.
  - `ACTIVE`: Entry: Plan activated; Exit: All tasks completed OR user pauses plan; Transitions to: `COMPLETED`, `PAUSED`, `CANCELLED`. Side Effects: Generates calendar occurrences.
  - `PAUSED`: Entry: User toggles pause; Exit: User resumes plan; Transitions to: `ACTIVE`. Side Effects: Suspends notification jobs.
  - `COMPLETED`: Entry: End date reached; Exit: Reopened by user; Transitions to: `ACTIVE`. Side Effects: Updates completion metric.
  - `CANCELLED`: Entry: User cancels plan; Exit: None (Terminal state); Transitions to: None. Side Effects: Deletes associated pending notification jobs.
- **EVIDENCE:** `CONFIRMED` — Source: [`supabase/migrations/20260518000000_care_plans.sql`](file:///c:/Odi.Pet/supabase/migrations/20260518000000_care_plans.sql).

---

### 5. Agenda Task State Machine (`TaskFSM`)
- **STATES:** `pending`, `completed`, `overdue`, `dismissed`.
- **SPECIFICATION:**
  - `pending`: Entry: Task scheduled; Exit: Completed, date passed, or dismissed; Transitions to: `completed`, `overdue`, `dismissed`. Side Effects: None.
  - `overdue`: Entry: `NOW() > due_date` & `status = 'pending'`; Exit: Task completed or dismissed; Transitions to: `completed`, `dismissed`. Side Effects: Escalate notification.
  - `completed`: Entry: User checks task OR RPC completes plan; Exit: None (Terminal state); Transitions to: None. Side Effects: Sets `completed_at = NOW()`, increments care points.
  - `dismissed`: Entry: User dismisses task prompt; Exit: None (Terminal state); Transitions to: None. Side Effects: Logs in `dismissed_micro_tasks`.
- **EVIDENCE:** `CONFIRMED` — Source: [`supabase/migrations/20260710000003_plans_status_overdue.sql`](file:///c:/Odi.Pet/supabase/migrations/20260710000003_plans_status_overdue.sql).

---

### 6. Notification State Machine (`NotificationFSM`)
- **STATES:** `QUEUED`, `DISPATCHED`, `DELIVERED`, `READ`.
- **SPECIFICATION:**
  - `QUEUED`: Entry: Notification created in DB; Exit: Cron picks up job; Transitions to: `DISPATCHED`. Side Effects: Inserts row in `notification_jobs`.
  - `DISPATCHED`: Entry: VAPID push payload transmitted; Exit: SW receipt acknowledgement; Transitions to: `DELIVERED`. Side Effects: Triggers Edge Function dispatch.
  - `DELIVERED`: Entry: SW handles push event; Exit: User clicks notification; Transitions to: `READ`. Side Effects: PostMessage to open tabs.
  - `READ`: Entry: User opens notification; Exit: None (Terminal state); Transitions to: None. Side Effects: Sets `is_read = true`.
- **EVIDENCE:** `CONFIRMED` — Source: [`src/app/api/cron/dispatch-notifications/route.ts`](file:///c:/Odi.Pet/src/app/api/cron/dispatch-notifications/route.ts), [`src/sw.ts`](file:///c:/Odi.Pet/src/sw.ts).

---

### 7. Food Assignment State Machine (`FoodAssignmentFSM`)
- **STATES:** `DRAFT`, `TRANSITIONING_7DAY`, `ACTIVE_PRIMARY`, `ENDED`.
- **SPECIFICATION:**
  - `DRAFT`: Entry: SKU selected; Exit: Form confirmed; Transitions to: `TRANSITIONING_7DAY`. Side Effects: None.
  - `TRANSITIONING_7DAY`: Entry: New food assigned; Exit: 7 days elapsed; Transitions to: `ACTIVE_PRIMARY`. Side Effects: Calculates 25%->50%->75%->100% daily ratios.
  - `ACTIVE_PRIMARY`: Entry: Day 7 reached; Exit: RPC `swap_pet_food_assignment` executed; Transitions to: `ENDED`. Side Effects: Primary active diet for pet.
  - `ENDED`: Entry: Food swap execution; Exit: None (Terminal state); Transitions to: None. Side Effects: Sets `ended_at = NOW()`.
- **EVIDENCE:** `CONFIRMED` — Source: [`supabase/migrations/20260724180000_nutrition_assignment_swap.sql`](file:///c:/Odi.Pet/supabase/migrations/20260724180000_nutrition_assignment_swap.sql).

---

### 8. OCR Scan Job State Machine (`OCRScanFSM`)
- **STATES:** `IDLE`, `UPLOADING`, `QUOTA_CHECKING`, `PROCESSING_GEMINI`, `REVIEW_READY`, `FAILED`.
- **SPECIFICATION:**
  - `IDLE`: Entry: Scanner view mounted; Exit: Image selected; Transitions to: `UPLOADING`. Side Effects: None.
  - `UPLOADING`: Entry: Image submitted; Exit: Storage upload success; Transitions to: `QUOTA_CHECKING`. Side Effects: Saves image to private bucket `vaccine-documents`.
  - `QUOTA_CHECKING`: Entry: Upload complete; Exit: `consumeUsage()` returns success; Transitions to: `PROCESSING_GEMINI`. Side Effects: Deducts 1 scan unit from entitlement quota.
  - `PROCESSING_GEMINI`: Entry: Quota verified; Exit: Gemini returns valid JSON; Transitions to: `REVIEW_READY` (or `FAILED`). Side Effects: Sends Base64 image payload to Gemini Vision API.
  - `REVIEW_READY`: Entry: Structured JSON parsed; Exit: User verifies and clicks save; Transitions to: `IDLE`. Side Effects: Returns extracted fields to UI modal for human-in-the-loop review.
  - `FAILED`: Entry: API or parse error; Exit: Retry clicked; Transitions to: `IDLE`. Side Effects: Best-effort cleanup of uploaded file.
- **EVIDENCE:** `CONFIRMED` — Source: [`src/app/api/scan-document/route.ts:L80-L249`](file:///c:/Odi.Pet/src/app/api/scan-document/route.ts#L80-L249).

---

### 9. AI Processing State Machine (`AIProcessingFSM`)
- **STATES:** `QUEUED`, `FETCHING_SOURCES`, `SYNTHESIZING_GEMINI`, `AUDITING_FACTS`, `PUBLISHED`.
- **SPECIFICATION:**
  - `QUEUED`: Entry: Content job created; Exit: Worker picks up job; Transitions to: `FETCHING_SOURCES`. Side Effects: None.
  - `FETCHING_SOURCES`: Entry: Crawling enabled sources; Exit: Raw text extracted; Transitions to: `SYNTHESIZING_GEMINI`. Side Effects: Ingests web sources.
  - `SYNTHESIZING_GEMINI`: Entry: Text passed to Gemini; Exit: Article draft generated; Transitions to: `AUDITING_FACTS`. Side Effects: Synthesizes draft article text.
  - `AUDITING_FACTS`: Entry: Draft generated; Exit: Verification score >= 80%; Transitions to: `PUBLISHED`. Side Effects: Checks claims against source verification engine.
  - `PUBLISHED`: Entry: Audit passed; Exit: Archived by admin; Transitions to: None. Side Effects: Makes article visible in `/owner/learn`.
- **EVIDENCE:** `CONFIRMED` — Source: [`src/lib/content/jobPipelineService.ts`](file:///c:/Odi.Pet/src/lib/content/jobPipelineService.ts).

---

### 10. User Onboarding State Machine (`OnboardingFSM`)
- **STATES:** `NOT_STARTED`, `PET_BASICS`, `HEALTH_PREFERENCES`, `NUTRITION_SETUP`, `COMPLETED`.
- **SPECIFICATION:**
  - `NOT_STARTED`: Entry: User registers account; Exit: Step 1 submitted; Transitions to: `PET_BASICS`. Side Effects: Inserts into `user_onboarding_steps`.
  - `PET_BASICS`: Entry: Step 1 active; Exit: Pet name/species/breed saved; Transitions to: `HEALTH_PREFERENCES`. Side Effects: Creates initial pet row.
  - `HEALTH_PREFERENCES`: Entry: Step 2 active; Exit: Vaccine history configured; Transitions to: `NUTRITION_SETUP`. Side Effects: Generates protocol schedules.
  - `NUTRITION_SETUP`: Entry: Step 3 active; Exit: Food SKU assigned; Transitions to: `COMPLETED`. Side Effects: Activates food assignment.
  - `COMPLETED`: Entry: All steps finished; Exit: None (Terminal state); Transitions to: None. Side Effects: Marks `onboarding_completed = true` in profile.
- **EVIDENCE:** `CONFIRMED` — Source: [`src/hooks/useOnboardingProgress.ts`](file:///c:/Odi.Pet/src/hooks/useOnboardingProgress.ts).
