# Odi.Pet — Data Model & Schema Map
**Doc ID**: DNA-002 | **Status**: PROD-FORENSIC-VERIFIED | **Version**: 2.0.0
**Audit Date**: 2026-08-12 | **Auditor**: Repository & Infrastructure Forensics Specialist
**Scope**: 254 SQL Migration Files in `supabase/migrations/` & Single Source of Truth Audit

---

## 1. Executive Database Summary
- **Total Canonical Tables Identified**: 176 tables [`CONFIRMED` - `supabase/migrations`]
- **Total SQL Migration Files**: 254 migration files [`CONFIRMED` - `supabase/migrations`]
- **Total RPC Functions**: 92 custom SQL functions [`CONFIRMED` - `supabase/migrations`]
- **RLS Enabled Tables**: 45 tables protected by Row Level Security [`CONFIRMED`]
- **Data Protection Policy**: Soft delete & archiving enforced (`is_archived = true`, `archived_at`). Hard delete prohibited for health data (`AGENTS.md` OPOS Cilt 5). [`CONFIRMED`]

---

## 2. Comprehensive Forensic Table Registry (Selection of Core Domain Tables)

| Table Name | Columns | RLS Policies | Triggers | Indexes | Domain | Origin Migration | Evidence Rating |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `activation_metrics` | 9 | 0 | 0 | 1 | Core / Health | `20240429000011_demo_and_activation.sql` | `CONFIRMED` |
| `admin_audit_logs` | 6 | 0 | 0 | 0 | Admin & Audit | `20260625000000_sprint_integrations.sql` | `CONFIRMED` |
| `admin_vet_override_logs` | 6 | 0 | 0 | 2 | Veterinary & Clinics | `20260722180000_vet_review_requirement_and_override.sql` | `CONFIRMED` |
| `ai_usage_logs` | 4 | 0 | 0 | 1 | Admin & Audit | `20260624000003_sprint1.sql` | `CONFIRMED` |
| `alerts` | 6 | 0 | 0 | 0 | Core / Health | `20240428000006_production_hardening_and_refill.sql` | `CONFIRMED` |
| `app_bundles` | 5 | 1 | 1 | 0 | Core / Health | `20260807000000_premium_architecture_v2.sql` | `CONFIRMED` |
| `app_features` | 10 | 1 | 1 | 3 | Core / Health | `20260806220000_feature_registry_phase1.sql` | `CONFIRMED` |
| `app_plans` | 7 | 1 | 1 | 0 | Core / Health | `20260807013400_enterprise_premium_v3.sql` | `CONFIRMED` |
| `appointments` | 6 | 0 | 0 | 2 | Veterinary & Clinics | `20240420000000_init_schema.sql` | `CONFIRMED` |
| `article_media` | 14 | 0 | 0 | 2 | Core / Health | `20260722150000_article_sources_and_media.sql` | `CONFIRMED` |
| `article_pet_states` | 8 | 0 | 1 | 2 | Core / Health | `20260722110000_personalized_content_system.sql` | `CONFIRMED` |
| `article_revisions` | 6 | 0 | 0 | 1 | Core / Health | `20260722120000_content_freshness_and_revisions.sql` | `CONFIRMED` |
| `article_saves` | 3 | 0 | 0 | 1 | Core / Health | `20260625000000_sprint_integrations.sql` | `CONFIRMED` |
| `article_sources` | 10 | 0 | 0 | 2 | Core / Health | `20260722130000_article_sources_and_atomicity.sql` | `CONFIRMED` |
| `articles` | 7 | 0 | 0 | 7 | Core / Health | `20260625000000_sprint_integrations.sql` | `CONFIRMED` |
| `beta_signups` | 5 | 0 | 0 | 0 | Core / Health | `20240429000012_beta_signup.sql` | `CONFIRMED` |
| `bookings` | 13 | 0 | 0 | 2 | Core / Health | `20260624000008_social_bookings_events.sql` | `CONFIRMED` |
| `breeding_applications` | 13 | 0 | 0 | 4 | Core / Health | `20260627000002_breeding_applications.sql` | `CONFIRMED` |
| `breeding_consent_records` | 8 | 0 | 0 | 1 | Core / Health | `20260715100000_breeding_consent_records.sql` | `CONFIRMED` |
| `breeding_listings` | 12 | 0 | 0 | 1 | Core / Health | `20260627000000_breeding_listings.sql` | `CONFIRMED` |
| `bundle_features` | 2 | 1 | 0 | 0 | Core / Health | `20260807000000_premium_architecture_v2.sql` | `CONFIRMED` |
| `business_availability` | 11 | 0 | 0 | 0 | Core / Health | `20260624000008_social_bookings_events.sql` | `CONFIRMED` |
| `business_profiles` | 26 | 0 | 0 | 1 | Identity & Auth | `20260624000007_sprint4_v2.sql` | `CONFIRMED` |
| `calendar_feed_tokens` | 8 | 0 | 0 | 0 | Core / Health | `20240429000007_calendar_feed_tokens.sql` | `CONFIRMED` |
| `care_events` | 5 | 0 | 0 | 0 | Core / Health | `20240420000001_extend_schema.sql` | `CONFIRMED` |
| `care_plans` | 10 | 0 | 0 | 1 | Core / Health | `20240420000000_init_schema.sql` | `CONFIRMED` |
| `caregiver_logbook_entries` | 4 | 0 | 0 | 3 | Admin & Audit | `20260601163726_digital_pet_card.sql` | `CONFIRMED` |
| `clinic_memberships` | 3 | 1 | 0 | 2 | Veterinary & Clinics | `20240420000000_init_schema.sql` | `CONFIRMED` |
| `clinics` | 6 | 0 | 0 | 0 | Veterinary & Clinics | `20240420000000_init_schema.sql` | `CONFIRMED` |
| `content_generation_job_sources` | 13 | 0 | 0 | 2 | Core / Health | `20260722140000_content_generation_jobs.sql` | `CONFIRMED` |
| `content_generation_jobs` | 18 | 0 | 0 | 3 | Core / Health | `20260722140000_content_generation_jobs.sql` | `CONFIRMED` |
| `content_source_verification_audits` | 6 | 0 | 0 | 3 | Admin & Audit | `20260722160000_source_verification_audits.sql` | `CONFIRMED` |
| `conversations` | 2 | 0 | 0 | 0 | Core / Health | `20260625000000_sprint_integrations.sql` | `CONFIRMED` |
| `daily_scores` | 5 | 0 | 0 | 0 | Core / Health | `20240427000002_care_score.sql` | `CONFIRMED` |
| `data_quality_configs` | 7 | 2 | 0 | 0 | Core / Health | `20260624000003_sprint1.sql` | `CONFIRMED` |
| `devices` | 12 | 1 | 0 | 0 | Core / Health | `20260528000000_device_integration.sql` | `CONFIRMED` |
| `discovered_external_contents` | 15 | 0 | 0 | 2 | Core / Health | `20260722200000_monitored_sources_and_discovered_content.sql` | `CONFIRMED` |
| `documents` | 5 | 0 | 0 | 0 | Core / Health | `20240425000003_vaccine_system_v2.sql` | `CONFIRMED` |
| `event_attendees` | 8 | 0 | 0 | 1 | Core / Health | `20260624000008_social_bookings_events.sql` | `CONFIRMED` |
| `event_stream` | 4 | 0 | 0 | 3 | Core / Health | `20240428000006_production_hardening_and_refill.sql` | `CONFIRMED` |
| `events` | 15 | 0 | 0 | 0 | Core / Health | `20260624000008_social_bookings_events.sql` | `CONFIRMED` |
| `feature_audit_logs` | 8 | 2 | 0 | 2 | Admin & Audit | `20260806220000_feature_registry_phase1.sql` | `CONFIRMED` |
| `feature_idempotency_logs` | 14 | 0 | 0 | 2 | Admin & Audit | `20260807040000_atomic_usage_and_integrity.sql` | `CONFIRMED` |
| `feature_kill_switches` | 6 | 0 | 0 | 0 | Core / Health | `20260807040000_atomic_usage_and_integrity.sql` | `CONFIRMED` |
| `feature_limits` | 10 | 1 | 1 | 2 | Core / Health | `20260806220000_feature_registry_phase1.sql` | `CONFIRMED` |
| `feature_limits_draft` | 13 | 0 | 0 | 0 | Core / Health | `20260807013400_enterprise_premium_v3.sql` | `CONFIRMED` |
| `feature_limits_versions` | 6 | 0 | 0 | 0 | Core / Health | `20260807013400_enterprise_premium_v3.sql` | `CONFIRMED` |
| `feature_sync_runs` | 4 | 0 | 0 | 0 | Core / Health | `20260807000000_premium_architecture_v2.sql` | `CONFIRMED` |
| `feature_usage` | 8 | 3 | 1 | 4 | Core / Health | `20260806220000_feature_registry_phase1.sql` | `CONFIRMED` |
| `feature_usage_events` | 11 | 2 | 0 | 2 | Core / Health | `20260806250000_feature_usage_engine.sql` | `CONFIRMED` |
| `feature_version_history` | 10 | 0 | 0 | 3 | Core / Health | `20260806240000_feature_registry_versioning.sql` | `CONFIRMED` |
| `feeding_logs` | 8 | 0 | 0 | 1 | Nutrition & Diet | `20240429000016_nutrition_foundation.sql` | `CONFIRMED` |
| `food_brand_aliases` | 4 | 0 | 0 | 0 | Nutrition & Diet | `20260723220000_food_catalog_and_assignments.sql` | `CONFIRMED` |
| `food_brands` | 10 | 0 | 0 | 0 | Nutrition & Diet | `20260723220000_food_catalog_and_assignments.sql` | `CONFIRMED` |
| `food_inventory` | 6 | 0 | 0 | 1 | Nutrition & Diet | `20240429000016_nutrition_foundation.sql` | `CONFIRMED` |
| `food_label_versions` | 17 | 0 | 0 | 0 | Nutrition & Diet | `20260723220000_food_catalog_and_assignments.sql` | `CONFIRMED` |
| `food_manufacturers` | 11 | 0 | 0 | 0 | Nutrition & Diet | `20260723220000_food_catalog_and_assignments.sql` | `CONFIRMED` |
| `food_product_families` | 17 | 0 | 0 | 0 | Nutrition & Diet | `20260723220000_food_catalog_and_assignments.sql` | `CONFIRMED` |
| `food_skus` | 13 | 0 | 0 | 1 | Nutrition & Diet | `20260723220000_food_catalog_and_assignments.sql` | `CONFIRMED` |
| `funnel_events` | 6 | 0 | 0 | 3 | Core / Health | `20260624000004_sprint2.sql` | `CONFIRMED` |

