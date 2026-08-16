# Odi Pet - Data Flow Architecture

This document presents an exhaustive trace of all real end-to-end data flows within the Odi Pet repository. Each flow maps the precise execution pipeline from User Action, UI Components, API Endpoint, Business Logic, Database Mutations, Events Emitted, Secondary Background Processes, to Notification/Dashboard Results.

---

## Data Flow Traces

### Flow 1: User Registration & Progressive Onboarding Flow
- **FLOW_ID:** `FLOW-001`
- **TRIGGER:** User opens Odi Pet web/PWA and signs up via OTP, Google OAuth, or credentials.
- **INPUT:** Email, phone, password or OAuth token.
- **PROCESSING:**
  1. **USER ACTION:** Fills registration form or clicks OAuth button.
  2. **UI:** `src/app/(auth)/login/page.tsx` or `src/app/(auth)/register/page.tsx`.
  3. **API / SERVER ACTION:** Auth client calls `/api/auth/*` or Supabase Auth `signUp()`.
  4. **BUSINESS LOGIC:** `src/lib/auth/` creates Supabase Auth user session; SQL trigger `on_auth_user_created` fires to generate matching profile row.
  5. **DATABASE:** Insert into `auth.users` -> DB trigger inserts into `public.profiles` (`id`, `email`, `phone`, `role = 'owner'`).
  6. **EVENT:** `auth.sign_up` event emitted; welcome credit initialization RPC `system_settings_and_welcome_credit.sql` triggered.
  7. **SECONDARY PROCESS:** Onboarding progress record (`pets_onboarding_progress`) initialized for user.
  8. **NOTIFICATION / DASHBOARD:** User redirected to `/onboarding` step 1 (species selection).
- **DATA STORED:** `profiles`, `pets_onboarding_progress`, `user_survey_stats`.
- **EVENTS:** `user.registered`, `profile.created`.
- **SIDE EFFECTS:** Initializes user survey fatigue stat (`user_survey_stats`) to zero.
- **USER_VISIBLE_RESULT:** Welcome screen and step-1 pet creation modal.
- **ERROR_PATH:** Duplicate email -> Supabase Auth returns 400 Bad Request; UI displays toast notification "Bu e-posta adresi zaten kullanımda".
- **SOURCE:** `src/app/(auth)/`, `supabase/migrations/20240420000004_fix_profiles_rls.sql`, `supabase/migrations/20260617000000_onboarding_system_v3.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### Flow 2: Pet Creation & Bio-Profile Setup
- **FLOW_ID:** `FLOW-002`
- **TRIGGER:** User completes onboarding modal or clicks "+ Pet Ekle" in top header.
- **INPUT:** Pet name, species (`cat` or `dog`), breed ID, birth date, gender, neutered status (`is_neutered`), weight (kg), avatar photo.
- **PROCESSING:**
  1. **USER ACTION:** User selects pet details and submits form.
  2. **UI:** `src/components/pets/PetAddModal.tsx` or `src/app/onboarding/page.tsx`.
  3. **API / SERVER ACTION:** POST request to `/api/pets` or atomic RPC call `create_pet_atomic()`.
  4. **BUSINESS LOGIC:** `src/lib/pets/petService.ts` validates species enum (`cat` | `dog`), birth date (must not be in future), and computes initial age category (`Yavru`, `Yetişkin`, `Yaşlı`).
  5. **DATABASE:**
     - Insert into `pets` table (`id`, `name`, `species`, `breed`, `birth_date`, `is_neutered`).
     - Insert into `pet_owners` table (`pet_id`, `owner_id`, `role = 'owner'`).
     - Insert into `pet_memberships` table (`pet_id`, `user_id`, `role = 'owner'`, `status = 'active'`).
     - Insert initial weight record into `weight_logs` (`pet_id`, `weight_kg`, `logged_at`).
  6. **EVENT:** `pet.created` emitted.
  7. **SECONDARY PROCESS:** Automatic triggering of default preventive health protocol assignments (`vaccine_protocols` & `parasite_protocols`).
  8. **NOTIFICATION / DASHBOARD:** Dashboard updates; new pet card appears with avatar placeholder; health score initialized.
- **DATA STORED:** `pets`, `pet_owners`, `pet_memberships`, `weight_logs`.
- **EVENTS:** `pet.created`, `membership.assigned`.
- **SIDE EFFECTS:** Triggers protocol matching service for age/species.
- **USER_VISIBLE_RESULT:** Redirect to Pet Profile `/owner/pets/[id]` with newly populated pet digital hero card.
- **ERROR_PATH:** Invalid species (e.g. `bird`) -> DB constraint `pets_species_check` fails; API returns 422 Unprocessable Entity.
- **SOURCE:** `src/lib/pets/petService.ts`, `supabase/migrations/20240420000002_restrict_species.sql`, `supabase/migrations/20260731180000_create_pet_atomic_rpc.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### Flow 3: Vaccine Protocol Auto-Generation & Plan Scheduling
- **FLOW_ID:** `FLOW-003`
- **TRIGGER:** Pet created or user selects "Protokolü Uygula" for a species-specific vaccine.
- **INPUT:** `pet_id`, `species`, `birth_date`.
- **PROCESSING:**
  1. **USER ACTION:** Triggers automatically upon pet creation or protocol selection in health tab.
  2. **UI:** `src/components/health/VaccineProtocolSection.tsx`.
  3. **API / SERVER ACTION:** POST to `/api/vaccines/protocol-apply`.
  4. **BUSINESS LOGIC:** `src/services/vaccineProtocolService.ts` fetches active protocols from `vaccine_protocols` where `species = pet.species` and `is_active = true`.
  5. **DATABASE:**
     - Inserts plan records into `plans` (`pet_id`, `title`, `category = 'vaccine'`, `status = 'pending'`).
     - Inserts occurrence records into `plan_occurrences` (`plan_id`, `scheduled_at = birth_date + target_age_days`, `status = 'scheduled'`).
     - Inserts plan items into `vaccination_plan_items`.
  6. **EVENT:** `vaccine_plan.generated`.
  7. **SECONDARY PROCESS:** Notification jobs queued in `notification_jobs` for 7 days before, 1 day before, and on due date.
  8. **NOTIFICATION / DASHBOARD:** Upcoming vaccine tasks appear on Pet Dashboard and Health Agenda.
