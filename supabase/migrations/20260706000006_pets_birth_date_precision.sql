-- Migration: 20260706000006_pets_birth_date_precision.sql
ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS birth_date_precision TEXT
    DEFAULT 'exact'
    CHECK (birth_date_precision IN ('exact', 'month_known', 'approximate', 'unknown'));

COMMENT ON COLUMN pets.birth_date_precision IS
  'Doğum tarihi kesinliği. exact: tam tarih, approximate: yaklaşık, unknown: bilinmiyor. Aşı ve parazit kural motoru için kullanılır.';
