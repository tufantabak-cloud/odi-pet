# ADMIN SYSTEM & FEATURE REGISTRY ARCHITECTURE SPECIFICATION

**System:** Odi Pet Platform  
**Scope:** Complete Back-Office Admin Panel Architecture, Master Protocol Catalogs, Feature Registry Engine, Entitlement Checks, System Settings, and Audit Logging  
**Audit Date:** August 12, 2026  
**Status:** FORENSIC BASELINE SPECIFICATION (READ-ONLY AUDIT)  

---

## 1. ADMIN PANEL STRUCTURE & CONTROL PANELS MATRIX

The Odi Pet back-office operational suite comprises **22 specialized administrative control panels** located under `src/app/admin/`. Access is strictly restricted to authenticated users with `super_admin` or `clinic_admin` roles ([`all_in_one_supabase.sql:L7`](file:///c:/Odi.Pet/all_in_one_supabase.sql#L7)).

| Admin Route Path | Panel Name | Primary Responsibilities | Main Canonical Tables | Key Code Files | Evidence Rating |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/admin/features` | Feature Registry Manager | Dynamic feature flag configuration, entitlement limits, versioning & overrides | `feature_registry`, `feature_registry_versions`, `feature_registry_overrides` | [`registry.ts`](file:///c:/Odi.Pet/src/lib/features/registry.ts), [`usage.ts`](file:///c:/Odi.Pet/src/lib/features/usage.ts) | `CONFIRMED` |
| `/admin/vaccines` | Vaccine Catalog & Protocol | Master KHVHD vaccine protocol curation, brand catalog management, lot validation | `vaccine_protocols`, `vaccine_brands`, `vaccine_catalog_suggestions` | [`20260605000001_vaccine_parasite_protocols.sql`](file:///c:/Odi.Pet/supabase/migrations/20260605000001_vaccine_parasite_protocols.sql) | `CONFIRMED` |
| `/admin/parasite-products` | Parasite Product Catalog | Internal/external parasite SKU curation, active ingredients, dosage & age limits | `parasite_protocols`, `parasite_products`, `parasite_product_suggestions` | [`20260719120000_seed_parasite_product_catalog_2026.sql`](file:///c:/Odi.Pet/supabase/migrations/20260719120000_seed_parasite_product_catalog_2026.sql) | `CONFIRMED` |
| `/admin/orchestrator` | Experience Orchestrator | Campaign management, target segment rule definitions, UI prompt templates | `orchestrator_campaigns`, `orchestrator_prompts`, `orchestrator_analytics` | [`20260803000003_experience_orchestrator.sql`](file:///c:/Odi.Pet/supabase/migrations/20260803000003_experience_orchestrator.sql) | `CONFIRMED` |
| `/admin/users` | User & Membership Manager | User profile management, role elevation, account suspension, family sharing audit | `profiles`, `pet_memberships`, `user_subscriptions` | [`src/app/admin/users/page.tsx`](file:///c:/Odi.Pet/src/app/admin/users/page.tsx) | `CONFIRMED` |
| `/admin/pets` | Pet Directory & Safety | System-wide pet directory review, lost pet status override, microchip verification | `pets`, `pet_owners`, `lost_reports` | [`src/app/admin/pets/page.tsx`](file:///c:/Odi.Pet/src/app/admin/pets/page.tsx) | `CONFIRMED` |
| `/admin/content` | Content & Article Manager | AI article review, manual vet overrides, source verification audit management | `articles`, `monitored_sources`, `source_verification_audits` | [`20260722180000_vet_review_requirement_and_override.sql`](file:///c:/Odi.Pet/supabase/migrations/20260722180000_vet_review_requirement_and_override.sql) | `CONFIRMED` |
| `/admin/ai-vet` | AI Vet Assistant Logs | Conversational AI chat session monitoring, safety filter audits, emergency escalation | `ai_usage_logs`, `content_generation_jobs` | [`src/app/admin/ai-vet/page.tsx`](file:///c:/Odi.Pet/src/app/admin/ai-vet/page.tsx) | `CONFIRMED` |
| `/admin/system-health` | Telemetry & System Health | Real-time service status, database query performance, Edge Function health | `event_stream`, `security_audit_logs` | [`systemHealthAgent.ts`](file:///c:/Odi.Pet/src/lib/agents/orchestrator/systemHealthAgent.ts) | `CONFIRMED` |
| `/admin/settings` | System Settings & Rules | Global system parameters, default user credits, VAPID push keys, API rate limits | `system_settings`, `onboarding_limits` | [`20260807050000_system_settings_and_welcome_credit.sql`](file:///c:/Odi.Pet/supabase/migrations/20260807050000_system_settings_and_welcome_credit.sql) | `CONFIRMED` |

---

## 2. FEATURE REGISTRY & ENTITLEMENT ENGINE SPECIFICATIONS

### 2.1 Schema Architecture
The Feature Registry sub-system ([`20260806220000_feature_registry_phase1.sql`](file:///c:/Odi.Pet/supabase/migrations/20260806220000_feature_registry_phase1.sql)) governs application feature flags, tier entitlement limits (Free vs Premium), usage quota consumption, and versioned rollbacks.

```sql
-- Feature Registry Master Table
CREATE TABLE public.feature_registry (
    feature_key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    required_tier TEXT NOT NULL DEFAULT 'free',
    quota_limit INTEGER DEFAULT NULL,
    quota_period TEXT DEFAULT 'monthly', -- 'daily', 'monthly', 'unlimited'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

- **Feature Registry Versions:** `feature_registry_versions` stores historical snapshots of the feature configuration. RPC `publish_feature_registry_version()` ([`20260807020000_publish_rpc.sql`](file:///c:/Odi.Pet/supabase/migrations/20260807020000_publish_rpc.sql)) creates an immutable version tag and allows instant 1-click rollback.
- **User Overrides:** `feature_registry_overrides` allows super-admins to grant specific users access to experimental features or custom quotas regardless of their subscription tier.

---

### 2.2 Entitlement & Quota Verification Engine
- **LOCATION:** [`src/lib/features/usage.ts`](file:///c:/Odi.Pet/src/lib/features/usage.ts).
- **ATOMIC CONSUMPTION RPC:** `consume_feature_usage(p_user_id, p_feature_key, p_amount, p_idempotency_key)`.
- **EVALUATION FLOW:**
  1. Checks if `feature_key` is globally enabled in `feature_registry`.
  2. Evaluates user subscription tier in `user_subscriptions`.
  3. Checks `feature_registry_overrides` for active user-level override.
  4. Queries current period usage in `feature_usages`.
  5. If `current_usage + p_amount <= quota_limit`, records consumption and returns `{ success: true }`. Otherwise returns `{ success: false, reason: 'quota_exceeded' }`.
- **API GUARD HOF:** `withAPIFeatureGuard(featureKey, handler)` wrapper automatically rejects requests with `403 Forbidden` if feature is disabled or quota is depleted ([`src/lib/features/guards/APIFeatureGuard.ts`](file:///c:/Odi.Pet/src/lib/features/guards/APIFeatureGuard.ts)).
- **EVIDENCE RATING:** `CONFIRMED` — Code source: [`src/lib/features/usage.ts`](file:///c:/Odi.Pet/src/lib/features/usage.ts).

---

## 3. PROTOCOL & BRAND CATALOG MANAGEMENT SPECIFICATIONS

### 3.1 KHVHD Vaccine Protocol & Brand Catalog
- **PROTOCOLS TABLE:** `vaccine_protocols` ([`20260605000001_vaccine_parasite_protocols.sql`](file:///c:/Odi.Pet/supabase/migrations/20260605000001_vaccine_parasite_protocols.sql)). Formatted according to official KHVHD (Turkish Small Animal Veterinary Association) guidelines.
- **FIELDS:** `id`, `species` (`cat`/`dog`), `category` (`core`, `non_core`, `lifestyle`), `vaccine_title`, `description`, `min_age_weeks`, `booster_interval_days`, `annual_booster_required`.
- **BRANDS TABLE:** `vaccine_brands` ([`20260605000003_vaccine_brands.sql`](file:///c:/Odi.Pet/supabase/migrations/20260605000003_vaccine_brands.sql)). Stores verified commercial vaccine brands (Nobivac, Defensor, Eurican, Purevax, Feligen). Includes clinical fields: `manufacturer`, `target_diseases`, `administration_route`, `storage_temp_celsius`.

---

### 3.2 Parasite Product & Protocol Catalog
- **PRODUCTS TABLE:** `parasite_products` ([`20260719120000_seed_parasite_product_catalog_2026.sql`](file:///c:/Odi.Pet/supabase/migrations/20260719120000_seed_parasite_product_catalog_2026.sql)). Stores 100+ verified parasite protection SKUs (Bravecto, NexGard, Broadline, Advocate, Stronghold, Seresto).
- **FIELDS:** `id`, `brand_name`, `product_name`, `parasite_type` (`internal`, `external`, `combined`, `collar`), `application_method` (`spot_on`, `oral`, `collar`), `min_weight_kg`, `max_weight_kg`, `min_age_months`, `duration_days`, `active_ingredients`.

---

## 4. SYSTEM SETTINGS & AUDIT LOGGING SPECIFICATIONS

1. **System Settings Table:** `public.system_settings` ([`20260807050000_system_settings_and_welcome_credit.sql`](file:///c:/Odi.Pet/supabase/migrations/20260807050000_system_settings_and_welcome_credit.sql)). Key-value store for global system settings (`welcome_credit_amount`, `max_pets_per_owner_free_tier`, `ocr_daily_limit_free_tier`).
2. **Admin Audit Trail:** `public.admin_audit_logs` ([`20260619133250_audit_log.sql`](file:///c:/Odi.Pet/supabase/migrations/20260619133250_audit_log.sql)). Logs every administrative action, including feature flag modifications, user role elevations, manual vet overrides, and system setting changes.
- **EVIDENCE RATING:** `CONFIRMED` — Code source: [`supabase/migrations/20260619133250_audit_log.sql`](file:///c:/Odi.Pet/supabase/migrations/20260619133250_audit_log.sql).
