-- =============================================
-- SMART TASKS UPGRADE
-- Extends health_schedules and health_plans to support generic tasks
-- (Hygiene, Cleaning, Activities, Food, etc.)
-- =============================================

-- 1. Extend health_schedules
ALTER TABLE public.health_schedules
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS sub_category TEXT,
ADD COLUMN IF NOT EXISTS due_time TIME,
ADD COLUMN IF NOT EXISTS notification_rule JSONB DEFAULT '{"enabled": false}'::jsonb,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Migrate existing records to map to new category logic
UPDATE public.health_schedules 
SET category = 'Medical', 
    sub_category = plan_type 
WHERE category IS NULL 
  AND plan_type IN ('vaccine', 'medication', 'checkup');

-- 2. Extend health_plans to support advanced recurrences
ALTER TABLE public.health_plans
ADD COLUMN IF NOT EXISTS interval INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS end_condition TEXT, -- 'never', 'date', 'occurrences'
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS end_occurrences INTEGER;
