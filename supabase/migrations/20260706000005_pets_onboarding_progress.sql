-- Migration: 20260706000005_pets_onboarding_progress.sql
ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS onboarding_progress JSONB NOT NULL DEFAULT '{
    "pet_created": true,
    "vaccine_plan": false,
    "parasite_first": false,
    "emergency_contact": false,
    "documents": false,
    "first_seen_at": null,
    "snoozed_until": null
  }'::jsonb;

COMMENT ON COLUMN pets.onboarding_progress IS
  'Akıllı Kurulum Rehberi adım durumları. Her adım tamamlanınca ilgili alan true yapılır.';

CREATE OR REPLACE FUNCTION update_onboarding_step(
  p_pet_id UUID,
  p_step TEXT,
  p_value BOOLEAN
) RETURNS void AS $$
BEGIN
  UPDATE pets
  SET onboarding_progress = onboarding_progress || jsonb_build_object(p_step, p_value)
  WHERE id = p_pet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
