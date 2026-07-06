-- OdiPet - vaccine_brands clinical fields migration
ALTER TABLE public.vaccine_brands
  ADD COLUMN IF NOT EXISTS is_live_vaccine     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS administration_route TEXT NOT NULL CHECK (
    administration_route IN ('intranasal','oral','parenteral_sc','parenteral_im')
  ) DEFAULT 'parenteral_sc';
