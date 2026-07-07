-- vaccine_protocols tablosuna eksik kolonları ekle
-- is_core zaten var ama risk_group ayrımı için category gerekiyor

ALTER TABLE vaccine_protocols
  ADD COLUMN IF NOT EXISTS category TEXT
    CHECK (category IN ('core','risk_based','legal','optional'))
    DEFAULT 'core',
  ADD COLUMN IF NOT EXISTS risk_group TEXT
    CHECK (risk_group IN ('outdoor','rural','kennel'));

-- Mevcut protokolleri güncelle (Daha önce default 'core' olarak atandığı için kategori null değil)

-- is_core = true olanlar -> 'core' (Zaten core oldular ama garanti olsun)
UPDATE vaccine_protocols
SET category = 'core'
WHERE is_core = true;

-- Risk bazlı olanları manuel işaretle
UPDATE vaccine_protocols
SET category = 'risk_based', risk_group = 'outdoor'
WHERE vaccine_code IN ('DOG_LEPTO_C','DOG_BORDETELLA','CAT_FELV');

-- Yasal zorunlular
UPDATE vaccine_protocols
SET category = 'legal'
WHERE vaccine_code IN ('DOG_RABIES','CAT_RABIES');

-- Geri kalanlar (CAT_FIV vb.) - is_core olmayan ve henüz güncellenmeyenler
UPDATE vaccine_protocols
SET category = 'optional'
WHERE category = 'core' AND is_core = false;

-- vaccine_setup_profiles FK kontrolu 1 dondugu icin kullanicinin talebiyle cikarildi