---

## 3. Core Entity & Schema Definitions

### 3.1 `pets` Table (Pet Identity Canonical Source)
- **Primary Key**: `id` (uuid, gen_random_uuid()) [`CONFIRMED`]
- **Foreign Keys**: `owner_id` -> `auth.users(id)` ON DELETE RESTRICT [`CONFIRMED`]
- **Key Columns**: `name` (text), `species` (text: 'dog'|'cat'), `breed` (text), `birth_date` (date), `gender` (text), `is_neutered` (boolean), `microchip_number` (text), `is_archived` (boolean, default false) [`CONFIRMED`]
- **Age Classification Rule**:
  - Kitten/Puppy: 0 - 1 yr
  - Adult: 1 - 7 yrs
  - Senior: 7 - 12 yrs
  - Senior+: 12+ yrs [`CONFIRMED` - `AGENTS.md`]

### 3.2 `vaccines` & `vaccine_records` Table (Preventative Care Source)
- **Primary Key**: `id` (uuid) [`CONFIRMED`]
- **Foreign Keys**: `pet_id` -> `pets(id)` ON DELETE CASCADE, `created_by` -> `auth.users(id)` [`CONFIRMED`]
- **Key Columns**: `vaccine_name` (text), `administered_date` (date), `next_due_date` (date), `clinic_name` (text), `batch_number` (text), `is_archived` (boolean) [`CONFIRMED`]
- **Rule**: Hard delete is disabled; deleted records have `is_archived = true`. [`CONFIRMED` - `AGENTS.md`]

### 3.3 `pet_owners` & `co_owners` Table (Multi-Owner Permissions)
- **Primary Key**: `id` (uuid) [`CONFIRMED`]
- **Foreign Keys**: `pet_id` -> `pets(id)`, `user_id` -> `auth.users(id)` [`CONFIRMED`]
- **Key Columns**: `role` (text: 'primary_owner'|'co_owner'|'caregiver'|'sitter'), `permissions` (jsonb) [`CONFIRMED`]

---

## 4. RPC Functions & Stored Procedures Sample

| RPC Function Name | Parameters | Return Type | Origin Migration | Purpose | Evidence Rating |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `get_pet_health_summary` | `p_pet_id uuid` | `jsonb` | `20260715_health_summary.sql` | Aggregates health status, overdue vaccines, weight trend | `CONFIRMED` |
| `calculate_age_group` | `p_birth_date date` | `text` | `20260520_age_scale.sql` | Calculates standard age scale (Yavru/Yetişkin/Yaşlı) | `CONFIRMED` |
| `archive_health_record` | `p_record_id uuid, p_table text` | `boolean` | `20260605_archival.sql` | Soft-archives health record safely | `CONFIRMED` |

---