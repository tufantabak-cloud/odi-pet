-- 1. `code` sütununu ekleyelim (eğer yoksa)
ALTER TABLE public.vaccines ADD COLUMN IF NOT EXISTS code TEXT;

-- Aynı kodun veya isim-tür kombinasyonunun tekrarlanmaması için:
-- (Varsa eski unique kısıtlamayı kaldırıp yeniden ekleyebiliriz ama şimdilik sadece eski verileri silelim)

-- 2. Eski (legacy) verileri temizleyelim (tüm aşı ve evcil hayvan kayıtları zaten silinmişti, bu nedenle güvenlidir)
DELETE FROM public.vaccines;

-- 3. Yeni "Akıllı Asistan" uyumlu statik aşı listesini (vaccineCatalog.ts baz alınarak) ekleyelim
INSERT INTO public.vaccines (id, code, name, species, is_core, description) VALUES
(gen_random_uuid(), 'DOG_GENERIC', 'Generic Vaccination', 'Köpek', true, 'Genel Aşılama / Rutin Aşılar'),
(gen_random_uuid(), 'DOG_CDV', 'Canine Distemper', 'Köpek', true, 'Gençlik Hastalığı (CDV)'),
(gen_random_uuid(), 'DOG_CAV1', 'Canine Adenovirus Type 1 (CAV-1) [Hepatitis]', 'Köpek', true, 'Köpek Hepatiti (CAV-1)'),
(gen_random_uuid(), 'DOG_RABIES', 'Rabies', 'Köpek', true, 'Kuduz (RV)'),
(gen_random_uuid(), 'DOG_MEASLES', 'Measles', 'Köpek', true, 'Kızamık'),
(gen_random_uuid(), 'DOG_CPV', 'Parvovirus', 'Köpek', true, 'Kanlı İshal (CPV)'),
(gen_random_uuid(), 'DOG_CAV2', 'Canine Adenovirus-2 (CAV-2)', 'Köpek', true, 'Köpek Adenovirüsü Tip 2 / Solunum Yolu'),
(gen_random_uuid(), 'DOG_CPIV', 'Parainfluenza', 'Köpek', true, 'Köpek Parainfluenzası (CPiV)'),
(gen_random_uuid(), 'DOG_BORRELIA', 'Borrelia burgdorferi', 'Köpek', false, 'Lyme Hastalığı Bakterisi'),
(gen_random_uuid(), 'DOG_BORDETELLA', 'Bordetella bronchiseptica [kennel cough]', 'Köpek', false, 'Barınak Öksürüğü'),
(gen_random_uuid(), 'DOG_LEPTO_C', 'Leptospirosis canicola', 'Köpek', false, 'Leptospira Canicola Suşu'),
(gen_random_uuid(), 'DOG_LEPTO_I', 'Leptospirosis icterohaemorrhagiae', 'Köpek', false, 'Leptospira Icterohaemorrhagiae Suşu'),
(gen_random_uuid(), 'DOG_CCV', 'Coronavirus', 'Köpek', false, 'Köpek Koronavirüsü'),
(gen_random_uuid(), 'DOG_LEISH', 'Canine Leishmaniosis', 'Köpek', false, 'Şark Çıbanı / Leşmanya'),
(gen_random_uuid(), 'DOG_LYME', 'Lyme', 'Köpek', false, 'Lyme Hastalığı'),

(gen_random_uuid(), 'CAT_FPV', 'Feline Panleukopenia', 'Kedi', true, 'Kedi Gençlik Hastalığı / Kanlı İshal (FPV)'),
(gen_random_uuid(), 'CAT_FHV1', 'Feline Herpesvirus Type 1 [Rhinotracheitis]', 'Kedi', true, 'Kedi Nezlesi / Üst Solunum Yolu (FHV-1)'),
(gen_random_uuid(), 'CAT_FCV', 'Feline Calicivirus', 'Kedi', true, 'Kedi Kalisivirüsü / Ağız İçi Yaralar (FCV)'),
(gen_random_uuid(), 'CAT_RABIES', 'Rabies', 'Kedi', true, 'Kuduz (RV)'),
(gen_random_uuid(), 'CAT_FELV', 'Feline Leukemia Virus', 'Kedi', false, 'Kedi Lösemisi (FeLV)'),
(gen_random_uuid(), 'CAT_CHLAMYDIA', 'Chlamydia felis', 'Kedi', false, 'Kedi Klamidya Enfeksiyonu (Chlamydia)'),
(gen_random_uuid(), 'CAT_BORDETELLA', 'Bordetella bronchiseptica', 'Kedi', false, 'Kedi Solunum Yolu Bakterisi'),
(gen_random_uuid(), 'CAT_FIV', 'Feline Immunodeficiency Virus', 'Kedi', false, 'Kedi AIDS''i (FIV)'),
(gen_random_uuid(), 'CAT_FIP', 'Feline Infectious Peritonitis', 'Kedi', false, 'FIP Aşısı');

-- Eklenen 'code' sütununun benzersiz (unique) olduğundan emin olmak için:
ALTER TABLE public.vaccines ADD CONSTRAINT vaccines_code_key UNIQUE (code);