- **DATA STORED:** `plans`, `plan_occurrences`, `vaccination_plan_items`, `notification_jobs`.
- **EVENTS:** `plans.created`, `jobs.scheduled`.
- **SIDE EFFECTS:** Populates calendar occurrence view `vaccination_upcoming_tasks_view`.
- **USER_VISIBLE_RESULT:** Health agenda displays timeline of scheduled vaccinations (e.g., Karma 1, Rabies).
- **ERROR_PATH:** Inactive protocol -> Handled gracefully with fallback default interval.
- **SOURCE:** `src/services/vaccineProtocolService.ts`, `supabase/migrations/20260605000001_vaccine_parasite_protocols.sql`, `supabase/migrations/20260705000005_vaccination_plan_items.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### Flow 4: Parasite Treatment & Auto-Recurrence Task Orchestration
- **FLOW_ID:** `FLOW-004`
- **TRIGGER:** User completes internal/external parasite treatment or logs a parasite application.
- **INPUT:** `pet_id`, `parasite_product_id`, `applied_at`, `notes`.
- **PROCESSING:**
  1. **USER ACTION:** User selects parasite product used (e.g., "Bravecto Spot-on") and clicks "Uygulandı Olarak İşaretle".
  2. **UI:** `src/components/health/ParasiteRecordModal.tsx`.
  3. **API / SERVER ACTION:** POST to `/api/health/parasite-records` or atomic RPC `complete_parasite_plan_rpc()`.
  4. **BUSINESS LOGIC:** `src/lib/health/parasiteService.ts` fetches product recurrence interval (e.g., 90 days), locks completed occurrence, and calculates next dose date (`next_due_at = applied_at + duration_days`).
  5. **DATABASE:**
     - Inserts canonical record into `parasite_records` (`pet_id`, `product_id`, `administered_at`, `is_archived = false`).
     - Updates existing occurrence status to `completed` in `plan_occurrences`.
     - Inserts NEW future plan and occurrence (`auto_recurrence = true`) in `plans` and `plan_occurrences`.
  6. **EVENT:** `parasite_treatment.completed`.
  7. **SECONDARY PROCESS:** Old notification jobs marked done; new push notification job inserted in `notification_jobs`.
  8. **NOTIFICATION / DASHBOARD:** Timeline logs application; dashboard schedule moves next dose 3 months forward.
- **DATA STORED:** `parasite_records`, `plans`, `plan_occurrences`, `notification_jobs`.
- **EVENTS:** `parasite.recorded`, `plan.recurred`.
- **SIDE EFFECTS:** Updates health score and timelines without data loss.
- **USER_VISIBLE_RESULT:** Success toast message; green tick on timeline; next due date updated automatically.
- **ERROR_PATH:** Product duration missing -> Fallback to default 60-day interval.
- **SOURCE:** `src/lib/health/parasiteService.ts`, `supabase/migrations/20260715210000_create_parasite_protocol_architecture.sql`, `supabase/migrations/20260723190001_atomic_rpc_and_idempotency_v6.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### Flow 5: Cron Notification Queueing & Web Push Delivery
- **FLOW_ID:** `FLOW-005`
- **TRIGGER:** Scheduled Vercel Cron trigger (every hour / daily at 08:00 UTC).
- **INPUT:** Secret cron authorization header (`CRON_SECRET`).
- **PROCESSING:**
  1. **USER ACTION:** None (automated background process).
  2. **UI:** N/A (Server-side & Service Worker).
  3. **API / SERVER ACTION:** GET `/api/cron/notifications`.
  4. **BUSINESS LOGIC:** `src/lib/cron/notificationCron.ts` queries `notification_jobs` where `status = 'pending'` and `scheduled_for <= NOW()`. Evaluates VAPID device push tokens in `device_push_subscriptions`.
  5. **DATABASE:**
     - Selects pending jobs from `notification_jobs`.
     - Joins `device_push_subscriptions` for pet owner user ID.
     - Updates job status to `processing` -> `completed` or `failed`.
  6. **EVENT:** Web Push payload dispatched via WebPush library using VAPID keys.
  7. **SECONDARY PROCESS:** Service Worker `src/sw.ts` receives push event, parses JSON payload (`title`, `body`, `icon`, `url`), and displays native OS push notification.
  8. **NOTIFICATION / DASHBOARD:** Native notification pop-up on user's device.
