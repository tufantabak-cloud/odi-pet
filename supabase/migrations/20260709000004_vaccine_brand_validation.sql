CREATE OR REPLACE FUNCTION validate_vaccine_record_brand()
RETURNS trigger AS $$
BEGIN
  IF NEW.brand_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM vaccine_brands vb
    WHERE vb.id = NEW.brand_id
      AND vb.vaccine_code = NEW.vaccine_code
  ) THEN
    RAISE EXCEPTION 'Brand does not belong to vaccine_code %', NEW.vaccine_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_vaccine_brand ON vaccine_records_v2;
CREATE TRIGGER trg_validate_vaccine_brand
BEFORE INSERT OR UPDATE ON vaccine_records_v2
FOR EACH ROW EXECUTE FUNCTION validate_vaccine_record_brand();
