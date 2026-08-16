# DATA INTEGRITY, CONSTRAINTS & RLS SECURITY AUDIT SPECIFICATION

**System:** Odi Pet Platform  
**Scope:** Forensic Verification of Database Integrity Rules, Foreign Keys, Unique Constraints, Check Constraints, RLS Policies, Duplicate Prevention, Orphan Record Protection, and Soft-Delete Medical Archival Rules  
**Audit Date:** August 12, 2026  
**Status:** FORENSIC BASELINE SPECIFICATION (READ-ONLY AUDIT)  

---

## 1. DATA INTEGRITY & CONSTRAINT OVERVIEW

Data integrity in Odi Pet is enforced at the verifiably lowest layer: the **PostgreSQL verifiably typed schema, constraints, unique indices, and Row Level Security (RLS) policies**.

| Integrity Rule Category | Database Mechanism | Primary Impacted Tables | Implementation Purpose | Evidence Rating & Source Path |
| :--- | :--- | :--- | :--- | :--- |
| **Unique Constraints** | `UNIQUE` Indices | `profiles`, `clinic_memberships`, `pet_memberships`, `pet_estrus_cycles`, `vaccine_records_v2`, `notification_jobs` | Prevents duplicate user accounts, duplicate open estrus cycles, duplicate vaccine entries, and duplicate notification job execution | `CONFIRMED` — [`20260715113000_add_unique_open_cycle_index.sql`](file:///c:/Odi.Pet/supabase/migrations/20260715113000_add_unique_open_cycle_index.sql) |
| **FK Cascades** | `REFERENCES ... ON DELETE CASCADE` | `pets`, `care_plans`, `appointments`, `notifications`, `pet_memberships`, `pet_food_assignments` | Ensures clean cascade deletion of non-medical records when a user or pet profile is permanently removed | `CONFIRMED` — [`20260806140000_fix_pet_deletion_cascade.sql`](file:///c:/Odi.Pet/supabase/migrations/20260806140000_fix_pet_deletion_cascade.sql) |
| **Check Constraints** | `CHECK (...)` | `pets`, `vaccine_records_v2`, `parasite_products`, `weight_logs`, `orchestrator_campaigns` | Restricts species (`cat`, `dog`), gender (`male`, `female`), weight (> 0), and status string enums to valid domain values | `CONFIRMED` — [`20240420000001_extend_schema.sql`](file:///c:/Odi.Pet/supabase/migrations/20240420000001_extend_schema.sql) |
| **RLS Policies** | `ENABLE ROW LEVEL SECURITY` | All 85+ Public Tables | Restricts read/write database access strictly to authorized resource owners or family members | `CONFIRMED` — [`20260529000002_enforce_rls_priority_1.sql`](file:///c:/Odi.Pet/supabase/migrations/20260529000002_enforce_rls_priority_1.sql) |
| **Medical Archival** | Soft-Delete Columns (`is_archived`) | `vaccine_records_v2`, `parasite_records`, `health_diseases`, `health_medications` | Enforces OPOS Vol 5 rule: medical & health history cannot be hard-deleted from database | `CONFIRMED` — [`20260715164000_remove_duplicate_vaccines_and_add_unique.sql`](file:///c:/Odi.Pet/supabase/migrations/20260715164000_remove_duplicate_vaccines_and_add_unique.sql) |
| **Orphan Prevention** | Mandatory Foreign Keys & Triggers | `pet_owners`, `pet_memberships`, `plans`, `notification_jobs` | Prevents records from existing without a valid parent pet or user profile | `CONFIRMED` — [`20260731200000_add_missing_fk_indexes.sql`](file:///c:/Odi.Pet/supabase/migrations/20260731200000_add_missing_fk_indexes.sql) |

---

## 2. DETAILED INTEGRITY MECHANISM SPECIFICATIONS

### 2.1 Unique Constraints & Duplicate Prevention
1. **User Profiles:** `profiles.id` references `auth.users(id) PRIMARY KEY`. Prevents duplicate profile records for a single auth user ([`all_in_one_supabase.sql:L12`](file:///c:/Odi.Pet/all_in_one_supabase.sql#L12)).
2. **Clinic Staff Memberships:** `UNIQUE(profile_id, clinic_id)` on `clinic_memberships` ([`all_in_one_supabase.sql:L40`](file:///c:/Odi.Pet/all_in_one_supabase.sql#L40)). Prevents assigning a staff member to the same clinic twice.
3. **Pet Memberships:** Partial unique index on `pet_memberships(pet_id, profile_id)` ([`20260728120000_canonical_pet_memberships_phase0.sql`](file:///c:/Odi.Pet/supabase/migrations/20260728120000_canonical_pet_memberships_phase0.sql)). Enforces single primary owner per pet.
4. **Open Estrus Cycle:** Partial unique index `idx_pet_estrus_cycles_unique_open`:
   ```sql
   CREATE UNIQUE INDEX idx_pet_estrus_cycles_unique_open 
   ON public.pet_estrus_cycles(pet_id) 
   WHERE status != 'completed';
   ```
   Prevents logging multiple concurrent active estrus cycles for the same pet ([`20260715113000_add_unique_open_cycle_index.sql`](file:///c:/Odi.Pet/supabase/migrations/20260715113000_add_unique_open_cycle_index.sql)).
5. **Vaccine Duplicate Prevention:** Unique constraint `unique_pet_vaccine_date_title` on `vaccine_records_v2(pet_id, title, date)` ([`20260715164000_remove_duplicate_vaccines_and_add_unique.sql`](file:///c:/Odi.Pet/supabase/migrations/20260715164000_remove_duplicate_vaccines_and_add_unique.sql)). Prevents double-entry of the same vaccine on the same date for a pet.
6. **Notification Job Idempotency:** Unique index on `notification_jobs(idempotency_key)` ([`20260615154000_create_plans_and_notification_jobs.sql`](file:///c:/Odi.Pet/supabase/migrations/20260615154000_create_plans_and_notification_jobs.sql)).

---

### 2.2 Foreign Key Cascades & Orphan Record Handling
1. **User Profile Cascade:** `ON DELETE CASCADE` from `auth.users(id)` to `public.profiles(id)` ensures that deleting an authentication user cleanly purges user profile metadata.
2. **Pet Profile Cascade:** Migration `20260806140000_fix_pet_deletion_cascade.sql` ([`20260806140000_fix_pet_deletion_cascade.sql`](file:///c:/Odi.Pet/supabase/migrations/20260806140000_fix_pet_deletion_cascade.sql)) configures explicit `ON DELETE CASCADE` for:
   - `pet_memberships.pet_id -> pets.id`
   - `care_plans.pet_id -> pets.id`
   - `plans.pet_id -> pets.id`
   - `appointments.pet_id -> pets.id`
   - `notifications.pet_id -> pets.id`
   - `pet_food_assignments.pet_id -> pets.id`
3. **Missing FK Index Optimization:** Migration `20260731200000_add_missing_fk_indexes.sql` ([`20260731200000_add_missing_fk_indexes.sql`](file:///c:/Odi.Pet/supabase/migrations/20260731200000_add_missing_fk_indexes.sql)) adds explicit indexes on all foreign key columns across all tables to eliminate sequential scans during cascade operations.

---

### 2.3 Check Constraints & Domain Range Rules
1. **Pet Gender Check:** `gender IN ('male', 'female', 'unknown')` on `pets` ([`20240420000001_extend_schema.sql`](file:///c:/Odi.Pet/supabase/migrations/20240420000001_extend_schema.sql)).
2. **Pet Species Check:** `species IN ('cat', 'dog')` on `pets` ([`20240420000002_restrict_species.sql`](file:///c:/Odi.Pet/supabase/migrations/20240420000002_restrict_species.sql)).
3. **Appointment Status Check:** `status IN ('pending', 'confirmed', 'cancelled', 'completed')` on `appointments` ([`all_in_one_supabase.sql:L8`](file:///c:/Odi.Pet/all_in_one_supabase.sql#L8)).
4. **Weight Log Value Check:** `weight_kg > 0` on `weight_logs` ([`20240420000006_health_module.sql`](file:///c:/Odi.Pet/supabase/migrations/20240420000006_health_module.sql)).

---

### 2.4 Row Level Security (RLS) Policy Specifications
Every public table in Odi Pet has `ROW LEVEL SECURITY` explicitly enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`). Access policies enforce strict ownership and family membership checks:

```sql
-- Standard Pet Owner Select Policy
CREATE POLICY "Owners can view their own pets" 
ON public.pets FOR SELECT 
USING (
  auth.uid() = owner_id 
  OR EXISTS (
    SELECT 1 FROM public.pet_memberships pm 
    WHERE pm.pet_id = pets.id AND pm.profile_id = auth.uid()
  )
);
```

- **Priority RLS Migration:** Migration `20260529000002_enforce_rls_priority_1.sql` ([`20260529000002_enforce_rls_priority_1.sql`](file:///c:/Odi.Pet/supabase/migrations/20260529000002_enforce_rls_priority_1.sql)) guarantees that even background worker tables enforce owner checks unless accessed via `service_role`.
- **EVIDENCE RATING:** `CONFIRMED` — Source: [`supabase/migrations/20260529000002_enforce_rls_priority_1.sql`](file:///c:/Odi.Pet/supabase/migrations/20260529000002_enforce_rls_priority_1.sql).

---

### 2.5 Medical Archival & Soft-Delete Safety (OPOS Vol 5)
- **POLICY:** Medical records (`vaccine_records_v2`, `parasite_records`, `health_diseases`, `health_medications`) CANNOT be hard deleted via raw SQL `DELETE`.
- **IMPLEMENTATION:** Soft delete is implemented via boolean column `is_archived` (default `false`) and `archived_at` (timestamp).
- **PURPOSE:** Preserves complete, tamper-proof medical history for veterinary consultations and legal compliance.
- **EVIDENCE RATING:** `CONFIRMED` — Source: [`supabase/migrations/20260715164000_remove_duplicate_vaccines_and_add_unique.sql`](file:///c:/Odi.Pet/supabase/migrations/20260715164000_remove_duplicate_vaccines_and_add_unique.sql).