- **DATA STORED:** `notification_jobs` (`status`, `sent_at`, `error_log`), `notifications` (`user_id`, `pet_id`, `title`, `body`, `is_read = false`).
- **EVENTS:** `push.dispatched`, `notification.delivered`.
- **SIDE EFFECTS:** Log entry created in audit system; badge count incremented in-app.
- **USER_VISIBLE_RESULT:** Native banner on mobile/desktop screen ("Karma Aşı Zamanı: Odi'nin aşısı bugün!").
- **ERROR_PATH:** Expired VAPID token (`410 Gone`) -> Subscription removed from `device_push_subscriptions`; job marked `failed_invalid_sub`.
- **SOURCE:** `src/app/api/cron/notifications/route.ts`, `src/lib/notifications/webPushService.ts`, `src/sw.ts`, `supabase/migrations/20260811200000_fix_plan_push_reminders.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### Flow 6: Nutrition Food Assignment & Stock Refill Alert Engine
- **FLOW_ID:** `FLOW-006`
- **TRIGGER:** User assigns a food brand to pet or updates daily feeding amount.
- **INPUT:** `pet_id`, `food_brand_id`, `package_weight_kg`, `daily_portion_grams`, `start_date`.
- **PROCESSING:**
  1. **USER ACTION:** User selects food brand from catalog, enters package size (e.g. 10 kg) and daily feed (e.g. 200g), clicks "Mamayı Kaydet".
  2. **UI:** `src/components/nutrition/FoodAssignmentModal.tsx`.
  3. **API / SERVER ACTION:** POST to `/api/nutrition/assign` or RPC `end_pet_food_assignment()`.
  4. **BUSINESS LOGIC:** `src/lib/nutrition/` ends existing active assignment (`ended_at = NOW()`), calculates total supply days (`days = (package_weight_kg * 1000) / daily_portion_grams`), and calculates refill date (`refill_date = start_date + days - 7 days`).
  5. **DATABASE:**
     - Updates legacy active row in `pet_food_assignments` (`is_active = false`, `ended_at = NOW()`).
     - Inserts new row into `pet_food_assignments` (`pet_id`, `food_brand_id`, `daily_portion_grams`, `is_active = true`, `estimated_refill_at`).
  6. **EVENT:** `nutrition.assigned`.
  7. **SECONDARY PROCESS:** Notification job inserted into `notification_jobs` scheduled for `estimated_refill_at`.
  8. **NOTIFICATION / DASHBOARD:** Nutrition widget displays remaining days counter and progress bar.
- **DATA STORED:** `pet_food_assignments`, `notification_jobs`.
- **EVENTS:** `food.assigned`, `refill_alert.scheduled`.
- **SIDE EFFECTS:** Dashboard nutrition card updates stock gauge.
- **USER_VISIBLE_RESULT:** Gauge showing "50 Günlük Mama Kaldı" on pet dashboard.
- **ERROR_PATH:** Portion = 0 -> Form validation blocks submit; client error state.
- **SOURCE:** `src/lib/nutrition/`, `supabase/migrations/20260723220000_food_catalog_and_assignments.sql`, `supabase/migrations/20260724180000_nutrition_assignment_swap.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### Flow 7: OCR Camera Scan -> Gemini AI -> Review & DB Mutation
- **FLOW_ID:** `FLOW-007`
- **TRIGGER:** User selects "Kamera ile Aşı Karnesi Tara" in health section.
- **INPUT:** Image file blob (JPEG/PNG) captured via smartphone camera or uploaded file.
- **PROCESSING:**
  1. **USER ACTION:** User takes photo of physical vaccination card stamp and submits.
  2. **UI:** `src/components/ai/SmartScannerModal.tsx`.
  3. **API / SERVER ACTION:** POST multipart form to `/api/scan-document`.
  4. **BUSINESS LOGIC:**
     - Uploads file to Supabase Private Bucket `vaccine-documents`.
     - Invokes Gemini 1.5/2.0 API with structured system prompt and JSON Schema definition.
     - Gemini extracts: `vaccine_name`, `date_administered`, `lot_number`, `clinic_name`, `confidence_score`.
     - System constructs draft response payload with `Sparkles` AI indicator.
  5. **DATABASE:** Temporary job logged in `content_generation_jobs` or `smart_scanner` audit log. NO MUTATION to canonical `vaccine_records_v2` yet.
  6. **EVENT:** `ocr.scanned`.
  7. **SECONDARY PROCESS:** Review modal rendered to user showing side-by-side extracted data vs image crop.
  8. **NOTIFICATION / DASHBOARD:** User clicks "Onayla ve Kaydet" -> Triggers kanonical RPC mutation `create_vaccine_record_v2()`.
