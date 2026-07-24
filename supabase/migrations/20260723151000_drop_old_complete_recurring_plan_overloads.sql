-- Migration: Drop old complete_recurring_plan function overloads to avoid signature ambiguity
-- Date: 2026-07-23

DROP FUNCTION IF EXISTS public.complete_recurring_plan(UUID, UUID, TIMESTAMPTZ, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.complete_recurring_plan(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, JSONB, TIMESTAMPTZ);
