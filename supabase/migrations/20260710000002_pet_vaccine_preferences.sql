-- ============================================================
-- pet_vaccine_preferences — kullanıcının opsiyonel/risk bazlı
-- aşı tercihlerini pet başına saklar (owner/profile/vaccine-settings).
-- Core ve legal (yasal zorunlu) aşılar bu tabloya girmez.
-- ============================================================

CREATE TABLE public.pet_vaccine_preferences (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id            UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  vaccine_code      TEXT NOT NULL,
  enabled           BOOLEAN NOT NULL DEFAULT false,
  vet_recommended   BOOLEAN NOT NULL DEFAULT false,
  risk_reason       TEXT,
  enabled_at        TIMESTAMPTZ,
  disabled_at       TIMESTAMPTZ,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pet_id, vaccine_code)
);

ALTER TABLE public.pet_vaccine_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_select_pet_vaccine_preferences" ON public.pet_vaccine_preferences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = pet_vaccine_preferences.pet_id
        AND pet_owners.profile_id = auth.uid()
    )
  );

CREATE POLICY "owners_insert_pet_vaccine_preferences" ON public.pet_vaccine_preferences
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = pet_vaccine_preferences.pet_id
        AND pet_owners.profile_id = auth.uid()
    )
  );

CREATE POLICY "owners_update_pet_vaccine_preferences" ON public.pet_vaccine_preferences
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = pet_vaccine_preferences.pet_id
        AND pet_owners.profile_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = pet_vaccine_preferences.pet_id
        AND pet_owners.profile_id = auth.uid()
    )
  );

CREATE POLICY "owners_delete_pet_vaccine_preferences" ON public.pet_vaccine_preferences
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = pet_vaccine_preferences.pet_id
        AND pet_owners.profile_id = auth.uid()
    )
  );

CREATE INDEX idx_pet_vaccine_preferences_pet ON public.pet_vaccine_preferences(pet_id);
CREATE INDEX idx_pet_vaccine_preferences_code ON public.pet_vaccine_preferences(vaccine_code);