- **DATA STORED:** `vaccine-documents` bucket (private), `vaccine_records_v2` (upon human confirmation), `source_verification_audits`.
- **EVENTS:** `ocr.completed`, `human_review.approved`, `vaccine_record.created`.
- **SIDE EFFECTS:** Kanonical health history created ONLY after explicit human click.
- **USER_VISIBLE_RESULT:** Draft modal showing extracted vaccine details; single tap confirmation saves record.
- **ERROR_PATH:** Low confidence score (<70%) or corrupt image -> Banner alert "Veri okunamadı, lütfen bilgileri elle kontrol ediniz." User can edit text fields before saving.
- **SOURCE:** `src/app/api/scan-document/route.ts`, `src/lib/content/`, `supabase/migrations/20260531180000_smart_scanner.sql`, `supabase/migrations/20260601000001_smart_scanner_rpc.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### Flow 8: Lost Pet SOS Alert -> Geo-Broadcast & Public Web Page
- **FLOW_ID:** `FLOW-008`
- **TRIGGER:** User activates SOS mode for missing pet.
- **INPUT:** `pet_id`, last seen location (province, district, lat, lng), contact phone, reward info, description, photo.
- **PROCESSING:**
  1. **USER ACTION:** User opens Lost Pet Wizard, approves location access, submits emergency report.
  2. **UI:** `src/components/sos/LostPetWizard.tsx`.
  3. **API / SERVER ACTION:** POST to `/api/sos`.
  4. **BUSINESS LOGIC:** `src/lib/lost-reports/` creates active report in `lost_reports`, generates unique public slug, and queries users within matching province/district.
  5. **DATABASE:**
     - Insert into `lost_reports` (`pet_id`, `user_id`, `status = 'active'`, `province`, `district`, `latitude`, `longitude`, `public_url`).
     - Insert into `lost_report_drafts` (cleanup).
  6. **EVENT:** `sos_alert.created`.
  7. **SECONDARY PROCESS:** Push notification broadcast sent to app users within the target district; public shareable page built at `/sos/[id]`.
  8. **NOTIFICATION / DASHBOARD:** Red emergency SOS badge displayed on pet card; shareable link generated with social meta tags.
- **DATA STORED:** `lost_reports`, `notifications`.
- **EVENTS:** `sos.launched`, `push.broadcast`.
- **SIDE EFFECTS:** Public web route `/sos/[id]` becomes accessible without authentication.
- **USER_VISIBLE_RESULT:** Emergency printable flyer modal; share to WhatsApp/Social buttons.
- **ERROR_PATH:** Missing location -> Defaults to user profile registered district.
- **SOURCE:** `src/lib/lost-reports/`, `src/app/api/sos/route.ts`, `supabase/migrations/20260528000001_lost_reports.sql`, `supabase/migrations/20260724233000_complete_lost_report_wizard.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### Flow 9: Admin Feature Registry -> User Entitlement Evaluation
- **FLOW_ID:** `FLOW-009`
- **TRIGGER:** User navigates to a premium or gated feature route (e.g. Estrus Tracker, AI Vet Assistant).
- **INPUT:** `user_id`, `feature_key` (e.g. `estrus_tracker`).
- **PROCESSING:**
  1. **USER ACTION:** Clicks on gated module icon in sidebar or tab bar.
  2. **UI:** `src/components/architecture/FeatureGuard.tsx`.
  3. **API / SERVER ACTION:** Client hook `useFeatureEntitlement(feature_key)` checks client state or calls `/api/orchestrator/entitlement`.
  4. **BUSINESS LOGIC:** `src/lib/architecture/featureRegistryService.ts` queries `feature_registry` and `membership_credits_entitlement` for user role, plan tier, and feature version.
  5. **DATABASE:** Read-only query on `feature_registry` and `user_membership_plans`.
  6. **EVENT:** `feature.access_checked`.
  7. **SECONDARY PROCESS:** Usage counter incremented via `atomic_usage_and_integrity.sql` RPC if usage limits apply.
  8. **NOTIFICATION / DASHBOARD:** Feature rendered if entitled; upgrade modal shown if tier insufficient.
