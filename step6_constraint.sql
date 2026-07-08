ALTER TABLE vaccine_records_v2
  ADD CONSTRAINT chk_real_vaccine_records_have_administered_at
  CHECK (administered_at IS NOT NULL);
