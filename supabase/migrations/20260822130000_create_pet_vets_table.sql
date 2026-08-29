CREATE TABLE IF NOT EXISTS pet_vets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  clinic_name text NOT NULL,
  doctor_name text,
  address text,
  phone text,
  email text,
  specialty_tag text,
  is_primary boolean DEFAULT false,
  is_past boolean DEFAULT false,
  start_date text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS policies
ALTER TABLE pet_vets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their pet's vets"
  ON pet_vets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pet_owners WHERE pet_owners.pet_id = pet_vets.pet_id AND pet_owners.profile_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM pets WHERE pets.id = pet_vets.pet_id AND pets.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their pet's vets"
  ON pet_vets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pet_owners WHERE pet_owners.pet_id = pet_vets.pet_id AND pet_owners.profile_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM pets WHERE pets.id = pet_vets.pet_id AND pets.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their pet's vets"
  ON pet_vets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pet_owners WHERE pet_owners.pet_id = pet_vets.pet_id AND pet_owners.profile_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM pets WHERE pets.id = pet_vets.pet_id AND pets.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their pet's vets"
  ON pet_vets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pet_owners WHERE pet_owners.pet_id = pet_vets.pet_id AND pet_owners.profile_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM pets WHERE pets.id = pet_vets.pet_id AND pets.owner_id = auth.uid()
    )
  );

-- Function to handle only one primary vet per pet
CREATE OR REPLACE FUNCTION ensure_single_primary_pet_vet()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE pet_vets
    SET is_primary = false
    WHERE pet_id = NEW.pet_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_ensure_single_primary_pet_vet
BEFORE INSERT OR UPDATE OF is_primary ON pet_vets
FOR EACH ROW
WHEN (NEW.is_primary = true)
EXECUTE FUNCTION ensure_single_primary_pet_vet();
