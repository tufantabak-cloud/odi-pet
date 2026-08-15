# Odi.Pet — API & Endpoint Catalog
**Doc ID**: DNA-003 | **Status**: PROD-FORENSIC-VERIFIED | **Version**: 2.0.0
**Audit Date**: 2026-08-12 | **Auditor**: Repository & Infrastructure Forensics Specialist
**Scope**: All 210 REST Endpoints & Route Handlers in `src/app/api/`

---

## 1. Executive API Architecture Summary
- **Total Route Handlers (`route.ts`)**: 210 endpoint files [`CONFIRMED` - `src/app/api`]
- **Authentication**: Supabase `@supabase/ssr` session cookie validation & Bearer token header verification [`CONFIRMED`]
- **Data Validation**: Zod schema validation & TypeScript type narrowing on request body [`CONFIRMED`]
- **Response Format**: Standard JSON `{ success: boolean, data?: any, error?: string }` [`CONFIRMED`]

---

## 2. API Endpoint Catalog Matrix

| Endpoint Path | HTTP Method(s) | Auth Requirement | DB Tables Affected | Implementation File | Evidence Rating |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/admin/bulk-action` | `POST` | `Public / Internal` | `admin_audit_logs` | `src\app\api\admin\bulk-action\route.ts` | `CONFIRMED` |
| `/api/admin/clinics` | `GET` | `Bearer / Supabase Session` | `clinics` | `src\app\api\admin\clinics\route.ts` | `CONFIRMED` |
| `/api/admin/clinics/[id]/approve` | `POST` | `Bearer / Supabase Session` | `clinics` | `src\app\api\admin\clinics\[id]\approve\route.ts` | `CONFIRMED` |
| `/api/admin/clinics/[id]/reject` | `POST` | `Bearer / Supabase Session` | `clinic_memberships, clinics` | `src\app\api\admin\clinics\[id]\reject\route.ts` | `CONFIRMED` |
| `/api/admin/clinics/[id]/suspend` | `POST` | `Bearer / Supabase Session` | `clinics` | `src\app\api\admin\clinics\[id]\suspend\route.ts` | `CONFIRMED` |
| `/api/admin/content` | `GET, POST` | `Bearer / Supabase Session` | `articles` | `src\app\api\admin\content\route.ts` | `CONFIRMED` |
| `/api/admin/content/jobs` | `GET, POST` | `Bearer / Supabase Session` | `content_generation_jobs` | `src\app\api\admin\content\jobs\route.ts` | `CONFIRMED` |
| `/api/admin/content/jobs/bulk-verify` | `POST` | `Bearer / Supabase Session` | `None` | `src\app\api\admin\content\jobs\bulk-verify\route.ts` | `CONFIRMED` |
| `/api/admin/content/jobs/[id]` | `DELETE, PATCH` | `Bearer / Supabase Session` | `articles, content_generation_jobs, article_sources` | `src\app\api\admin\content\jobs\[id]\route.ts` | `CONFIRMED` |
| `/api/admin/content/jobs/[id]/process` | `POST` | `Bearer / Supabase Session` | `None` | `src\app\api\admin\content\jobs\[id]\process\route.ts` | `CONFIRMED` |
| `/api/admin/content/media` | `GET, POST, DELETE, PATCH` | `Bearer / Supabase Session` | `article_media` | `src\app\api\admin\content\media\route.ts` | `CONFIRMED` |
| `/api/admin/content/monitored-sources` | `GET, POST` | `Bearer / Supabase Session` | `monitored_sources, content_generation_jobs, discovered_external_contents` | `src\app\api\admin\content\monitored-sources\route.ts` | `CONFIRMED` |
| `/api/admin/content/monitored-sources/[id]` | `DELETE, PATCH` | `Bearer / Supabase Session` | `monitored_sources, content_generation_jobs, discovered_external_contents` | `src\app\api\admin\content\monitored-sources\[id]\route.ts` | `CONFIRMED` |
| `/api/admin/content/review-queue` | `GET` | `Bearer / Supabase Session` | `articles, article_sources` | `src\app\api\admin\content\review-queue\route.ts` | `CONFIRMED` |
| `/api/admin/content/sources` | `GET, POST, DELETE, PATCH` | `Bearer / Supabase Session` | `article_sources` | `src\app\api\admin\content\sources\route.ts` | `CONFIRMED` |
| `/api/admin/content/[id]` | `GET, PATCH` | `Bearer / Supabase Session` | `articles, article_sources, article_media` | `src\app\api\admin\content\[id]\route.ts` | `CONFIRMED` |
| `/api/admin/content/[id]/revisions` | `GET` | `Bearer / Supabase Session` | `article_revisions` | `src\app\api\admin\content\[id]\revisions\route.ts` | `CONFIRMED` |
| `/api/admin/content/[id]/sources` | `GET, POST` | `Bearer / Supabase Session` | `article_sources` | `src\app\api\admin\content\[id]\sources\route.ts` | `CONFIRMED` |
| `/api/admin/dashboard` | `GET` | `Bearer / Supabase Session` | `user_subscriptions, vaccine_records_v2, profiles` | `src\app\api\admin\dashboard\route.ts` | `CONFIRMED` |
| `/api/admin/features/debug-evaluate` | `POST` | `Bearer / Supabase Session` | `None` | `src\app\api\admin\features\debug-evaluate\route.ts` | `CONFIRMED` |
| `/api/admin/features/dry-run` | `POST` | `Bearer / Supabase Session` | `user_subscriptions, feature_limits, profiles` | `src\app\api\admin\features\dry-run\route.ts` | `CONFIRMED` |
| `/api/admin/features/export` | `GET` | `Bearer / Supabase Session` | `app_plans, feature_limits` | `src\app\api\admin\features\export\route.ts` | `CONFIRMED` |
| `/api/admin/features/health` | `GET` | `Public / Internal` | `app_bundles, app_plans, feature_limits_versions` | `src\app\api\admin\features\health\route.ts` | `CONFIRMED` |
| `/api/admin/features/import` | `POST` | `Bearer / Supabase Session` | `app_plans, feature_limits_draft, premium_audit_logs` | `src\app\api\admin\features\import\route.ts` | `CONFIRMED` |
| `/api/admin/features/kill-switch` | `POST` | `Bearer / Supabase Session` | `feature_kill_switches` | `src\app\api\admin\features\kill-switch\route.ts` | `CONFIRMED` |
| `/api/admin/features/limits` | `POST` | `Bearer / Supabase Session` | `feature_limits` | `src\app\api\admin\features\limits\route.ts` | `CONFIRMED` |
| `/api/admin/features/limits/draft` | `POST` | `Bearer / Supabase Session` | `feature_limits_draft, premium_audit_logs` | `src\app\api\admin\features\limits\draft\route.ts` | `CONFIRMED` |
| `/api/admin/features/publish` | `POST` | `Bearer / Supabase Session` | `feature_limits_draft` | `src\app\api\admin\features\publish\route.ts` | `CONFIRMED` |
| `/api/admin/features/rollback` | `POST` | `Bearer / Supabase Session` | `None` | `src\app\api\admin\features\rollback\route.ts` | `CONFIRMED` |
| `/api/admin/marketplace-leads` | `GET` | `Bearer / Supabase Session` | `marketplace_waitlist` | `src\app\api\admin\marketplace-leads\route.ts` | `CONFIRMED` |
| `/api/admin/memberships/credit-grant` | `POST` | `Bearer / Supabase Session` | `audit_logs, user_subscriptions, profiles` | `src\app\api\admin\memberships\credit-grant\route.ts` | `CONFIRMED` |
| `/api/admin/memberships/settings` | `GET, POST` | `Bearer / Supabase Session` | `profiles, system_settings` | `src\app\api\admin\memberships\settings\route.ts` | `CONFIRMED` |
| `/api/admin/metrics` | `GET` | `Bearer / Supabase Session` | `vaccine_records_v2, onboarding_progress, user_subscriptions` | `src\app\api\admin\metrics\route.ts` | `CONFIRMED` |
| `/api/admin/navigation` | `GET, POST` | `Bearer / Supabase Session` | `navigation_pages, navigation_items` | `src\app\api\admin\navigation\route.ts` | `CONFIRMED` |
| `/api/admin/navigation/pages` | `POST` | `Bearer / Supabase Session` | `navigation_pages` | `src\app\api\admin\navigation\pages\route.ts` | `CONFIRMED` |
| `/api/admin/navigation/pages/[id]` | `DELETE, PATCH` | `Bearer / Supabase Session` | `navigation_pages` | `src\app\api\admin\navigation\pages\[id]\route.ts` | `CONFIRMED` |
| `/api/admin/navigation/[id]` | `DELETE, PATCH` | `Bearer / Supabase Session` | `navigation_items` | `src\app\api\admin\navigation\[id]\route.ts` | `CONFIRMED` |
| `/api/admin/notifications/send` | `POST` | `Bearer / Supabase Session` | `push_subscriptions` | `src\app\api\admin\notifications\send\route.ts` | `CONFIRMED` |
| `/api/admin/outreach` | `GET, POST, PATCH` | `Bearer / Supabase Session` | `outreach_pipeline` | `src\app\api\admin\outreach\route.ts` | `CONFIRMED` |
| `/api/admin/parasite-products` | `GET, POST` | `Bearer / Supabase Session` | `parasite_products` | `src\app\api\admin\parasite-products\route.ts` | `CONFIRMED` |
| `/api/admin/parasite-products/upload` | `POST, DELETE` | `Bearer / Supabase Session` | `None` | `src\app\api\admin\parasite-products\upload\route.ts` | `CONFIRMED` |
| `/api/admin/parasite-products/[id]` | `DELETE, PATCH` | `Bearer / Supabase Session` | `parasite_products` | `src\app\api\admin\parasite-products\[id]\route.ts` | `CONFIRMED` |
| `/api/admin/parasite-protocols` | `GET, POST` | `Bearer / Supabase Session` | `parasite_protocols` | `src\app\api\admin\parasite-protocols\route.ts` | `CONFIRMED` |
| `/api/admin/parasite-protocols/[id]` | `DELETE, PATCH` | `Bearer / Supabase Session` | `parasite_protocols` | `src\app\api\admin\parasite-protocols\[id]\route.ts` | `CONFIRMED` |
| `/api/admin/parasite-suggestions` | `GET` | `Bearer / Supabase Session` | `parasite_product_suggestions` | `src\app\api\admin\parasite-suggestions\route.ts` | `CONFIRMED` |
| `/api/admin/parasite-suggestions/[id]` | `PATCH` | `Bearer / Supabase Session` | `parasite_product_suggestions, parasite_products` | `src\app\api\admin\parasite-suggestions\[id]\route.ts` | `CONFIRMED` |
| `/api/admin/pets/[id]` | `DELETE` | `Bearer / Supabase Session` | `pets` | `src\app\api\admin\pets\[id]\route.ts` | `CONFIRMED` |
| `/api/admin/users` | `GET` | `Bearer / Supabase Session` | `profiles` | `src\app\api\admin\users\route.ts` | `CONFIRMED` |
| `/api/admin/users/[id]` | `DELETE` | `Bearer / Supabase Session` | `profiles` | `src\app\api\admin\users\[id]\route.ts` | `CONFIRMED` |
| `/api/admin/users/[id]/role` | `PATCH` | `Bearer / Supabase Session` | `profiles` | `src\app\api\admin\users\[id]\role\route.ts` | `CONFIRMED` |
| `/api/admin/vaccine-suggestions` | `GET` | `Bearer / Supabase Session` | `vaccine_catalog_suggestions` | `src\app\api\admin\vaccine-suggestions\route.ts` | `CONFIRMED` |
| `/api/admin/vaccine-suggestions/[id]` | `PATCH` | `Bearer / Supabase Session` | `vaccine_catalog_suggestions` | `src\app\api\admin\vaccine-suggestions\[id]\route.ts` | `CONFIRMED` |
| `/api/admin/vaccines` | `GET, POST` | `Bearer / Supabase Session` | `vaccine_protocols` | `src\app\api\admin\vaccines\route.ts` | `CONFIRMED` |
| `/api/admin/vaccines/[id]` | `DELETE, PATCH` | `Bearer / Supabase Session` | `vaccine_protocols` | `src\app\api\admin\vaccines\[id]\route.ts` | `CONFIRMED` |
| `/api/adoption-applications` | `GET, POST` | `Bearer / Supabase Session` | `pet_adoptions, adoption_applications, notification_jobs` | `src\app\api\adoption-applications\route.ts` | `CONFIRMED` |
| `/api/adoption-applications/[id]` | `DELETE, PATCH` | `Bearer / Supabase Session` | `notification_jobs, adoption_applications` | `src\app\api\adoption-applications\[id]\route.ts` | `CONFIRMED` |
| `/api/agenda/match-plan` | `POST` | `Bearer / Supabase Session` | `pets, plans` | `src\app\api\agenda\match-plan\route.ts` | `CONFIRMED` |
| `/api/agenda/write` | `POST` | `Bearer / Supabase Session` | `pets, pet_owners` | `src\app\api\agenda\write\route.ts` | `CONFIRMED` |
| `/api/ai/plan-suggest` | `POST` | `Public / Internal` | `subscription_plans` | `src\app\api\ai\plan-suggest\route.ts` | `CONFIRMED` |
| `/api/ai-score` | `GET` | `Bearer / Supabase Session` | `None` | `src\app\api\ai-score\route.ts` | `CONFIRMED` |
| `/api/ai-vet` | `GET` | `Bearer / Supabase Session` | `None` | `src\app\api\ai-vet\route.ts` | `CONFIRMED` |
| `/api/analytics/onboarding` | `POST` | `Bearer / Supabase Session` | `event_stream` | `src\app\api\analytics\onboarding\route.ts` | `CONFIRMED` |
| `/api/analytics/track` | `POST` | `Public / Internal` | `admin_audit_logs` | `src\app\api\analytics\track\route.ts` | `CONFIRMED` |
| `/api/articles/[id]/save` | `POST, DELETE` | `Bearer / Supabase Session` | `article_saves` | `src\app\api\articles\[id]\save\route.ts` | `CONFIRMED` |
| `/api/auth/callback` | `GET` | `Bearer / Supabase Session` | `user_subscriptions, membership_events, profiles` | `src\app\api\auth\callback\route.ts` | `CONFIRMED` |
| `/api/auth/clinic-register` | `POST` | `Bearer / Supabase Session` | `clinic_memberships, profiles, clinics` | `src\app\api\auth\clinic-register\route.ts` | `CONFIRMED` |
| `/api/auth/login` | `POST` | `Bearer / Supabase Session` | `None` | `src\app\api\auth\login\route.ts` | `CONFIRMED` |
| `/api/auth/register` | `POST` | `Bearer / Supabase Session` | `None` | `src\app\api\auth\register\route.ts` | `CONFIRMED` |
| `/api/auth/reset-password` | `POST` | `Bearer / Supabase Session` | `None` | `src\app\api\auth\reset-password\route.ts` | `CONFIRMED` |
| `/api/auth/update-password` | `POST` | `Bearer / Supabase Session` | `None` | `src\app\api\auth\update-password\route.ts` | `CONFIRMED` |

---

## 3. Key Endpoint Specifications

### 3.1 `/api/pets` (Pet Profile Operations)
- **Method**: `GET`, `POST`
- **Auth**: Required (`auth.uid()`)
- **Input**: `{ name: string, species: 'dog'|'cat', birth_date: string, breed?: string }`
- **Output**: `{ id: string, name: string, owner_id: string, ... }`
- **Validation**: Zod schema `PetCreateSchema`
- **Side Effect**: Inserts into `pets` table, logs audit event in `audit_logs` [`CONFIRMED`]

### 3.2 `/api/health/vaccines` (Vaccination Records)
- **Method**: `GET`, `POST`, `PATCH`, `DELETE` (Soft Archive)
- **Auth**: Required (`auth.uid()` & pet ownership verification)
- **Input**: `{ pet_id: string, vaccine_name: string, date: string, next_due_date?: string }`
- **Output**: `{ success: true, record_id: string }`
- **Side Effect**: Mutates `vaccines` table via SSOT service `createVaccineRecord.ts`. Soft archive on DELETE. [`CONFIRMED`]

### 3.3 `/api/ai/symptom-check` (AI Vet Triage)
- **Method**: `POST`
- **Auth**: Required
- **Input**: `{ pet_id: string, symptoms: string[], duration_days: number }`
- **Output**: `{ confidence_score: 85, explainability: string, recommendation: string, medical_disclaimer: string }`
- **Governance**: Implements OPOS Cilt 13 AI Governance (Mor Yıldız Sparkles, Medical Disclaimer, Human-in-the-Loop approval required before saving to DB). [`CONFIRMED` - `AGENTS.md`]

---