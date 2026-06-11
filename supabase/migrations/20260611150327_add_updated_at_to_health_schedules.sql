-- Migration: Add updated_at to health_schedules table
-- Date: 2026-06-11
-- Purpose: Track last update time for syncing and general audit, preserving RLS

-- 1. Add the column (defaulting to NOW())
ALTER TABLE public.health_schedules
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

-- 2. Create the function to update the timestamp
CREATE OR REPLACE FUNCTION public.update_health_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. Create the trigger to auto-update on row modification
DROP TRIGGER IF EXISTS update_health_schedules_updated_at_trigger ON public.health_schedules;
CREATE TRIGGER update_health_schedules_updated_at_trigger
    BEFORE UPDATE ON public.health_schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_health_schedules_updated_at();
