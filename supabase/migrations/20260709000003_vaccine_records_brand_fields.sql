-- ============================================================
-- Aşı kayıt mimarisi refactor — vaccine_records_v2'ye marka
-- ve manuel form alanları eklendi. Önceden formda toplanan
-- (manufacturer, vetName, lotNumber, nextDueDate,
-- reactionObserved, documentImage) alanlar hiçbir yere
-- yazılmıyordu — bu migration bunları kalıcı hale getiriyor.
-- ============================================================

ALTER TABLE vaccine_records_v2
ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES vaccine_brands(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS brand_free_text text,
ADD COLUMN IF NOT EXISTS manufacturer_free_text text,
ADD COLUMN IF NOT EXISTS vet_name text,
ADD COLUMN IF NOT EXISTS lot_number text,
ADD COLUMN IF NOT EXISTS next_due_at timestamptz,
ADD COLUMN IF NOT EXISTS valid_until timestamptz,
ADD COLUMN IF NOT EXISTS reaction_observed text,
ADD COLUMN IF NOT EXISTS document_image_url text,
ADD COLUMN IF NOT EXISTS administration_route text;

CREATE INDEX IF NOT EXISTS idx_vaccine_records_v2_brand_id ON vaccine_records_v2(brand_id);
CREATE INDEX IF NOT EXISTS idx_vaccine_records_v2_vaccine_code ON vaccine_records_v2(vaccine_code);
CREATE INDEX IF NOT EXISTS idx_vaccine_records_v2_pet_code_dose ON vaccine_records_v2(pet_id, vaccine_code, dose_number);
