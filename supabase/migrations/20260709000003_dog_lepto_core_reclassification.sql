-- KHVHD rehberine göre Türkiye'de Leptospira core önerilir.
-- category='core' yeterli değil: generateVaccinationPlan() filtreleme
-- mantığı t.is_core alanına bakıyor (bkz. src/features/pets/vaccination-algorithm.ts),
-- bu yüzden is_core de true'ya çekildi ki otomatik plan üretimine dahil olsun.
UPDATE public.vaccine_protocols
SET category = 'core', is_core = true
WHERE vaccine_code = 'DOG_LEPTO_C';
