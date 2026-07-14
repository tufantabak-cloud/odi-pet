-- Migration: Add 'kontrol' category to plans.category
-- Description: "Kontroller & Randevular" (checkups/appointments) gets its own
-- first-class category instead of living under 'saglik'. Additive only —
-- no rows are deleted, existing values are preserved.

-- 1. Widen the CHECK constraint (Postgres auto-named it plans_category_check
--    since the original constraint was declared inline without a name).
ALTER TABLE public.plans
  DROP CONSTRAINT IF EXISTS plans_category_check;

ALTER TABLE public.plans
  ADD CONSTRAINT plans_category_check CHECK (category IN (
    'saglik','asi','parazit','bakim',
    'beslenme','hijyen','aktivite','kontrol'
  ));

-- 2. Backfill: existing "Sağlık" plans whose sub_type is a Veteriner-style
--    appointment move to the new 'kontrol' category. sub_type values come
--    from src/lib/tasks/taskDefaults.ts's Veteriner sub-category ids.
UPDATE public.plans
SET category = 'kontrol'
WHERE category = 'saglik'
  AND sub_type IN ('Kontrol', 'Acil', 'Takip');
