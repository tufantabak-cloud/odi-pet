# DOMAIN ARCHITECTURE & SYSTEM CAPABILITY SPECIFICATION

**System:** Odi Pet Platform  
**Scope:** Complete Domain Breakdown & Bounded Context Map  
**Audit Date:** August 12, 2026  
**Status:** FORENSIC BASELINE SPECIFICATION (READ-ONLY AUDIT)  

---

## EXECUTIVE DOMAIN ARCHITECTURE MATRIX

Odi Pet is structured around **13 primary active domain modules**. Every domain maintains its distinct bounded context, primary aggregate root, canonical database tables, application services, REST API routes, user interfaces, event signatures, and business logic rules.

| Domain Module | Aggregate Root | Canonical Tables | Key API Paths | Primary UI Routes | Core Service Files | Evidence Rating |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. User Identity & IAM** | `Profile` | `profiles`, `user_subscriptions`, `user_onboarding_steps`, `user_survey_stats`, `devices`, `push_subscriptions`, `security_audit_logs` | `/api/auth/*`, `/api/user/*`, `/api/users/*` | `/login`, `/register`, `/owner/profile` | [`auth-security.ts`](file:///c:/Odi.Pet/src/lib/auth-security.ts), [`get-current-profile.ts`](file:///c:/Odi.Pet/src/lib/auth/get-current-profile.ts) | `CONFIRMED` |
| **2. Pet Core & Family Membership** | `Pet` | `pets`, `pet_memberships`, `pet_membership_events`, `pet_invites`, `pet_gallery`, `pet_owners` | `/api/pets/*`, `/api/invite/*`, `/api/share/*` | `/owner/pets`, `/owner/pets/[id]`, `/invite/[code]` | [`useOnboardingProgress.ts`](file:///c:/Odi.Pet/src/hooks/useOnboardingProgress.ts), [`pet_memberships.sql`](file:///c:/Odi.Pet/supabase/migrations/20260728120000_canonical_pet_memberships_phase0.sql) | `CONFIRMED` |
| **3. Medical & Preventive Health** | `VaccineRecord` / `ParasiteRecord` | `vaccine_protocols`, `vaccine_brands`, `vaccine_records_v2`, `parasite_protocols`, `parasite_products`, `parasite_records`, `health_diseases`, `health_allergies`, `health_medications`, `health_treatments` | `/api/vaccines/*`, `/api/vaccination/*`, `/api/parasite-suggestions/*`, `/api/symptoms/*` | `/owner/pets/[id]/vaccines`, `/owner/pets/[id]/parasites`, `/owner/pets/[id]/health` | [`createVaccineNotifications.ts`](file:///c:/Odi.Pet/src/lib/notifications/createVaccineNotifications.ts), [`vaccine_system_v2.sql`](file:///c:/Odi.Pet/supabase/migrations/202404250003_vaccine_system_v2.sql) | `CONFIRMED` |
| **4. Reproductive, Estrus & Breeding** | `PetEstrusCycle` | `pet_estrus_cycles`, `pet_estrus_observations`, `pet_estrus_preferences`, `pet_reproductive_tests`, `pet_breeding_eligibility`, `breeding_listings`, `breeding_applications` | `/api/breeding-listings/*`, `/api/breeding-applications/*` | `/owner/pets/[id]/estrus`, `/owner/social/breeding` | [`calculateReproductiveForecast.ts`](file:///c:/Odi.Pet/src/lib/estrus/calculateReproductiveForecast.ts), [`evaluateBreedingEligibility.ts`](file:///c:/Odi.Pet/src/lib/estrus/evaluateBreedingEligibility.ts) | `CONFIRMED` |
| **5. Nutrition & Food Assignment** | `PetFoodAssignment` | `food_brands`, `food_manufacturers`, `food_skus`, `pet_food_assignments`, `nutrition_logs`, `feeding_logs` | `/api/nutrition/*` | `/owner/pets/[id]/nutrition` | [`food_catalog_and_assignments.sql`](file:///c:/Odi.Pet/supabase/migrations/20260723220000_food_catalog_and_assignments.sql) | `CONFIRMED` |
| **6. Care & Weight Management** | `CarePlan` | `care_plans`, `care_events`, `weight_logs`, `growth_records` | `/api/care-plans/*` | `/owner/pets/[id]/care`, `/owner/pets/[id]/weight` | [`pet_care_tables.sql`](file:///c:/Odi.Pet/supabase/migrations/20260613120000_pet_care_tables.sql) | `CONFIRMED` |
| **7. Planning & Agenda Orchestration** | `Plan` | `plans`, `notification_jobs`, `health_schedules`, `calendar_feed_tokens` | `/api/plans/*`, `/api/tasks/*`, `/api/agenda/*`, `/api/calendar/*` | `/owner/plan-yap`, `/owner/events` | [`service.ts`](file:///c:/Odi.Pet/src/lib/plans/service.ts), [`pet-agenda-service.ts`](file:///c:/Odi.Pet/src/lib/agenda/pet-agenda-service.ts) | `CONFIRMED` |
| **8. Notifications & Cron Engine** | `Notification` | `notifications`, `notification_jobs`, `device_push_subscriptions`, `device_tokens` | `/api/notifications/*`, `/api/cron/*` | Background / SW / Push UI | [`web-push-client.ts`](file:///c:/Odi.Pet/src/lib/notifications/web-push-client.ts), [`sw.ts`](file:///c:/Odi.Pet/src/sw.ts) | `CONFIRMED` |
| **9. Emergency SOS & Lost Reports** | `LostReport` | `lost_reports`, `lost_report_contacts`, `lost_report_drafts` | `/api/sos/*`, `/api/reports/*` | `/sos`, `/owner/lost-report` | [`lost_reports.sql`](file:///c:/Odi.Pet/supabase/migrations/20260528000001_lost_reports.sql) | `CONFIRMED` |
| **10. Social & Marketplace Vets** | `SocialPost` / `Booking` | `social_posts`, `post_comments`, `post_likes`, `conversations`, `messages`, `clinics`, `vets`, `bookings`, `appointments`, `payments` | `/api/social/*`, `/api/marketplace/*`, `/api/bookings/*`, `/api/vets/*` | `/owner/social`, `/owner/marketplace`, `/owner/vets` | [`vet_marketplace.sql`](file:///c:/Odi.Pet/supabase/migrations/20240428000003_vet_marketplace.sql) | `CONFIRMED` |
| **11. AI & Smart Scanner** | `SmartScannerRecord` | `smart_scanner_records`, `content_generation_jobs`, `articles`, `source_verification_audits` | `/api/scan-document/*`, `/api/ai-vet/*`, `/api/articles/*` | `/owner/scanner`, `/owner/ai-vet`, `/owner/learn` | [`scan-document/route.ts`](file:///c:/Odi.Pet/src/app/api/scan-document/route.ts), [`userHealthAgent.ts`](file:///c:/Odi.Pet/src/lib/agents/userHealthAgent.ts) | `CONFIRMED` |
| **12. Experience & Monthly Orchestration** | `OrchestratorCampaign` | `orchestrator_campaigns`, `orchestrator_prompts`, `orchestrator_analytics` | `/api/orchestrator/*` | Dynamic BottomSheet / Modal | [`experience_orchestrator.sql`](file:///c:/Odi.Pet/supabase/migrations/20260803000003_experience_orchestrator.sql), [`monthly_growth_orchestrator.sql`](file:///c:/Odi.Pet/supabase/migrations/20260806123000_monthly_growth_orchestrator.sql) | `CONFIRMED` |
| **13. Admin & Feature Registry** | `FeatureRegistry` | `feature_registry`, `feature_registry_versions`, `feature_registry_overrides`, `feature_usages`, `system_settings`, `admin_audit_logs` | `/api/admin/*` | `/admin/*` (22 panels) | [`registry.ts`](file:///c:/Odi.Pet/src/lib/features/registry.ts), [`usage.ts`](file:///c:/Odi.Pet/src/lib/features/usage.ts) | `CONFIRMED` |

---

## DETAILED DOMAIN BREAKDOWN SPECIFICATIONS

### 1. User Identity & IAM Domain
- **DOMAIN:** User Identity & Access Management (IAM)
- **PURPOSE:** Handles user authentication, security profiles, role-based authorization (RBAC), security event logging, PWA push registration, and progressive profiling consent.
- **ENTITIES:** `Profile`, `UserRole`, `DeviceSubscription`, `SecurityAuditLog`, `UserSurveyStat`.
- **SERVICES:** [`auth-security.ts`](file:///c:/Odi.Pet/src/lib/auth-security.ts), [`get-current-profile.ts`](file:///c:/Odi.Pet/src/lib/auth/get-current-profile.ts), [`profiling-engine.ts`](file:///c:/Odi.Pet/src/lib/profiling-engine.ts).
- **TABLES:** `profiles`, `user_subscriptions`, `user_badges`, `user_activation_scores`, `user_onboarding_steps`, `user_survey_stats`, `devices`, `push_subscriptions`, `security_audit_logs`, `session_logs`.
- **APIS:** `/api/auth/*`, `/api/user/*`, `/api/users/*`.
- **UI:** `/login`, `/register`, `/reset-password`, `/update-password`, `/owner/profile`.
- **EVENTS:** `user.created`, `user.login.success`, `user.password.reset`, `device.registered`.
- **DEPENDENCIES:** Supabase Auth (`auth.users`), WebPush VAPID Infrastructure.
- **OWNERSHIP:** IAM & Security Domain Team.
- **BUSINESS RULES:** Automatic profile sync via `on_auth_user_created` trigger ([`all_in_one_supabase.sql:L173`](file:///c:/Odi.Pet/all_in_one_supabase.sql#L173)); user roles locked to `owner`, `clinic_staff`, `clinic_admin`, `super_admin`.
- **EVIDENCE:** `CONFIRMED` — Code source: [`src/lib/auth-security.ts`](file:///c:/Odi.Pet/src/lib/auth-security.ts), [`supabase/migrations/20240420000000_init_schema.sql`](file:///c:/Odi.Pet/supabase/migrations/20240420000000_init_schema.sql).

---

### 2. Pet Core & Family Membership Domain
- **DOMAIN:** Pet Core & Family Membership Domain
- **PURPOSE:** Stores digital identity, species/breed categorization, neuter status, avatar image assets, and multi-owner family access controls.
- **ENTITIES:** `Pet`, `PetMembership`, `PetInvite`, `SharedPetCard`, `PetGallery`.
- **SERVICES:** [`useOnboardingProgress.ts`](file:///c:/Odi.Pet/src/hooks/useOnboardingProgress.ts), [`create_pet_caregiver_invite_token`](file:///c:/Odi.Pet/supabase/migrations/20260809230000_fix_create_pet_caregiver_invite_token.sql).
- **TABLES:** `pets`, `pet_memberships`, `pet_members`, `pet_membership_events`, `pet_membership_issues`, `shared_pet_cards`, `pet_invites`, `pet_gallery`, `pet_owners`.
- **APIS:** `/api/pets/*`, `/api/invite/*`, `/api/share/*`.
- **UI:** `/owner/pets`, `/owner/pets/add`, `/owner/pets/[id]`, `/invite/[code]`.
- **EVENTS:** `pet.created`, `pet.updated`, `pet.membership.invited`, `pet.membership.accepted`.
- **DEPENDENCIES:** User IAM Domain, Supabase Storage (`pet_gallery_bucket`).
- **OWNERSHIP:** Core Pet Product Team.
- **BUSINESS RULES:** Neuter status tracked via `is_neutered` (`BOOLEAN`); multi-owner access enforced via `pet_memberships` role-based permissions (`owner`, `co_owner`, `caregiver`, `reader`); age group rules defined by species rules (Dog/Cat: 0-1 Puppy/Kitten, 1-7 Adult, 7-12 Senior, 12+ Senior+).
- **EVIDENCE:** `CONFIRMED` — Code source: [`src/lib/species.ts`](file:///c:/Odi.Pet/src/lib/species.ts), [`supabase/migrations/20260728120000_canonical_pet_memberships_phase0.sql`](file:///c:/Odi.Pet/supabase/migrations/20260728120000_canonical_pet_memberships_phase0.sql).

---

### 3. Medical & Preventive Health Domain
- **DOMAIN:** Medical & Preventive Health Domain
- **PURPOSE:** Manages medical history, clinical protocols, core/non-core vaccine administration, internal/external parasite routines, allergies, and treatments.
- **ENTITIES:** `VaccineRecord`, `VaccineProtocol`, `ParasiteRecord`, `ParasiteProtocol`, `ParasiteProduct`, `HealthAllergy`, `HealthSchedule`.
- **SERVICES:** [`createVaccineNotifications.ts`](file:///c:/Odi.Pet/src/lib/notifications/createVaccineNotifications.ts), [`complete_vaccine_plan_and_record`](file:///c:/Odi.Pet/supabase/migrations/20260723190001_atomic_rpc_and_idempotency_v6.sql), [`complete_parasite_plan`](file:///c:/Odi.Pet/supabase/migrations/20260716000000_parasite_plan_completion.sql).
- **TABLES:** `vaccine_protocols`, `vaccine_brands`, `vaccination_plan_items`, `vaccine_records_v2`, `pet_vaccine_preferences`, `parasite_protocols`, `parasite_products`, `parasite_records`, `pet_parasite_preferences`, `health_records`, `health_plans`, `health_schedules`, `health_allergies`, `health_diseases`, `health_medications`, `health_treatments`.
- **APIS:** `/api/vaccines/*`, `/api/vaccination/*`, `/api/parasite-suggestions/*`, `/api/symptoms/*`.
- **UI:** `/owner/pets/[id]/vaccines`, `/owner/pets/[id]/parasites`, `/owner/pets/[id]/health`.
- **EVENTS:** `vaccine.scheduled`, `vaccine.completed`, `vaccine.overdue`, `parasite.applied`, `parasite.overdue`.
- **DEPENDENCIES:** Pet Core Domain, Care Planning Domain.
- **OWNERSHIP:** Medical & Clinical Systems Domain Team.
- **BUSINESS RULES:** Medical data CANNOT be hard-deleted (`is_archived = true` mandatory archival rule); protocol lookup is driven by species/breed/age; atomic RPC execution ensures database consistency between plan completion and record creation.
- **EVIDENCE:** `CONFIRMED` — Code source: [`supabase/migrations/20260715164000_remove_duplicate_vaccines_and_add_unique.sql`](file:///c:/Odi.Pet/supabase/migrations/20260715164000_remove_duplicate_vaccines_and_add_unique.sql), [`supabase/migrations/20260715210000_create_parasite_protocol_architecture.sql`](file:///c:/Odi.Pet/supabase/migrations/20260715210000_create_parasite_protocol_architecture.sql).

---

### 4. Reproductive, Estrus & Breeding Domain
- **DOMAIN:** Reproductive, Estrus & Breeding Domain
- **PURPOSE:** Tracks female pet estrus cycles, predicts heat/ovulation windows, verifies breeding eligibility against medical records, and coordinates breeding applications.
- **ENTITIES:** `PetEstrusCycle`, `HeatObservation`, `ReproductiveTest`, `BreedingEligibility`, `BreedingListing`, `BreedingApplication`.
- **SERVICES:** [`calculateReproductiveForecast.ts`](file:///c:/Odi.Pet/src/lib/estrus/calculateReproductiveForecast.ts), [`evaluateBreedingEligibility.ts`](file:///c:/Odi.Pet/src/lib/estrus/evaluateBreedingEligibility.ts).
- **TABLES:** `pet_estrus_cycles`, `pet_estrus_observations`, `pet_estrus_preferences`, `pet_reproductive_tests`, `pet_breeding_eligibility`, `breeding_listings`, `breeding_applications`, `breeding_consent_records`.
- **APIS:** `/api/breeding-listings/*`, `/api/breeding-applications/*`.
- **UI:** `/owner/pets/[id]/estrus`, `/owner/social/breeding`.
- **EVENTS:** `estrus.cycle.started`, `estrus.ovulation.forecasted`, `breeding.eligibility.checked`, `breeding.application.submitted`.
- **DEPENDENCIES:** Pet Core Domain, Medical & Preventive Health Domain.
- **OWNERSHIP:** Health & Breeding Domain Team.
- **BUSINESS RULES:** Partial index `idx_pet_estrus_cycles_unique_open` enforces a SINGLE active/open cycle per pet at any given time; breeding eligibility enforces mandatory vaccine and parasite check clearance.
- **EVIDENCE:** `CONFIRMED` — Code source: [`supabase/migrations/20260715113000_add_unique_open_cycle_index.sql`](file:///c:/Odi.Pet/supabase/migrations/20260715113000_add_unique_open_cycle_index.sql), [`src/lib/estrus/evaluateBreedingEligibility.ts`](file:///c:/Odi.Pet/src/lib/estrus/evaluateBreedingEligibility.ts).

---

### 5. Nutrition & Food Assignment Domain
- **DOMAIN:** Nutrition & Food Assignment Domain
- **PURPOSE:** Manages commercial pet food catalog, active food assignments, 7-day food transition (swap) schedules, daily feeding logs, and caloric target matching.
- **ENTITIES:** `FoodBrand`, `FoodSKU`, `PetFoodAssignment`, `NutritionLog`, `DailyFeedingLog`.
- **SERVICES:** [`swap_pet_food_assignment`](file:///c:/Odi.Pet/supabase/migrations/20260724180000_nutrition_assignment_swap.sql), [`end_pet_food_assignment`](file:///c:/Odi.Pet/supabase/migrations/20260724190000_end_pet_food_assignment.sql).
- **TABLES:** `food_brands`, `food_manufacturers`, `food_product_families`, `food_skus`, `food_brand_aliases`, `food_label_versions`, `food_inventory`, `pet_food_assignments`, `nutrition_logs`, `pet_nutrition_logs`, `pet_nutrition_profiles`, `feeding_logs`.
- **APIS:** `/api/nutrition/*`.
- **UI:** `/owner/pets/[id]/nutrition`.
- **EVENTS:** `food.assigned`, `food.swapped`, `food.transition.stage_advanced`, `nutrition.logged`.
- **DEPENDENCIES:** Pet Core Domain, Care Planning Domain.
- **OWNERSHIP:** Nutrition & Wellness Domain Team.
- **BUSINESS RULES:** Food swap enforces a 7-day gradual transition rule (Days 1-2: 25% new, Days 3-4: 50% new, Days 5-6: 75% new, Day 7+: 100% new); ending assignment updates `ended_at = NOW()` without deleting historical logs.
- **EVIDENCE:** `CONFIRMED` — Code source: [`supabase/migrations/20260723220000_food_catalog_and_assignments.sql`](file:///c:/Odi.Pet/supabase/migrations/20260723220000_food_catalog_and_assignments.sql).

---

### 6. Care & Weight Management Domain
- **DOMAIN:** Care & Weight Management Domain
- **PURPOSE:** Manages routine hygiene tasks (grooming, bathing, nail trimming), weight measurement tracking, and body condition scoring (BCS).
- **ENTITIES:** `CarePlan`, `CareEvent`, `WeightLog`, `GrowthRecord`.
- **SERVICES:** [`pet_care_tables.sql`](file:///c:/Odi.Pet/supabase/migrations/20260613120000_pet_care_tables.sql), [`add_height_to_weight_logs.sql`](file:///c:/Odi.Pet/supabase/migrations/20260724234400_add_height_to_weight_logs.sql).
- **TABLES:** `care_plans`, `care_events`, `pet_care_tasks`, `pet_care_events`, `weight_logs`, `growth_records`.
- **APIS:** `/api/care-plans/*`.
- **UI:** `/owner/pets/[id]/care`, `/owner/pets/[id]/weight`.
- **EVENTS:** `care.plan.created`, `care.event.completed`, `weight.logged`.
- **DEPENDENCIES:** Pet Core Domain, Care Planning Domain.
- **OWNERSHIP:** Hygiene & Care Domain Team.
- **BUSINESS RULES:** Weight logs accept optional height parameter; historical weight entries are immutable and form the basis of weight growth charts.
- **EVIDENCE:** `CONFIRMED` — Code source: [`supabase/migrations/20260613120000_pet_care_tables.sql`](file:///c:/Odi.Pet/supabase/migrations/20260613120000_pet_care_tables.sql).

---

### 7. Planning & Agenda Orchestration Domain
- **DOMAIN:** Planning & Agenda Orchestration Domain
- **PURPOSE:** Central task scheduling engine for health, hygiene, and nutrition routines; handles recurring occurrences, iCal calendar feeds, and task status management.
- **ENTITIES:** `Plan`, `PlanOccurrence`, `NotificationJob`, `CalendarFeedToken`.
- **SERVICES:** [`service.ts`](file:///c:/Odi.Pet/src/lib/plans/service.ts), [`pet-agenda-service.ts`](file:///c:/Odi.Pet/src/lib/agenda/pet-agenda-service.ts), [`complete_recurring_plan_rpc`](file:///c:/Odi.Pet/supabase/migrations/20260723132000_complete_recurring_plan_rpc.sql).
- **TABLES:** `plans`, `notification_jobs`, `health_schedules`, `calendar_feed_tokens`.
- **APIS:** `/api/plans/*`, `/api/tasks/*`, `/api/agenda/*`, `/api/calendar/*`.
- **UI:** `/owner/plan-yap`, `/owner/events`.
- **EVENTS:** `plan.created`, `plan.completed`, `plan.overdue`, `plan.dismissed`.
- **DEPENDENCIES:** Pet Core Domain, Medical Domain, Nutrition Domain.
- **OWNERSHIP:** Core Agenda Engine Team.
- **BUSINESS RULES:** Status transition: `active` -> `completed` / `overdue`; completion of recurring plans automatically calculates and queues next `due_date`.
- **EVIDENCE:** `CONFIRMED` — Code source: [`src/lib/plans/service.ts`](file:///c:/Odi.Pet/src/lib/plans/service.ts), [`supabase/migrations/20260710000003_plans_status_overdue.sql`](file:///c:/Odi.Pet/supabase/migrations/20260710000003_plans_status_overdue.sql).

---

### 8. Notifications & Cron Engine Domain
- **DOMAIN:** Notifications & Cron Engine Domain
- **PURPOSE:** Persists notifications, queues dispatch jobs, executes background cron processing, delivers Web Push payloads to Service Worker, and handles lock screen deduplication.
- **ENTITIES:** `Notification`, `NotificationJob`, `DevicePushSubscription`.
- **SERVICES:** [`web-push-client.ts`](file:///c:/Odi.Pet/src/lib/notifications/web-push-client.ts), [`sw.ts`](file:///c:/Odi.Pet/src/sw.ts), [`dispatch-notifications/route.ts`](file:///c:/Odi.Pet/src/app/api/cron/dispatch-notifications/route.ts).
- **TABLES:** `notifications`, `notification_jobs`, `device_push_subscriptions`, `devices`.
- **APIS:** `/api/notifications/*`, `/api/cron/*`.
- **UI:** In-App Notification Bell Dropdown, PWA Lock Screen Push.
- **EVENTS:** `notification.created`, `notification.job.queued`, `push.dispatched`, `push.received`, `notification.read`.
- **DEPENDENCIES:** User IAM Domain, Planning Domain, VAPID Edge Function.
- **OWNERSHIP:** Platform Telemetry & Notifications Team.
- **BUSINESS RULES:** Service Worker deduplication via entity tag format `${entity_type}:${entity_id}:${event}`; cron jobs execute with `cron-auth` authorization header.
- **EVIDENCE:** `CONFIRMED` — Code source: [`src/sw.ts:L115-L131`](file:///c:/Odi.Pet/src/sw.ts#L115-L131), [`src/app/api/cron/dispatch-notifications/route.ts`](file:///c:/Odi.Pet/src/app/api/cron/dispatch-notifications/route.ts).

---

### 9. Emergency SOS & Lost Pet Domain
- **DOMAIN:** Emergency SOS & Lost Pet Domain
- **PURPOSE:** Generates immediate alerts and public emergency posters when a pet is reported lost, managing contacts and public sightings.
- **ENTITIES:** `LostReport`, `LostReportContact`, `LostReportDraft`, `SOSPublicView`.
- **SERVICES:** [`can_publish_pet_lost_report`](file:///c:/Odi.Pet/supabase/migrations/20260724233000_complete_lost_report_wizard.sql).
- **TABLES:** `lost_reports`, `lost_report_contacts`, `lost_report_drafts`.
- **APIS:** `/api/sos/*`, `/api/reports/*`.
- **UI:** `/sos`, `/owner/lost-report`, `FloatingSOS.tsx`.
- **EVENTS:** `lost_report.created`, `lost_report.published`, `lost_report.resolved`.
- **DEPENDENCIES:** Pet Core Domain, User IAM Domain.
- **OWNERSHIP:** Safety & Emergency Domain Team.
- **BUSINESS RULES:** Publish restriction enforced via RPC `can_publish_pet_lost_report` (checks pet ownership, status, and active report conflicts).
- **EVIDENCE:** `CONFIRMED` — Code source: [`supabase/migrations/20260528000001_lost_reports.sql`](file:///c:/Odi.Pet/supabase/migrations/20260528000001_lost_reports.sql).

---

### 10. Social & Marketplace Vets Domain
- **DOMAIN:** Social & Marketplace Vets Domain
- **PURPOSE:** Manages community social feed, direct messaging, adoption applications, vet clinic directory listings, appointments, and Stripe billing.
- **ENTITIES:** `SocialPost`, `PostComment`, `Booking`, `Appointment`, `VetClinic`, `PaymentRecord`.
- **SERVICES:** [`/api/payments/webhook/route.ts`](file:///c:/Odi.Pet/src/app/api/payments/webhook/route.ts), [`vet_marketplace.sql`](file:///c:/Odi.Pet/supabase/migrations/20240428000003_vet_marketplace.sql).
- **TABLES:** `social_posts`, `post_comments`, `post_likes`, `conversations`, `messages`, `clinics`, `vets`, `bookings`, `appointments`, `payments`, `stripe_webhook_events`.
- **APIS:** `/api/social/*`, `/api/marketplace/*`, `/api/bookings/*`, `/api/vets/*`, `/api/payments/*`.
- **UI:** `/owner/social`, `/owner/marketplace`, `/owner/vets`, `/clinic/*`.
- **EVENTS:** `post.created`, `booking.requested`, `booking.confirmed`, `payment.succeeded`.
- **DEPENDENCIES:** User IAM Domain, Pet Core Domain, Stripe Webhook API.
- **OWNERSHIP:** Commercial Operations & Social Team.
- **BUSINESS RULES:** Stripe webhook events logged to `stripe_webhook_events` with idempotency retry checks; clinic access secured via `clinic_memberships`.
- **EVIDENCE:** `CONFIRMED` — Code source: [`supabase/migrations/20260724234000_add_stripe_webhook_event_log.sql`](file:///c:/Odi.Pet/supabase/migrations/20260724234000_add_stripe_webhook_event_log.sql).

---

### 11. AI & Smart Scanner Domain
- **DOMAIN:** AI & Smart Scanner Domain
- **PURPOSE:** Performs Gemini Vision OCR on passport/vaccine documents, powers interactive medical AI assistant, and synthesizes evidence-backed articles.
- **ENTITIES:** `SmartScannerRecord`, `ContentGenerationJob`, `Article`, `VerificationAudit`.
- **SERVICES:** [`scan-document/route.ts`](file:///c:/Odi.Pet/src/app/api/scan-document/route.ts), [`userHealthAgent.ts`](file:///c:/Odi.Pet/src/lib/agents/userHealthAgent.ts), [`contentResearchService.ts`](file:///c:/Odi.Pet/src/lib/content/contentResearchService.ts).
- **TABLES:** `smart_scanner_records`, `content_generation_jobs`, `articles`, `article_sources`, `source_verification_audits`, `ai_usage_logs`.
- **APIS:** `/api/scan-document/*`, `/api/ai-vet/*`, `/api/articles/*`.
- **UI:** `/owner/scanner`, `/owner/ai-vet`, `/owner/learn`.
- **EVENTS:** `ocr.scan.requested`, `ocr.scan.completed`, `ai.chat.queried`, `article.generated`.
- **DEPENDENCIES:** Pet Core Domain, Google Gemini 1.5/2.0 API, Supabase Storage (`vaccine-documents`).
- **OWNERSHIP:** AI & Content Intelligence Team.
- **BUSINESS RULES:** OCR quota checked BEFORE Gemini call via `getUsageEngine().consumeUsage`; OPOS Vol 13 Human-In-The-Loop rule prohibits autonomous database mutations without explicit user verification; Medical Disclaimer mandatory on all AI outputs.
- **EVIDENCE:** `CONFIRMED` — Code source: [`src/app/api/scan-document/route.ts:L166-L182`](file:///c:/Odi.Pet/src/app/api/scan-document/route.ts#L166-L182), [`supabase/migrations/20260531180000_smart_scanner.sql`](file:///c:/Odi.Pet/supabase/migrations/20260531180000_smart_scanner.sql).

---

### 12. Experience & Monthly Orchestration Domain
- **DOMAIN:** Experience & Monthly Orchestration Domain
- **PURPOSE:** Dynamic campaign engine that targets specific user/pet segments to display contextual bottom sheets, growth photo collection prompts, and habit banners.
- **ENTITIES:** `OrchestratorCampaign`, `OrchestratorPrompt`, `OrchestratorAnalytics`.
- **SERVICES:** [`/api/orchestrator/evaluate/route.ts`](file:///c:/Odi.Pet/src/app/api/orchestrator/evaluate/route.ts), [`/api/orchestrator/submit/route.ts`](file:///c:/Odi.Pet/src/app/api/orchestrator/submit/route.ts).
- **TABLES:** `orchestrator_campaigns`, `orchestrator_prompts`, `orchestrator_analytics`.
- **APIS:** `/api/orchestrator/*`.
- **UI:** Dynamic Contextual BottomSheets / Modals (`SmartMonthlyGrowthPrompt.tsx`).
- **EVENTS:** `orchestrator.evaluated`, `orchestrator.prompt.shown`, `orchestrator.prompt.action_completed`.
- **DEPENDENCIES:** Pet Core Domain, User IAM Domain.
- **OWNERSHIP:** Product Growth & Experience Orchestration Team.
- **BUSINESS RULES:** Deterministic UUID seeding for campaigns; cooldown hours enforced via campaign rules (e.g. 720h / 30 days for Monthly Growth); events tracked in `orchestrator_analytics`.
- **EVIDENCE:** `CONFIRMED` — Code source: [`supabase/migrations/20260803000003_experience_orchestrator.sql`](file:///c:/Odi.Pet/supabase/migrations/20260803000003_experience_orchestrator.sql), [`supabase/migrations/20260806123000_monthly_growth_orchestrator.sql`](file:///c:/Odi.Pet/supabase/migrations/20260806123000_monthly_growth_orchestrator.sql).

---

### 13. Admin & Feature Registry Domain
- **DOMAIN:** Admin & Feature Registry Domain
- **PURPOSE:** Back-office administrative control panel, dynamic feature flag toggles, entitlement checks, system settings overrides, and admin audit logging.
- **ENTITIES:** `FeatureRegistry`, `FeatureRegistryVersion`, `FeatureUsage`, `SystemSetting`, `AdminAuditLog`.
- **SERVICES:** [`registry.ts`](file:///c:/Odi.Pet/src/lib/features/registry.ts), [`usage.ts`](file:///c:/Odi.Pet/src/lib/features/usage.ts), [`APIFeatureGuard.ts`](file:///c:/Odi.Pet/src/lib/features/guards/APIFeatureGuard.ts).
- **TABLES:** `feature_registry`, `feature_registry_versions`, `feature_registry_overrides`, `feature_usages`, `system_settings`, `admin_audit_logs`.
- **APIS:** `/api/admin/*`.
- **UI:** `/admin/*` (22 Back-office management panels).
- **EVENTS:** `feature.toggled`, `entitlement.updated`, `setting.changed`, `admin.action.logged`.
- **DEPENDENCIES:** All System Domains, Supabase `service_role` Execution Context.
- **OWNERSHIP:** Core Platform Architecture & Operations Team.
- **BUSINESS RULES:** Features guarded via `withAPIFeatureGuard`; usage tracked atomically via `feature_usages` table and RPC sync; versioning supports rollback to historical snapshots.
- **EVIDENCE:** `CONFIRMED` — Code source: [`src/lib/features/registry.ts`](file:///c:/Odi.Pet/src/lib/features/registry.ts), [`supabase/migrations/20260806220000_feature_registry_phase1.sql`](file:///c:/Odi.Pet/supabase/migrations/20260806220000_feature_registry_phase1.sql).
