-- Add laboratory and analysis metadata to pet_reproductive_tests
ALTER TABLE pet_reproductive_tests
ADD COLUMN laboratory_name TEXT,
ADD COLUMN assay_method TEXT,
ADD COLUMN analyzer_name TEXT,
ADD COLUMN reference_range TEXT,
ADD COLUMN sample_identifier TEXT;

-- (clinic_name is kept intentionally as requested)
