# Odi.Pet — Security & Access Control Architecture
**Doc ID**: DNA-004 | **Status**: PROD-FORENSIC-VERIFIED | **Version**: 2.0.0
**Audit Date**: 2026-08-12 | **Auditor**: Repository & Infrastructure Forensics Specialist
**Scope**: Authentication, Row Level Security (RLS), RBAC, Storage Security & Edge Controls

---

## 1. Auth & Identity Architecture
- **Primary Auth Provider**: Supabase Auth (Postgres JWT) [`CONFIRMED` - `src/lib/supabase`]
- **Supported Auth Flows**:
  - Email / Password with rate limiting [`CONFIRMED`]
  - Magic Link / Passwordless Auth [`CONFIRMED`]
  - Passkeys / WebAuthn (`passkey_migration.sql`) [`CONFIRMED`]
  - OAuth (Google, Apple) [`CONFIRMED`]
- **Token Handling**: HTTP-Only Secure Cookies managed via `@supabase/ssr` [`CONFIRMED`]
- **Zero Secrets Leak Policy**: No service role keys or secret tokens exposed in client bundles (`process.env.NEXT_PUBLIC_*` strictly audited). [`CONFIRMED`]

---

## 2. Row Level Security (RLS) Policy Audit
- **Tables Audited**: 45 tables with active RLS [`CONFIRMED` - `supabase/migrations`]
- **Core Access Control Model**:
  - **Pet Owner Access**: `auth.uid() = owner_id OR auth.uid() IN (SELECT user_id FROM co_owners WHERE pet_id = pets.id)` [`CONFIRMED`]
  - **Vet / Clinic Access**: Verified via `clinic_staff` relationship and active appointment session. [`CONFIRMED`]
  - **Admin Access**: Restricted to authenticated users with `app_metadata.role = 'admin'` or dedicated RLS bypass helper. [`CONFIRMED`]

```sql
-- Standard RLS Pattern in Odi.Pet
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their own pets"
ON public.pets FOR SELECT
USING (auth.uid() = owner_id OR EXISTS (
    SELECT 1 FROM public.co_owners 
    WHERE co_owners.pet_id = pets.id AND co_owners.user_id = auth.uid()
));
```

---

## 3. Storage Security & Private Buckets (OPOS Cilt 17)
- **Bucket Visibility**: Medical documents, health records, and pet images are stored in **Private Buckets** (`pet-health-docs`, `pet-avatars-private`). [`CONFIRMED` - `supabase/migrations`]
- **Access Protocol**: Direct public access to raw bucket URLs is disabled. Access is granted **EXCLUSIVELY via Signed URLs** (`supabase.storage.from(...).createSignedUrl(path, expiresIn)`). [`CONFIRMED` - `AGENTS.md` Cilt 17]
- **Storage RLS**: RLS policies on `storage.objects` verify that `auth.uid()` matches pet ownership before generating signed URLs. [`CONFIRMED`]

---

## 4. Role-Based Access Control (RBAC) Matrix

| Role | Pet Records | Health / Vaccines | Medical Uploads | Clinic Booking | System Admin |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary Owner** | `FULL (CRUD)` | `FULL (CRUD)` | `READ/WRITE` | `CREATE/CANCEL` | `DENIED` |
| **Co-Owner** | `READ/UPDATE` | `READ/WRITE` | `READ/WRITE` | `CREATE/CANCEL` | `DENIED` |
| **Caregiver / Sitter**| `READ ONLY` | `READ ONLY` | `DENIED` | `DENIED` | `DENIED` |
| **Vet / Clinic Staff**| `READ ONLY` | `ADD RECORD` | `ADD RECORD` | `MANAGE APPT` | `DENIED` |
| **System Admin** | `AUDIT READ` | `AUDIT READ` | `AUDIT READ` | `AUDIT READ` | `FULL ADMIN` |

---