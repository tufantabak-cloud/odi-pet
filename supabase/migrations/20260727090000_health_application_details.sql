BEGIN;

ALTER TABLE public.vaccine_records_v2
  ADD COLUMN IF NOT EXISTS administration_place TEXT,
  ADD COLUMN IF NOT EXISTS institution_name TEXT,
  ADD COLUMN IF NOT EXISTS provider_name TEXT,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS product_notes TEXT;

ALTER TABLE public.parasite_records
  ADD COLUMN IF NOT EXISTS lot_number TEXT,
  ADD COLUMN IF NOT EXISTS product_expiry_at DATE,
  ADD COLUMN IF NOT EXISTS administration_place TEXT,
  ADD COLUMN IF NOT EXISTS institution_name TEXT,
  ADD COLUMN IF NOT EXISTS provider_name TEXT,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS product_notes TEXT,
  ADD COLUMN IF NOT EXISTS reaction_observed TEXT,
  ADD COLUMN IF NOT EXISTS applied_dose TEXT,
  ADD COLUMN IF NOT EXISTS active_ingredient TEXT;

ALTER TABLE public.vaccine_records_v2
  DROP CONSTRAINT IF EXISTS vaccine_records_v2_administration_place_check,
  ADD CONSTRAINT vaccine_records_v2_administration_place_check
    CHECK (
      administration_place IS NULL OR administration_place IN (
        'home', 'veterinary_clinic', 'agriculture_directorate', 'municipality', 'other'
      )
    ),
  DROP CONSTRAINT IF EXISTS vaccine_records_v2_currency_check,
  ADD CONSTRAINT vaccine_records_v2_currency_check
    CHECK (currency IN ('TRY', 'USD', 'EUR')),
  DROP CONSTRAINT IF EXISTS vaccine_records_v2_amount_check,
  ADD CONSTRAINT vaccine_records_v2_amount_check
    CHECK (amount IS NULL OR amount >= 0);

ALTER TABLE public.parasite_records
  DROP CONSTRAINT IF EXISTS parasite_records_administration_place_check,
  ADD CONSTRAINT parasite_records_administration_place_check
    CHECK (
      administration_place IS NULL OR administration_place IN (
        'home', 'veterinary_clinic', 'agriculture_directorate', 'municipality', 'other'
      )
    ),
  DROP CONSTRAINT IF EXISTS parasite_records_currency_check,
  ADD CONSTRAINT parasite_records_currency_check
    CHECK (currency IN ('TRY', 'USD', 'EUR')),
  DROP CONSTRAINT IF EXISTS parasite_records_amount_check,
  ADD CONSTRAINT parasite_records_amount_check
    CHECK (amount IS NULL OR amount >= 0);

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS record_type TEXT;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_currency_check,
  ADD CONSTRAINT payments_currency_check CHECK (currency IN ('TRY', 'USD', 'EUR'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_health_record_unique
  ON public.payments(record_id, record_type)
  WHERE record_id IS NOT NULL AND record_type IS NOT NULL;

NOTIFY pgrst, 'reload schema';

COMMIT;
