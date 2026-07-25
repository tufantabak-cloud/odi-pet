-- Keep the canonical weight timeline compatible with the existing growth UI/API.
-- Nullable and additive: existing measurements remain unchanged.
ALTER TABLE public.weight_logs
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,2);

COMMENT ON COLUMN public.weight_logs.height_cm IS
  'Optional shoulder height in centimetres recorded with a weight measurement.';