- **DATA STORED:** `feature_registry`, `feature_usage_logs`.
- **EVENTS:** `feature.entitled` or `feature.gated`.
- **SIDE EFFECTS:** Logs analytics event for conversion tracking.
- **USER_VISIBLE_RESULT:** Seamless entry into module OR aesthetic paywall / upgrade bottom sheet.
- **ERROR_PATH:** Registry table unreachable -> Safe fallback to default entitlement rules.
- **SOURCE:** `src/lib/architecture/`, `supabase/migrations/20260806220000_feature_registry_phase1.sql`, `supabase/migrations/20260807040000_atomic_usage_and_integrity.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### Flow 10: Experience Orchestrator -> Micro-Survey Prompt Throttling
- **FLOW_ID:** `FLOW-010`
- **TRIGGER:** User completes an action (e.g. adds weight entry) or opens dashboard.
- **INPUT:** `user_id`, `current_route`, `survey_key`.
- **PROCESSING:**
  1. **USER ACTION:** Navigates app naturally after completing task.
  2. **UI:** `src/components/architecture/ExperienceOrchestratorHost.tsx`.
  3. **API / SERVER ACTION:** POST to `/api/orchestrator/evaluate`.
  4. **BUSINESS LOGIC:** `src/lib/profiling-engine.ts` fetches user row from `user_survey_stats`. Checks `last_prompted_at` and `prompt_count`. Enforces Strict Anti-Fatigue Rule (min 72 hours between prompts, max 3 prompts per month).
  5. **DATABASE:**
     - Select from `user_survey_stats` where `user_id = auth.uid()`.
     - If rule passes: Update `last_prompted_at = NOW()`, `prompt_count = prompt_count + 1`.
  6. **EVENT:** `survey_prompt.triggered`.
  7. **SECONDARY PROCESS:** Micro-survey pop-up (1 quick question) mounted in bottom right toast.
  8. **NOTIFICATION / DASHBOARD:** Non-intrusive single-question toast ("Odi için tercih ettiğiniz mama türü hangisi?").
- **DATA STORED:** `user_survey_stats`, `experience_rules`.
- **EVENTS:** `survey.prompted`, `survey.skipped` or `survey.answered`.
- **SIDE EFFECTS:** Protects user from survey fatigue; updates progressive profiling tags.
- **USER_VISIBLE_RESULT:** Quick 1-tap poll toast or completely suppressed if user was prompted recently.
- **ERROR_PATH:** Survey stats missing -> Automatically created via default row insert.
- **SOURCE:** `src/lib/profiling-engine.ts`, `supabase/migrations/20260614210707_create_user_survey_stats_table.sql`, `supabase/migrations/20260803000003_experience_orchestrator.sql`.
- **CONFIDENCE:** `CONFIRMED`
