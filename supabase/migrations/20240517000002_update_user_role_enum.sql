-- ============================================================
-- Migration: Update user_role enum
--
-- Old values: owner, clinic_staff, clinic_admin, super_admin
-- New values : owner, vet, admin, founder
--
-- Strategy (PostgreSQL doesn't support DROP VALUE):
--   1. Rename old type  → user_role_old
--   2. Create new type  → user_role
--   3. Migrate the column (best-effort mapping of legacy values)
--   4. Drop old type
-- ============================================================

-- Step 1: Rename the existing enum so we can swap the column type
ALTER TYPE user_role RENAME TO user_role_old;

-- Step 2: Create the new enum with the correct values
CREATE TYPE user_role AS ENUM ('owner', 'vet', 'admin', 'founder');

-- Step 3: Migrate the profiles.role column
--   clinic_staff  → vet
--   clinic_admin  → admin
--   super_admin   → founder
--   owner         → owner  (unchanged)
ALTER TABLE profiles
  ALTER COLUMN role DROP DEFAULT;

ALTER TABLE profiles
  ALTER COLUMN role TYPE user_role
  USING (
    CASE role::text
      WHEN 'owner'        THEN 'owner'
      WHEN 'clinic_staff' THEN 'vet'
      WHEN 'clinic_admin' THEN 'admin'
      WHEN 'super_admin'  THEN 'founder'
      ELSE 'owner'   -- safe fallback
    END
  )::user_role;

ALTER TABLE profiles
  ALTER COLUMN role SET DEFAULT 'owner'::user_role;

-- Step 4: Drop the old enum
DROP TYPE user_role_old;
