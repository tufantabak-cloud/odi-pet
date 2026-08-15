# Odi Pet - Feature-by-Feature Product Value Model

This document establishes the comprehensive feature-by-feature Value Model for the Odi Pet ecosystem. Each feature is mapped against core user problems, needs, goals, current implementation details, user friction, business value, code evidence, and evidence confidence levels.

---

## Value Model Matrix

### 1. Preventive Vaccine Protocol & History Engine (v2)
- **FEATURE_ID:** `VAL-001`
- **FEATURE_NAME:** Preventive Vaccine Protocol & History Engine (v2)
- **DOMAIN:** Preventive Health Domain
- **USER_PROBLEM:** Pet owners forget crucial vaccination due dates, lose physical paper vaccination booklets, and risk pet health complications or legal compliance issues (e.g., Rabies certification).
- **USER_NEED:** Reliable, automated tracking of mandatory and core/non-core vaccination schedules tailored specifically to species and age.
- **USER_GOAL:** Maintain 100% vaccination compliance with zero missed doses or manual record tracking anxiety.
- **CURRENT_SOLUTION:** Standardized protocol templates for dogs and cats (`vaccine_protocols`, `vaccine_brands`, `vaccine_records_v2`) that calculate upcoming doses, generate plans (`plans` and `plan_occurrences`), link to official vaccine brands, and enforce non-deletable archival history (`is_archived`).
- **USER_VALUE:** Complete peace of mind regarding vaccine schedule, instant digital proof for travel/vets, and automated reminder alerts.
- **EXPECTED_OUTCOME:** Zero missed core vaccine doses, 100% digital historical record availability.
- **USER_FRICTION:** Initial manual date entry required if physical card is not scanned via OCR.
- **BUSINESS_VALUE:** Primary retention hook and core DAU/MAU trigger; foundation for vet partnership integrations and premium compliance badges.
- **EVIDENCE:** `src/lib/vaccines/`, `src/services/vaccineProtocolService.ts`, `supabase/migrations/20240502000001_vaccine_os_v2.sql`, `supabase/migrations/20260715164000_remove_duplicate_vaccines_and_add_unique.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### 2. Internal & External Parasite Protocol Engine
- **FEATURE_ID:** `VAL-002`
- **FEATURE_NAME:** Internal & External Parasite Protocol Engine
- **DOMAIN:** Preventive Health Domain
- **USER_PROBLEM:** Parasite preventive medications (pills, spot-ons, collars) have variable recurrence intervals (1 to 3 months), causing frequent oversight, flea/tick infestations, or intestinal worm infections.
- **USER_NEED:** Automated calculation of recurrence dates based on exact active ingredients, product brands, and weight classes.
- **USER_GOAL:** Protect household and pet from parasites through seamless, recurring treatment schedule alerts.
- **CURRENT_SOLUTION:** Granular product catalog database (`parasite_products_v2`, `parasite_protocols`, `parasite_records`) mapping oral tablets, spot-on drops, and collars to automatic task recurrence (`auto_recurrence`) and weight validation.
- **USER_VALUE:** Automated calculation of next dosage date based on specific medicine duration (e.g. 60-day vs 90-day spot-on), eliminating manual math.
- **EXPECTED_OUTCOME:** Sustained parasite protection year-round with accurate brand-specific dose timing.
- **USER_FRICTION:** High product catalog maintenance requirement; user must know exact medicine brand used.
- **BUSINESS_VALUE:** High-frequency engagement driver (every 1–3 months); strong monetization potential via direct e-commerce food/pharmacy affiliate links.
- **EVIDENCE:** `src/lib/health/parasiteService.ts`, `supabase/migrations/20260715210000_create_parasite_protocol_architecture.sql`, `supabase/migrations/20260719120000_seed_parasite_product_catalog_2026.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### 3. Food Stock & Refill Alert Engine
- **FEATURE_ID:** `VAL-003`
- **FEATURE_NAME:** Food Stock & Refill Alert Engine
- **DOMAIN:** Nutrition & Weight Management Domain
- **USER_PROBLEM:** Pet owners unexpectedly run out of pet food, forcing last-minute emergency store runs or abrupt, harmful diet changes.
- **USER_NEED:** Predictive stock consumption monitoring based on daily feeding portions and package weights.
- **USER_GOAL:** Timely reorder notifications several days before food bag is empty.
- **CURRENT_SOLUTION:** Pet food assignment table (`pet_food_assignments`) tracking food brand (`food_brands`), package size (kg), daily portion (grams), start date, and auto-calculating estimated end date to trigger low-stock push alerts.
- **USER_VALUE:** Never run out of food unexpectedly; consistent dietary health for the pet.
- **EXPECTED_OUTCOME:** Refill notifications triggered 5–7 days prior to zero stock balance.
- **USER_FRICTION:** Requires initial setup of daily portion in grams and package weight.
- **BUSINESS_VALUE:** High-value recurring commerce monetization route (affiliate subscription or auto-delivery reordering).
- **EVIDENCE:** `src/lib/nutrition/`, `supabase/migrations/20260723220000_food_catalog_and_assignments.sql`, `supabase/migrations/20260724180000_nutrition_assignment_swap.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### 4. OCR Vaccine Smart Scanner (Gemini AI Vision)
- **FEATURE_ID:** `VAL-004`
- **FEATURE_NAME:** OCR Vaccine Smart Scanner (Gemini AI Vision)
- **DOMAIN:** AI & Document Intelligence Domain
- **USER_PROBLEM:** Manual entry of handwritten or stamped physical vaccination cards is tedious, error-prone, and causes user onboarding drop-off.
- **USER_NEED:** Instant camera snapshot conversion of physical health cards into structured digital health records.
- **USER_GOAL:** Digitization of full pet health booklet in under 10 seconds.
- **CURRENT_SOLUTION:** Edge API route (`/api/scan-document`) uploading image to private bucket, sending payload to Gemini 1.5/2.0 API, parsing JSON schema (vaccine name, date, lot number, vet name), presenting Human-in-the-Loop review UI, requiring explicit user approval before kanonic DB mutation.
- **USER_VALUE:** Zero typing required; high accuracy extraction with confidence scores; full compliance with safety disclaimers (`Sparkles` indicator).
- **EXPECTED_OUTCOME:** Fast onboarding speed (<10s), 90%+ extraction accuracy on legible physical cards.
- **USER_FRICTION:** Blurry or severely degraded handwritten text requires manual adjustment in the review modal.
- **BUSINESS_VALUE:** Standout "WOW" feature for viral user acquisition; high conversion booster.
- **EVIDENCE:** `src/app/api/scan-document/route.ts`, `src/lib/content/`, `supabase/migrations/20260531180000_smart_scanner.sql`, `supabase/migrations/20260601000001_smart_scanner_rpc.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### 5. Estrus Cycle & Reproductive Tracker
- **FEATURE_ID:** `VAL-005`
- **FEATURE_NAME:** Estrus Cycle & Reproductive Tracker
- **DOMAIN:** Reproduction & Estrus Domain
- **USER_PROBLEM:** Female pet owners struggle to track heat (estrus) cycles, leading to unplanned pregnancies or missed breeding windows.
- **USER_NEED:** Cycle start/end logging, symptom recording (bleeding, behavior), and predictive calendar calculation for upcoming cycles.
- **USER_GOAL:** Full visibility over reproductive timing and health status.
- **CURRENT_SOLUTION:** Structured cycle table (`pet_estrus_cycles`) enforcing single open cycle constraint, recording proestrus/estrus phases, calculating next cycle projection (approx 6-month cycle for dogs), sending alerts, and controlling breeding eligibility (`pet_breeding_eligibility`).
- **USER_VALUE:** Clear cycle history, accurate future date predictions, safety advisory warnings.
- **EXPECTED_OUTCOME:** Timely notification 14 days prior to estimated next estrus cycle.
- **USER_FRICTION:** Requires user diligence to log cycle start and end dates.
- **BUSINESS_VALUE:** Niche value for breeders and multi-pet households; opens up premium breeding marketplace feature.
- **EVIDENCE:** `src/services/estrus/`, `supabase/migrations/20260614120000_pet_estrus_cycles.sql`, `supabase/migrations/20260715114500_add_structured_estrus_tables.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### 6. Lost Pet SOS Alert & Public Broadcast System
- **FEATURE_ID:** `VAL-006`
- **FEATURE_NAME:** Lost Pet SOS Alert & Public Broadcast System
- **DOMAIN:** Social, SOS & Marketplace Domain
- **USER_PROBLEM:** When a pet goes missing, owners panic and struggle to assemble posters, alert local neighbors, or share standardized pet info quickly.
- **USER_NEED:** One-tap emergency broadcast generating public lost pet flyer, location mapping, and emergency contact details.
- **USER_GOAL:** Rapid community mobilization within the critical first 2 hours of pet loss.
- **CURRENT_SOLUTION:** Lost pet wizard (`lost_reports`, `lost_report_drafts`) generating geo-tagged reports (lat, lng, province, district), producing shareable public web URLs (`/sos/[id]`), and dispatching local app alerts.
- **USER_VALUE:** Instant flyer generation, geolocated map pin, high-visibility emergency badge.
- **EXPECTED_OUTCOME:** Immediate shareable poster generation in under 60 seconds.
- **USER_FRICTION:** Browser location permission dependency.
- **BUSINESS_VALUE:** Emotional brand alignment, community network expansion, high social sharing viral loop.
- **EVIDENCE:** `src/lib/lost-reports/`, `src/app/api/sos/`, `supabase/migrations/20260528000001_lost_reports.sql`, `supabase/migrations/20260724233000_complete_lost_report_wizard.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### 7. Vet Clinic Directory & Appointment Booking
- **FEATURE_ID:** `VAL-007`
- **FEATURE_NAME:** Vet Clinic Directory & Appointment Booking
- **DOMAIN:** Social, SOS & Marketplace Domain
- **USER_PROBLEM:** Finding trusted nearby veterinary clinics with emergency availability or specific specializations is fragmented.
- **USER_NEED:** Verified clinic directory with filterable services, location search, and direct appointment requests.
- **USER_GOAL:** Booking a confirmed appointment with verified clinic without phone tag.
- **CURRENT_SOLUTION:** Clinic directory (`clinics`) with geographic search (`provinces`), service tagging, and booking table (`appointments`) supporting vet verification RPCs (`vet_verification.sql`).
- **USER_VALUE:** Filtered clinic list (24/7, surgery, grooming), verified clinic badges, streamlined appointment history.
- **EXPECTED_OUTCOME:** Direct appointment creation linked to pet profile.
- **USER_FRICTION:** Requires active clinic onboarding and schedule synchronization.
- **BUSINESS_VALUE:** B2B monetization (vet clinic subscription / appointment booking fees).
- **EVIDENCE:** `src/lib/vets/`, `supabase/migrations/20240428000003_vet_marketplace.sql`, `supabase/migrations/20260724234500_secure_pet_clinic_access.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### 8. Weight & Growth Development Tracker
- **FEATURE_ID:** `VAL-008`
- **FEATURE_NAME:** Weight & Growth Development Tracker
- **DOMAIN:** Nutrition & Weight Management Domain
- **USER_PROBLEM:** Pet weight gain or loss is gradual and difficult to spot visually, masking underlying health conditions or obesity.
- **USER_NEED:** Historical weight chart with species/breed growth curve visual indicators.
- **USER_GOAL:** Maintain pet within healthy target weight range for their age and breed.
- **CURRENT_SOLUTION:** Weight log database (`weight_logs`, `growth_records`) recording date, weight (kg), height (cm), and body condition notes; rendering visual trend charts and growth alerts.
- **USER_VALUE:** Early detection of health issues (unintended weight loss/gain), accurate medication dosage reference.
- **EXPECTED_OUTCOME:** Visual weight timeline graph with trend indicator.
- **USER_FRICTION:** Dependent on regular manual weigh-ins (e.g. monthly or during vet visits).
- **BUSINESS_VALUE:** Essential health metric for insurance calculations and nutrition recommendations.
- **EVIDENCE:** `src/lib/nutrition/`, `supabase/migrations/20240420000000_init_schema.sql`, `supabase/migrations/20260724234400_add_height_to_weight_logs.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### 9. Routine Hygiene & Care Planner
- **FEATURE_ID:** `VAL-009`
- **FEATURE_NAME:** Routine Hygiene & Care Planner
- **DOMAIN:** Care & Hygiene Domain
- **USER_PROBLEM:** Routine grooming (nail trimming, ear cleaning, dental brushing, bath) is frequently neglected compared to medical care.
- **USER_NEED:** Standardized recurring care checklist with gentle reminders.
- **USER_GOAL:** Consistent grooming and hygiene routines keeping pet comfortable and clean.
- **CURRENT_SOLUTION:** Care plans (`care_plans`, `care_events`) scheduling custom or template-based hygiene tasks linked to calendar occurrences.
- **USER_VALUE:** Structured care routine, flexible recurrence (weekly/monthly), completion tracking.
- **EXPECTED_OUTCOME:** Completion of care tasks logged to pet activity timeline.
- **USER_FRICTION:** Minor overhead in checking off routine tasks.
- **BUSINESS_VALUE:** Increases weekly active user (WAU) app opens.
- **EVIDENCE:** `src/lib/modules/`, `supabase/migrations/20240518000000_care_plans.sql`, `supabase/migrations/20260613120000_pet_care_tables.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### 10. Multi-Owner Family Sharing & Delegated Access
- **FEATURE_ID:** `VAL-010`
- **FEATURE_NAME:** Multi-Owner Family Sharing & Delegated Access
- **DOMAIN:** IAM & User Identity Domain
- **USER_PROBLEM:** In multi-person households or with pet sitters, pet health responsibilities are poorly coordinated, leading to double-dosing or forgotten tasks.
- **USER_NEED:** Shared access to pet records with clear role permissions (Owner, Co-owner, Caregiver).
- **USER_GOAL:** Synchronized pet care across all family members or sitters.
- **CURRENT_SOLUTION:** Canonical membership system (`pet_owners`, `pet_memberships`) with invitation tokens (`create_pet_caregiver_invite_token`), RLS security policies allowing shared read/write privileges while restricting ownership transfer.
- **USER_VALUE:** Seamless co-parenting of pets, single truth for vaccine status across family.
- **EXPECTED_OUTCOME:** Real-time synchronized task updates across co-owners' devices.
- **USER_FRICTION:** Invite link acceptance flow required for co-owners.
- **BUSINESS_VALUE:** Viral household invite growth loop (1 active user brings 1.5 co-owners).
- **EVIDENCE:** `src/lib/membership/`, `supabase/migrations/20240425000000_multi_owner.sql`, `supabase/migrations/20260728120000_canonical_pet_memberships_phase0.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### 11. Dynamic Experience Orchestrator & Feature Registry
- **FEATURE_ID:** `VAL-011`
- **FEATURE_NAME:** Dynamic Experience Orchestrator & Feature Registry
- **DOMAIN:** Admin & Experience Orchestration Domain
- **USER_PROBLEM:** Overwhelming users with unneeded features or long initial survey forms creates high friction and abandon rates.
- **USER_NEED:** Personalized, progressive unlock of app features based on pet age, species, and user activity context.
- **USER_GOAL:** Clean, uncluttered UI that presents relevant tools exactly when needed.
- **CURRENT_SOLUTION:** Database-backed feature registry (`feature_registry`, `experience_rules`, `user_survey_stats`) evaluating user entitlement, controlling feature flags dynamically, throttling survey prompts, and managing progressive profiling.
- **USER_VALUE:** Frictionless onboarding; context-aware prompts; uncluttered dashboard.
- **EXPECTED_OUTCOME:** Reduced question fatigue, higher feature discovery and completion rate.
- **USER_FRICTION:** None for user; controlled via background rules engine.
- **BUSINESS_VALUE:** High conversion, zero survey fatigue, flexible A/B testing infrastructure.
- **EVIDENCE:** `src/lib/architecture/`, `src/lib/profiling-engine.ts`, `supabase/migrations/20260803000003_experience_orchestrator.sql`, `supabase/migrations/20260806220000_feature_registry_phase1.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### 12. Digital Pet Card & Microchip Management
- **FEATURE_ID:** `VAL-012`
- **FEATURE_NAME:** Digital Pet Card & Microchip Management
- **DOMAIN:** Pet Core Domain
- **USER_PROBLEM:** Pet owners need quick access to official registration numbers, microchip ID, and passport info during vet visits or boarding.
- **USER_NEED:** Consolidated digital ID card with quick copy/share and QR/barcode scanning capabilities.
- **USER_GOAL:** Instant presentation of pet identification details.
- **CURRENT_SOLUTION:** Digital pet card component (`PetHeroCard.tsx`, `digital_pet_card.sql`) displaying profile picture, microchip number, breed, age, species, neutered status, and shareable link.
- **USER_VALUE:** Quick access to microchip and registration info in mobile wallet-style card.
- **EXPECTED_OUTCOME:** One-tap display of pet ID and microchip number.
- **USER_FRICTION:** None; automatically built from profile.
- **BUSINESS_VALUE:** High visual appeal and shareability on social media / PWA home screen.
- **EVIDENCE:** `src/components/pets/PetHeroCard.tsx`, `supabase/migrations/20260601163726_digital_pet_card.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### 13. Web Push & Cron Notification Engine
- **FEATURE_ID:** `VAL-013`
- **FEATURE_NAME:** Web Push & Cron Notification Engine
- **DOMAIN:** Notification & Engine Domain
- **USER_PROBLEM:** Pet health schedules (vaccines, parasite pills) fail if reminders rely solely on app opens.
- **USER_NEED:** Cross-device Web Push notifications delivered reliably even when browser is closed.
- **USER_GOAL:** Timely alerts delivered directly to device screen for all upcoming or overdue pet care tasks.
- **CURRENT_SOLUTION:** Web Push Service Worker (`sw.ts`), VAPID keys, Vercel cron endpoints (`/api/cron/notifications`), notification queue (`notification_jobs`, `device_push_subscriptions`), status escalation (Upcoming -> Due Today -> Overdue).
- **USER_VALUE:** Timely reminders on desktop and mobile without installing native store apps.
- **EXPECTED_OUTCOME:** Push alert delivered on scheduled morning (e.g. 09:00 local time).
- **USER_FRICTION:** Browser notification permission prompt must be accepted.
- **BUSINESS_VALUE:** Primary re-engagement channel driving daily active user retention.
- **EVIDENCE:** `src/sw.ts`, `src/lib/notifications/`, `src/app/api/cron/notifications/route.ts`, `supabase/migrations/20240518000001_notification_system.sql`, `supabase/migrations/20260811200000_fix_plan_push_reminders.sql`.
- **CONFIDENCE:** `CONFIRMED`

---

### 14. Daily Health Journal & Logbook
- **FEATURE_ID:** `VAL-014`
- **FEATURE_NAME:** Daily Health Journal & Logbook
- **DOMAIN:** General Medical & Health History Domain
- **USER_PROBLEM:** Pet owners forget subtle symptoms (vomiting, stool changes, energy level drops) when describing history to the vet.
- **USER_NEED:** Quick daily logging of observations, photos, and symptoms with date stamps.
- **USER_GOAL:** Comprehensive timeline of pet health behavior for vet consultations.
- **CURRENT_SOLUTION:** Journal entries table (`pet_journal_entries`, `health_reports`) with symptom tagging, photo attachments, and exportable summary views.
- **USER_VALUE:** Complete symptom history available during vet visits; accurate diagnostic context.
- **EXPECTED_OUTCOME:** Structured journal entries chronological view.
- **USER_FRICTION:** Requires manual logging when symptoms occur.
- **BUSINESS_VALUE:** Rich longitudinal health data empowering predictive risk models.
- **EVIDENCE:** `src/lib/health-records/`, `supabase/migrations/20260528000002_pet_journal_entries.sql`, `supabase/migrations/20240429000008_health_reports.sql`.
- **CONFIDENCE:** `CONFIRMED`
