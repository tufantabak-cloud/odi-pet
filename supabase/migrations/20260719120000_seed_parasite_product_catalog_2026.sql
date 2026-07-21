BEGIN;

-- ==========================================
-- SEED: Türkiye Parazit Ürün Kataloğu 2026 (92 SKU)
-- ==========================================
-- Kaynak: odipet_parazit_urun_katalogu_2026.xlsx (17.07.2026, TR ruhsat +
-- üretici doğrulamalı). 2026-07-19 tarihinde service-role importu ile canlıya
-- uygulandı; bu dosya repo-DB eşitliği ve yeni ortam kurulumları içindir.
-- Eşlemeler: parasite_type=collar → type=external + method=collar;
-- spot_on → spot-on; süre=0 → TEDAVİ ürünü (kayıt anında protokol süresi kullanılır).
-- Idempotent: marka+ad (case-insensitive) mevcutsa satır atlanır.

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'cat', 'Kedi Spot-on 4 kg altı', 'Advantage', 'external', 'spot-on', 28, 'imidacloprid', 'Hedef: pire; pire larvaları. Aylık pire kontrolü.', 8, false, '[ADVANTAGE_KEDI_SPOT_ON_4_KG_ALTI_CAT_0_4] | Kene ürünü olarak sınıflandırılmamalı; hedef kapsamı pire ağırlıklıdır. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Advantage') AND lower(name) = lower('Kedi Spot-on 4 kg altı'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'cat', 'Kedi Spot-on 4–8 kg', 'Advantage', 'external', 'spot-on', 28, 'imidacloprid', 'Hedef: pire; pire larvaları. Aylık pire kontrolü.', 8, false, '[ADVANTAGE_KEDI_SPOT_ON_4_8_KG_CAT_4_8] | Kene ürünü olarak sınıflandırılmamalı; hedef kapsamı pire ağırlıklıdır. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Advantage') AND lower(name) = lower('Kedi Spot-on 4–8 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'cat', 'Kedi Spot-on 4 kg altı', 'Advantage Multi', 'combined', 'spot-on', 30, 'imidacloprid + moxidectin', 'Hedef: pire; kulak akarı; bazı yuvarlak kurtlar; kalp kurdu korunması. Aylık kombine ürün.', 9, true, '[ADVANTAGE_MULTI_KEDI_SPOT_ON_4_KG_ALTI_CAT_0_4] | Tenya kapsadığı varsayılmamalı; prazikuantel içermez. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Advantage Multi') AND lower(name) = lower('Kedi Spot-on 4 kg altı'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'cat', 'Kedi Spot-on 4–8 kg', 'Advantage Multi', 'combined', 'spot-on', 30, 'imidacloprid + moxidectin', 'Hedef: pire; kulak akarı; bazı yuvarlak kurtlar; kalp kurdu korunması. Aylık kombine ürün.', 9, true, '[ADVANTAGE_MULTI_KEDI_SPOT_ON_4_8_KG_CAT_4_8] | Tenya kapsadığı varsayılmamalı; prazikuantel içermez. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Advantage Multi') AND lower(name) = lower('Kedi Spot-on 4–8 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Spot-on 4 kg altı', 'Advantage Multi', 'combined', 'spot-on', 30, 'imidacloprid + moxidectin', 'Hedef: pire; bazı akarlar; yuvarlak kurtlar; kalp kurdu korunması. Aylık kombine ürün.', 7, true, '[ADVANTAGE_MULTI_KOPEK_SPOT_ON_4_KG_ALTI_DOG_0_4] | Tenya ve kene kapsamı prospektüsten ayrıca doğrulanmalı. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Advantage Multi') AND lower(name) = lower('Köpek Spot-on 4 kg altı'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Spot-on 4–10 kg', 'Advantage Multi', 'combined', 'spot-on', 30, 'imidacloprid + moxidectin', 'Hedef: pire; bazı akarlar; yuvarlak kurtlar; kalp kurdu korunması. Aylık kombine ürün.', 7, true, '[ADVANTAGE_MULTI_KOPEK_SPOT_ON_4_10_KG_DOG_4_10] | Tenya ve kene kapsamı prospektüsten ayrıca doğrulanmalı. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Advantage Multi') AND lower(name) = lower('Köpek Spot-on 4–10 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Spot-on 10–25 kg', 'Advantage Multi', 'combined', 'spot-on', 30, 'imidacloprid + moxidectin', 'Hedef: pire; bazı akarlar; yuvarlak kurtlar; kalp kurdu korunması. Aylık kombine ürün.', 7, true, '[ADVANTAGE_MULTI_KOPEK_SPOT_ON_10_25_KG_DOG_10_25] | Tenya ve kene kapsamı prospektüsten ayrıca doğrulanmalı. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Advantage Multi') AND lower(name) = lower('Köpek Spot-on 10–25 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Spot-on 25–40 kg', 'Advantage Multi', 'combined', 'spot-on', 30, 'imidacloprid + moxidectin', 'Hedef: pire; bazı akarlar; yuvarlak kurtlar; kalp kurdu korunması. Aylık kombine ürün.', 7, true, '[ADVANTAGE_MULTI_KOPEK_SPOT_ON_25_40_KG_DOG_25_40] | Tenya ve kene kapsamı prospektüsten ayrıca doğrulanmalı. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Advantage Multi') AND lower(name) = lower('Köpek Spot-on 25–40 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Spot-on 4 kg altı', 'Advantix', 'external', 'spot-on', 28, 'imidacloprid + permethrin', 'Hedef: pire; kene; sivrisinek; tatarcık; bit. Aylık dış parazit ve kovucu etki.', 7, false, '[ADVANTIX_KOPEK_SPOT_ON_4_KG_ALTI_DOG_0_4] | PERMETRİN İÇERİR: Kedilerde kullanılmaz; uygulanan köpek kuruyana kadar kedilerden ayrılmalıdır. | Doğrulama: TR_OFFICIAL_MANUFACTURER', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Advantix') AND lower(name) = lower('Köpek Spot-on 4 kg altı'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Spot-on 4–10 kg', 'Advantix', 'external', 'spot-on', 28, 'imidacloprid + permethrin', 'Hedef: pire; kene; sivrisinek; tatarcık; bit. Aylık dış parazit ve kovucu etki.', 7, false, '[ADVANTIX_KOPEK_SPOT_ON_4_10_KG_DOG_4_10] | PERMETRİN İÇERİR: Kedilerde kullanılmaz; uygulanan köpek kuruyana kadar kedilerden ayrılmalıdır. | Doğrulama: TR_OFFICIAL_MANUFACTURER', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Advantix') AND lower(name) = lower('Köpek Spot-on 4–10 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Spot-on 10–25 kg', 'Advantix', 'external', 'spot-on', 28, 'imidacloprid + permethrin', 'Hedef: pire; kene; sivrisinek; tatarcık; bit. Aylık dış parazit ve kovucu etki.', 7, false, '[ADVANTIX_KOPEK_SPOT_ON_10_25_KG_DOG_10_25] | PERMETRİN İÇERİR: Kedilerde kullanılmaz; uygulanan köpek kuruyana kadar kedilerden ayrılmalıdır. | Doğrulama: TR_OFFICIAL_MANUFACTURER', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Advantix') AND lower(name) = lower('Köpek Spot-on 10–25 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Spot-on 25–40 kg', 'Advantix', 'external', 'spot-on', 28, 'imidacloprid + permethrin', 'Hedef: pire; kene; sivrisinek; tatarcık; bit. Aylık dış parazit ve kovucu etki.', 7, false, '[ADVANTIX_KOPEK_SPOT_ON_25_40_KG_DOG_25_40] | PERMETRİN İÇERİR: Kedilerde kullanılmaz; uygulanan köpek kuruyana kadar kedilerden ayrılmalıdır. | Doğrulama: TR_OFFICIAL_MANUFACTURER', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Advantix') AND lower(name) = lower('Köpek Spot-on 25–40 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Spot-on 40–60 kg', 'Advantix', 'external', 'spot-on', 28, 'imidacloprid + permethrin', 'Hedef: pire; kene; sivrisinek; tatarcık; bit. Aylık dış parazit ve kovucu etki.', 7, false, '[ADVANTIX_KOPEK_SPOT_ON_40_60_KG_DOG_40_60] | PERMETRİN İÇERİR: Kedilerde kullanılmaz; uygulanan köpek kuruyana kadar kedilerden ayrılmalıdır. | Doğrulama: TR_OFFICIAL_MANUFACTURER', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Advantix') AND lower(name) = lower('Köpek Spot-on 40–60 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'cat', 'Kedi Spot-on 1,2–2,8 kg', 'Bravecto', 'external', 'spot-on', 84, 'fluralaner', 'Hedef: pire; kene. Etiket hedeflerine göre yaklaşık 12 hafta.', 9, false, '[BRAVECTO_KEDI_SPOT_ON_12_28_KG_CAT_12_28] | Kediye uygun pipet kullanılmalı; köpek ürünüyle karıştırılmamalı. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Bravecto') AND lower(name) = lower('Kedi Spot-on 1,2–2,8 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'cat', 'Kedi Spot-on 2,8–6,25 kg', 'Bravecto', 'external', 'spot-on', 84, 'fluralaner', 'Hedef: pire; kene. Etiket hedeflerine göre yaklaşık 12 hafta.', 9, false, '[BRAVECTO_KEDI_SPOT_ON_28_625_KG_CAT_28_625] | Kediye uygun pipet kullanılmalı; köpek ürünüyle karıştırılmamalı. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Bravecto') AND lower(name) = lower('Kedi Spot-on 2,8–6,25 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'cat', 'Kedi Spot-on 6,25–12,5 kg', 'Bravecto', 'external', 'spot-on', 84, 'fluralaner', 'Hedef: pire; kene. Etiket hedeflerine göre yaklaşık 12 hafta.', 9, false, '[BRAVECTO_KEDI_SPOT_ON_625_125_KG_CAT_625_125] | Kediye uygun pipet kullanılmalı; köpek ürünüyle karıştırılmamalı. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Bravecto') AND lower(name) = lower('Kedi Spot-on 6,25–12,5 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 2–4,5 kg', 'Bravecto', 'external', 'oral', 84, 'fluralaner', 'Hedef: pire; kene. Etiket hedeflerine göre yaklaşık 12 hafta.', 8, false, '[BRAVECTO_KOPEK_CIGNEME_TABLETI_2_45_KG_DOG_2_45] | İzoksazolin sınıfı; nörolojik öyküde veteriner değerlendirmesi gerekir. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Bravecto') AND lower(name) = lower('Köpek Çiğneme Tableti 2–4,5 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 4,5–10 kg', 'Bravecto', 'external', 'oral', 84, 'fluralaner', 'Hedef: pire; kene. Etiket hedeflerine göre yaklaşık 12 hafta.', 8, false, '[BRAVECTO_KOPEK_CIGNEME_TABLETI_45_10_KG_DOG_45_10] | İzoksazolin sınıfı; nörolojik öyküde veteriner değerlendirmesi gerekir. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Bravecto') AND lower(name) = lower('Köpek Çiğneme Tableti 4,5–10 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 10–20 kg', 'Bravecto', 'external', 'oral', 84, 'fluralaner', 'Hedef: pire; kene. Etiket hedeflerine göre yaklaşık 12 hafta.', 8, false, '[BRAVECTO_KOPEK_CIGNEME_TABLETI_10_20_KG_DOG_10_20] | İzoksazolin sınıfı; nörolojik öyküde veteriner değerlendirmesi gerekir. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Bravecto') AND lower(name) = lower('Köpek Çiğneme Tableti 10–20 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 20–40 kg', 'Bravecto', 'external', 'oral', 84, 'fluralaner', 'Hedef: pire; kene. Etiket hedeflerine göre yaklaşık 12 hafta.', 8, false, '[BRAVECTO_KOPEK_CIGNEME_TABLETI_20_40_KG_DOG_20_40] | İzoksazolin sınıfı; nörolojik öyküde veteriner değerlendirmesi gerekir. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Bravecto') AND lower(name) = lower('Köpek Çiğneme Tableti 20–40 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 40–56 kg', 'Bravecto', 'external', 'oral', 84, 'fluralaner', 'Hedef: pire; kene. Etiket hedeflerine göre yaklaşık 12 hafta.', 8, false, '[BRAVECTO_KOPEK_CIGNEME_TABLETI_40_56_KG_DOG_40_56] | İzoksazolin sınıfı; nörolojik öyküde veteriner değerlendirmesi gerekir. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Bravecto') AND lower(name) = lower('Köpek Çiğneme Tableti 40–56 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'cat', 'Kedi Spot-on 1,2–2,8 kg', 'Bravecto DuAct', 'combined', 'spot-on', 84, 'fluralaner + moxidectin', 'Hedef: pire; kene; kulak akarı; bazı nematodlar; kalp kurdu korunması. Dış parazit etkisi uzun süreli; iç parazit kapsamı prospektüs hedefleriyle sınırlıdır.', 9, true, '[BRAVECTO_DUACT_KEDI_SPOT_ON_12_28_KG_CAT_12_28] | Tenya kapsadığı varsayılmamalı; prazikuantel içermez. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Bravecto DuAct') AND lower(name) = lower('Kedi Spot-on 1,2–2,8 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'cat', 'Kedi Spot-on 2,8–6,25 kg', 'Bravecto DuAct', 'combined', 'spot-on', 84, 'fluralaner + moxidectin', 'Hedef: pire; kene; kulak akarı; bazı nematodlar; kalp kurdu korunması. Dış parazit etkisi uzun süreli; iç parazit kapsamı prospektüs hedefleriyle sınırlıdır.', 9, true, '[BRAVECTO_DUACT_KEDI_SPOT_ON_28_625_KG_CAT_28_625] | Tenya kapsadığı varsayılmamalı; prazikuantel içermez. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Bravecto DuAct') AND lower(name) = lower('Kedi Spot-on 2,8–6,25 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'cat', 'Kedi Spot-on 6,25–12,5 kg', 'Bravecto DuAct', 'combined', 'spot-on', 84, 'fluralaner + moxidectin', 'Hedef: pire; kene; kulak akarı; bazı nematodlar; kalp kurdu korunması. Dış parazit etkisi uzun süreli; iç parazit kapsamı prospektüs hedefleriyle sınırlıdır.', 9, true, '[BRAVECTO_DUACT_KEDI_SPOT_ON_625_125_KG_CAT_625_125] | Tenya kapsadığı varsayılmamalı; prazikuantel içermez. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Bravecto DuAct') AND lower(name) = lower('Kedi Spot-on 6,25–12,5 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'cat', 'Kedi Spot-on 0,6–2,5 kg', 'Broadline', 'combined', 'spot-on', 30, 'fipronil + (S)-methoprene + eprinomectin + praziquantel', 'Hedef: pire; kene; bit; kulak akarı; yuvarlak kurt; tenya; bazı akciğer kurtları. Aylık geniş spektrumlu kombine ürün.', 7, true, '[BROADLINE_KEDI_SPOT_ON_06_25_KG_CAT_06_25] | Düşük kilolu yavrularda etiket sınırı kesin doğrulanmalı. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Broadline') AND lower(name) = lower('Kedi Spot-on 0,6–2,5 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'cat', 'Kedi Spot-on 2,5–7,5 kg', 'Broadline', 'combined', 'spot-on', 30, 'fipronil + (S)-methoprene + eprinomectin + praziquantel', 'Hedef: pire; kene; bit; kulak akarı; yuvarlak kurt; tenya; bazı akciğer kurtları. Aylık geniş spektrumlu kombine ürün.', 7, true, '[BROADLINE_KEDI_SPOT_ON_25_75_KG_CAT_25_75] | Düşük kilolu yavrularda etiket sınırı kesin doğrulanmalı. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Broadline') AND lower(name) = lower('Kedi Spot-on 2,5–7,5 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'both', '175 mg Oral Tablet', 'Caniverm', 'internal', 'oral', 0, 'fenbendazole + pyrantel embonate + praziquantel', 'Hedef: yuvarlak kurtlar; tenya. Tedavi ürünüdür; kalıcı koruma süresi yoktur. Tedavi ürünüdür; kalıcı koruma süresi yoktur.', NULL, false, '[CANIVERM_175_MG_ORAL_TABLET_BOTH_0_5] | Tablet gücü ve doz tür/kiloya göre değişir; veteriner doğrulaması gerekir. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Caniverm') AND lower(name) = lower('175 mg Oral Tablet'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'both', '700 mg Oral Tablet', 'Caniverm', 'internal', 'oral', 0, 'fenbendazole + pyrantel embonate + praziquantel', 'Hedef: yuvarlak kurtlar; tenya. Tedavi ürünüdür; kalıcı koruma süresi yoktur. Tedavi ürünüdür; kalıcı koruma süresi yoktur.', NULL, false, '[CANIVERM_700_MG_ORAL_TABLET_BOTH_0_10] | Tablet gücü ve doz tür/kiloya göre değişir; veteriner doğrulaması gerekir. | Doğrulama: TR_OFFICIAL_MANUFACTURER', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Caniverm') AND lower(name) = lower('700 mg Oral Tablet'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'cat', 'Cat Tablet', 'Drontal', 'internal', 'oral', 0, 'praziquantel + pyrantel embonate', 'Hedef: yuvarlak kurt; tenya. Tedavi ürünüdür; kalıcı koruma süresi yoktur. Tedavi ürünüdür; kalıcı koruma süresi yoktur.', NULL, false, '[DRONTAL_CAT_TABLET_CAT_0_PLUS] | Türkiye''deki tam ürün adı, doz ve ruhsat durumu HBS''den teyit edilmelidir. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Drontal') AND lower(name) = lower('Cat Tablet'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Dog Tasty 10 kg Tablet', 'Drontal', 'internal', 'oral', 0, 'praziquantel + pyrantel embonate + febantel', 'Hedef: yuvarlak kurt; kancalı kurt; kamçılı kurt; tenya. Tedavi ürünüdür; kalıcı koruma süresi yoktur. Tedavi ürünüdür; kalıcı koruma süresi yoktur.', NULL, false, '[DRONTAL_DOG_TASTY_10_KG_TABLET_DOG_0_10] | Otomatik tekrar günü prospektüsten çıkmaz; risk ve veteriner planına göre belirlenmelidir. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Drontal') AND lower(name) = lower('Dog Tasty 10 kg Tablet'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Dog XL 35 kg Tablet', 'Drontal', 'internal', 'oral', 0, 'praziquantel + pyrantel embonate + febantel', 'Hedef: yuvarlak kurt; kancalı kurt; kamçılı kurt; tenya. Tedavi ürünüdür; kalıcı koruma süresi yoktur. Tedavi ürünüdür; kalıcı koruma süresi yoktur.', NULL, false, '[DRONTAL_DOG_XL_35_KG_TABLET_DOG_10_35] | Otomatik tekrar günü prospektüsten çıkmaz; risk ve veteriner planına göre belirlenmelidir. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Drontal') AND lower(name) = lower('Dog XL 35 kg Tablet'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'both', 'Kedi ve Köpek Oral Tablet', 'Endopet', 'internal', 'oral', 0, 'fenbendazole + pyrantel pamoate + praziquantel', 'Hedef: yuvarlak kurt; kancalı kurt; kamçılı kurt; tenya. Tedavi ürünüdür; kalıcı koruma süresi yoktur. Tedavi ürünüdür; kalıcı koruma süresi yoktur.', NULL, false, '[ENDOPET_KEDI_VE_KOPEK_ORAL_TABLET_BOTH_0_PLUS] | Doz, tür ve canlı ağırlığa göre veterinerce belirlenmelidir. | Doğrulama: TR_OFFICIAL_MANUFACTURER', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Endopet') AND lower(name) = lower('Kedi ve Köpek Oral Tablet'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'cat', 'Kedi 0,5 ml 2–8 kg', 'Fiproes', 'external', 'spot-on', 30, 'fipronil + (S)-methoprene', 'Hedef: pire; kene; pire yumurta/larva/pupa. Pire gelişim evrelerinde yaklaşık 6 hafta; kene için yaklaşık 1 ay.', 8, false, '[FIPROES_KEDI_05_ML_2_8_KG_CAT_2_8] | Uygulama aralığı hedef parazite göre veterinerce belirlenmeli. | Doğrulama: TR_OFFICIAL_MANUFACTURER', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Fiproes') AND lower(name) = lower('Kedi 0,5 ml 2–8 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek 0,67 ml 2–10 kg', 'Fiproes', 'external', 'spot-on', 30, 'fipronil + (S)-methoprene', 'Hedef: pire; kene; ısırıcı bit; pire yumurta/larva/pupa. Pirelerde yaklaşık 2 ay; kenelerde yaklaşık 1 ay. Planlama için kısa hedef esas alındı.', 8, false, '[FIPROES_KOPEK_067_ML_2_10_KG_DOG_2_10] | Akarların eliminasyonu için tekrarlı aylık uygulama gerekebilir. | Doğrulama: TR_OFFICIAL_MANUFACTURER', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Fiproes') AND lower(name) = lower('Köpek 0,67 ml 2–10 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek 1,34 ml 10–20 kg', 'Fiproes', 'external', 'spot-on', 30, 'fipronil + (S)-methoprene', 'Hedef: pire; kene; ısırıcı bit; pire yumurta/larva/pupa. Pirelerde yaklaşık 2 ay; kenelerde yaklaşık 1 ay. Planlama için kısa hedef esas alındı.', 8, false, '[FIPROES_KOPEK_134_ML_10_20_KG_DOG_10_20] | Akarların eliminasyonu için tekrarlı aylık uygulama gerekebilir. | Doğrulama: TR_OFFICIAL_MANUFACTURER', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Fiproes') AND lower(name) = lower('Köpek 1,34 ml 10–20 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek 2,68 ml 20–40 kg', 'Fiproes', 'external', 'spot-on', 30, 'fipronil + (S)-methoprene', 'Hedef: pire; kene; ısırıcı bit; pire yumurta/larva/pupa. Pirelerde yaklaşık 2 ay; kenelerde yaklaşık 1 ay. Planlama için kısa hedef esas alındı.', 8, false, '[FIPROES_KOPEK_268_ML_20_40_KG_DOG_20_40] | Akarların eliminasyonu için tekrarlı aylık uygulama gerekebilir. | Doğrulama: TR_OFFICIAL_MANUFACTURER', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Fiproes') AND lower(name) = lower('Köpek 2,68 ml 20–40 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek 4,02 ml 40–60 kg', 'Fiproes', 'external', 'spot-on', 30, 'fipronil + (S)-methoprene', 'Hedef: pire; kene; ısırıcı bit; pire yumurta/larva/pupa. Pirelerde yaklaşık 2 ay; kenelerde yaklaşık 1 ay. Planlama için kısa hedef esas alındı.', 8, false, '[FIPROES_KOPEK_402_ML_40_60_KG_DOG_40_60] | Akarların eliminasyonu için tekrarlı aylık uygulama gerekebilir. | Doğrulama: TR_OFFICIAL_MANUFACTURER', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Fiproes') AND lower(name) = lower('Köpek 4,02 ml 40–60 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'cat', 'Kedi Spot-on', 'Fiprovet Drop', 'external', 'spot-on', 28, 'fipronil + (S)-methoprene', 'Hedef: pire; kene; pire yumurta/larva/pupa. Pire 4 hafta; gelişim evreleri 6 hafta; kene etkisi yaklaşık 2 hafta.', 8, false, '[FIPROVET_DROP_KEDI_SPOT_ON_CAT_0_PLUS] | Tek bir ''koruma günü'' tüm hedefleri temsil etmez; ayrıntı alanı UI''da gösterilmeli. | Doğrulama: TR_OFFICIAL_MANUFACTURER', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Fiprovet Drop') AND lower(name) = lower('Kedi Spot-on'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek 0,67 ml 2–10 kg', 'Fiprovet Drop', 'external', 'spot-on', 28, 'fipronil + (S)-methoprene', 'Hedef: pire; kene; ısırıcı bit; pire yumurta/larva/pupa. Pire 8 hafta; kene 4 hafta; aylık tekrar tavsiye edilir.', 8, false, '[FIPROVET_DROP_KOPEK_067_ML_2_10_KG_DOG_2_10] | Hedef parazite göre etkinlik süresi değişir. | Doğrulama: TR_OFFICIAL_MANUFACTURER', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Fiprovet Drop') AND lower(name) = lower('Köpek 0,67 ml 2–10 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek 1,34 ml 10–20 kg', 'Fiprovet Drop', 'external', 'spot-on', 28, 'fipronil + (S)-methoprene', 'Hedef: pire; kene; ısırıcı bit; pire yumurta/larva/pupa. Pire 8 hafta; kene 4 hafta; aylık tekrar tavsiye edilir.', 8, false, '[FIPROVET_DROP_KOPEK_134_ML_10_20_KG_DOG_10_20] | Hedef parazite göre etkinlik süresi değişir. | Doğrulama: TR_OFFICIAL_MANUFACTURER', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Fiprovet Drop') AND lower(name) = lower('Köpek 1,34 ml 10–20 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek 2,68 ml 20–40 kg', 'Fiprovet Drop', 'external', 'spot-on', 28, 'fipronil + (S)-methoprene', 'Hedef: pire; kene; ısırıcı bit; pire yumurta/larva/pupa. Pire 8 hafta; kene 4 hafta; aylık tekrar tavsiye edilir.', 8, false, '[FIPROVET_DROP_KOPEK_268_ML_20_40_KG_DOG_20_40] | Hedef parazite göre etkinlik süresi değişir. | Doğrulama: TR_OFFICIAL_MANUFACTURER', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Fiprovet Drop') AND lower(name) = lower('Köpek 2,68 ml 20–40 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek 4,02 ml 40–60 kg', 'Fiprovet Drop', 'external', 'spot-on', 28, 'fipronil + (S)-methoprene', 'Hedef: pire; kene; ısırıcı bit; pire yumurta/larva/pupa. Pire 8 hafta; kene 4 hafta; aylık tekrar tavsiye edilir.', 8, false, '[FIPROVET_DROP_KOPEK_402_ML_40_60_KG_DOG_40_60] | Hedef parazite göre etkinlik süresi değişir. | Doğrulama: TR_OFFICIAL_MANUFACTURER', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Fiprovet Drop') AND lower(name) = lower('Köpek 4,02 ml 40–60 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'both', 'Kedi ve Köpek Sprey', 'Fiprovet Spray', 'external', 'spray', 30, 'fipronil', 'Hedef: pire; kene; bit. Köpekte pire yaklaşık 2 ay/kene 1 ay; kedide pire yaklaşık 5–6 hafta; planlama için 1 ay.', 8, false, '[FIPROVET_SPRAY_KEDI_VE_KOPEK_SPREY_BOTH_0_PLUS] | Doz vücut ağırlığı ve tüy uzunluğuna göre değişir. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Fiprovet Spray') AND lower(name) = lower('Kedi ve Köpek Sprey'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'cat', 'Kedi Spot-on', 'Frontline Combo', 'external', 'spot-on', 30, 'fipronil + (S)-methoprene', 'Hedef: pire; kene; bit; pire yumurta/larva. Aylık dış parazit kontrolü.', 8, false, '[FRONTLINE_COMBO_KEDI_SPOT_ON_CAT_1_PLUS] | Minimum ağırlık ve yaş ülke prospektüsünden doğrulanmalı. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Frontline Combo') AND lower(name) = lower('Kedi Spot-on'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Spot-on S 2–10 kg', 'Frontline Combo', 'external', 'spot-on', 30, 'fipronil + (S)-methoprene', 'Hedef: pire; kene; bit; pire yumurta/larva. Aylık dış parazit kontrolü.', 8, false, '[FRONTLINE_COMBO_KOPEK_SPOT_ON_S_2_10_KG_DOG_2_10] | Kilo aralığına uygun pipet kullanılmalı. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Frontline Combo') AND lower(name) = lower('Köpek Spot-on S 2–10 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Spot-on M 10–20 kg', 'Frontline Combo', 'external', 'spot-on', 30, 'fipronil + (S)-methoprene', 'Hedef: pire; kene; bit; pire yumurta/larva. Aylık dış parazit kontrolü.', 8, false, '[FRONTLINE_COMBO_KOPEK_SPOT_ON_M_10_20_KG_DOG_10_20] | Kilo aralığına uygun pipet kullanılmalı. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Frontline Combo') AND lower(name) = lower('Köpek Spot-on M 10–20 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Spot-on L 20–40 kg', 'Frontline Combo', 'external', 'spot-on', 30, 'fipronil + (S)-methoprene', 'Hedef: pire; kene; bit; pire yumurta/larva. Aylık dış parazit kontrolü.', 8, false, '[FRONTLINE_COMBO_KOPEK_SPOT_ON_L_20_40_KG_DOG_20_40] | Kilo aralığına uygun pipet kullanılmalı. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Frontline Combo') AND lower(name) = lower('Köpek Spot-on L 20–40 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Spot-on XL 40–60 kg', 'Frontline Combo', 'external', 'spot-on', 30, 'fipronil + (S)-methoprene', 'Hedef: pire; kene; bit; pire yumurta/larva. Aylık dış parazit kontrolü.', 8, false, '[FRONTLINE_COMBO_KOPEK_SPOT_ON_XL_40_60_KG_DOG_40_60] | Kilo aralığına uygun pipet kullanılmalı. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Frontline Combo') AND lower(name) = lower('Köpek Spot-on XL 40–60 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Büyük Köpek 66 cm Tasma', 'Kiltix', 'external', 'collar', 210, 'propoxur + flumethrin', 'Hedef: pire; kene. Orta/büyük köpeklerde yaklaşık 7 aya kadar.', NULL, false, '[KILTIX_BUYUK_KOPEK_66_CM_TASMA_DOG_0_PLUS] | Kediler ve yavru yaş sınırı için Türkiye prospektüsü ayrıca doğrulanmalı. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Kiltix') AND lower(name) = lower('Büyük Köpek 66 cm Tasma'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Küçük Köpek 35 cm Tasma', 'Kiltix', 'external', 'collar', 180, 'propoxur + flumethrin', 'Hedef: pire; kene. Küçük köpeklerde yaklaşık 6 ay.', NULL, false, '[KILTIX_KUCUK_KOPEK_35_CM_TASMA_DOG_0_PLUS] | Kediler ve yavru yaş sınırı için Türkiye prospektüsü ayrıca doğrulanmalı. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Kiltix') AND lower(name) = lower('Küçük Köpek 35 cm Tasma'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 2–4 kg', 'NexGard', 'external', 'oral', 30, 'afoxolaner', 'Hedef: pire; kene; bazı akarlar. Aylık dış parazit kontrolü.', 8, false, '[NEXGARD_KOPEK_CIGNEME_TABLETI_2_4_KG_DOG_2_4] | İzoksazolin sınıfı; nörolojik öyküde veteriner değerlendirmesi gerekir. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('NexGard') AND lower(name) = lower('Köpek Çiğneme Tableti 2–4 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 4–10 kg', 'NexGard', 'external', 'oral', 30, 'afoxolaner', 'Hedef: pire; kene; bazı akarlar. Aylık dış parazit kontrolü.', 8, false, '[NEXGARD_KOPEK_CIGNEME_TABLETI_4_10_KG_DOG_4_10] | İzoksazolin sınıfı; nörolojik öyküde veteriner değerlendirmesi gerekir. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('NexGard') AND lower(name) = lower('Köpek Çiğneme Tableti 4–10 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 10–25 kg', 'NexGard', 'external', 'oral', 30, 'afoxolaner', 'Hedef: pire; kene; bazı akarlar. Aylık dış parazit kontrolü.', 8, false, '[NEXGARD_KOPEK_CIGNEME_TABLETI_10_25_KG_DOG_10_25] | İzoksazolin sınıfı; nörolojik öyküde veteriner değerlendirmesi gerekir. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('NexGard') AND lower(name) = lower('Köpek Çiğneme Tableti 10–25 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 25–50 kg', 'NexGard', 'external', 'oral', 30, 'afoxolaner', 'Hedef: pire; kene; bazı akarlar. Aylık dış parazit kontrolü.', 8, false, '[NEXGARD_KOPEK_CIGNEME_TABLETI_25_50_KG_DOG_25_50] | İzoksazolin sınıfı; nörolojik öyküde veteriner değerlendirmesi gerekir. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('NexGard') AND lower(name) = lower('Köpek Çiğneme Tableti 25–50 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'cat', 'Kedi Spot-on 0,8–2,5 kg', 'NexGard Combo', 'combined', 'spot-on', 30, 'esafoxolaner + eprinomectin + praziquantel', 'Hedef: pire; kene; kulak akarı; yuvarlak kurt; tenya; bazı akciğer/mesane kurtları; kalp kurdu korunması. Aylık geniş spektrumlu kombine ürün.', 8, true, '[NEXGARD_COMBO_KEDI_SPOT_ON_08_25_KG_CAT_08_25] | Kilo aralığına uygun pipet kullanılmalı. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('NexGard Combo') AND lower(name) = lower('Kedi Spot-on 0,8–2,5 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'cat', 'Kedi Spot-on 2,5–7,5 kg', 'NexGard Combo', 'combined', 'spot-on', 30, 'esafoxolaner + eprinomectin + praziquantel', 'Hedef: pire; kene; kulak akarı; yuvarlak kurt; tenya; bazı akciğer/mesane kurtları; kalp kurdu korunması. Aylık geniş spektrumlu kombine ürün.', 8, true, '[NEXGARD_COMBO_KEDI_SPOT_ON_25_75_KG_CAT_25_75] | Kilo aralığına uygun pipet kullanılmalı. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('NexGard Combo') AND lower(name) = lower('Kedi Spot-on 2,5–7,5 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 1,5–3,5 kg', 'NexGard Spectra', 'combined', 'oral', 30, 'afoxolaner + milbemycin oxime', 'Hedef: pire; kene; yuvarlak kurtlar; bazı diğer nematodlar; kalp kurdu korunması. Aylık kombine ürün.', 8, false, '[NEXGARD_SPECTRA_KOPEK_CIGNEME_TABLETI_15_35_KG_DOG_15_35] | Tenya kapsamı ürün/prospektüs ülke versiyonuna göre doğrulanmalı; prazikuantel içermez. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('NexGard Spectra') AND lower(name) = lower('Köpek Çiğneme Tableti 1,5–3,5 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 3,5–7,5 kg', 'NexGard Spectra', 'combined', 'oral', 30, 'afoxolaner + milbemycin oxime', 'Hedef: pire; kene; yuvarlak kurtlar; bazı diğer nematodlar; kalp kurdu korunması. Aylık kombine ürün.', 8, false, '[NEXGARD_SPECTRA_KOPEK_CIGNEME_TABLETI_35_75_KG_DOG_35_75] | Tenya kapsamı ürün/prospektüs ülke versiyonuna göre doğrulanmalı; prazikuantel içermez. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('NexGard Spectra') AND lower(name) = lower('Köpek Çiğneme Tableti 3,5–7,5 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 7,5–15 kg', 'NexGard Spectra', 'combined', 'oral', 30, 'afoxolaner + milbemycin oxime', 'Hedef: pire; kene; yuvarlak kurtlar; bazı diğer nematodlar; kalp kurdu korunması. Aylık kombine ürün.', 8, false, '[NEXGARD_SPECTRA_KOPEK_CIGNEME_TABLETI_75_15_KG_DOG_75_15] | Tenya kapsamı ürün/prospektüs ülke versiyonuna göre doğrulanmalı; prazikuantel içermez. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('NexGard Spectra') AND lower(name) = lower('Köpek Çiğneme Tableti 7,5–15 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 15–30 kg', 'NexGard Spectra', 'combined', 'oral', 30, 'afoxolaner + milbemycin oxime', 'Hedef: pire; kene; yuvarlak kurtlar; bazı diğer nematodlar; kalp kurdu korunması. Aylık kombine ürün.', 8, false, '[NEXGARD_SPECTRA_KOPEK_CIGNEME_TABLETI_15_30_KG_DOG_15_30] | Tenya kapsamı ürün/prospektüs ülke versiyonuna göre doğrulanmalı; prazikuantel içermez. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('NexGard Spectra') AND lower(name) = lower('Köpek Çiğneme Tableti 15–30 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 30–60 kg', 'NexGard Spectra', 'combined', 'oral', 30, 'afoxolaner + milbemycin oxime', 'Hedef: pire; kene; yuvarlak kurtlar; bazı diğer nematodlar; kalp kurdu korunması. Aylık kombine ürün.', 8, false, '[NEXGARD_SPECTRA_KOPEK_CIGNEME_TABLETI_30_60_KG_DOG_30_60] | Tenya kapsamı ürün/prospektüs ülke versiyonuna göre doğrulanmalı; prazikuantel içermez. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('NexGard Spectra') AND lower(name) = lower('Köpek Çiğneme Tableti 30–60 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'cat', 'Kedi Spot-on 0,5–2,5 kg', 'Profender', 'internal', 'spot-on', 0, 'emodepside + praziquantel', 'Hedef: yuvarlak kurtlar; tenya. Topikal iç parazit tedavi ürünüdür; kalıcı koruma süresi yoktur. Tedavi ürünüdür; kalıcı koruma süresi yoktur.', 8, false, '[PROFENDER_KEDI_SPOT_ON_05_25_KG_CAT_05_25] | Pire/kene ürünü değildir; external veya combined olarak sınıflandırılmamalı. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Profender') AND lower(name) = lower('Kedi Spot-on 0,5–2,5 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'cat', 'Kedi Spot-on 2,5–5 kg', 'Profender', 'internal', 'spot-on', 0, 'emodepside + praziquantel', 'Hedef: yuvarlak kurtlar; tenya. Topikal iç parazit tedavi ürünüdür; kalıcı koruma süresi yoktur. Tedavi ürünüdür; kalıcı koruma süresi yoktur.', 8, false, '[PROFENDER_KEDI_SPOT_ON_25_5_KG_CAT_25_5] | Pire/kene ürünü değildir; external veya combined olarak sınıflandırılmamalı. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Profender') AND lower(name) = lower('Kedi Spot-on 2,5–5 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'cat', 'Kedi Spot-on 5–8 kg', 'Profender', 'internal', 'spot-on', 0, 'emodepside + praziquantel', 'Hedef: yuvarlak kurtlar; tenya. Topikal iç parazit tedavi ürünüdür; kalıcı koruma süresi yoktur. Tedavi ürünüdür; kalıcı koruma süresi yoktur.', 8, false, '[PROFENDER_KEDI_SPOT_ON_5_8_KG_CAT_5_8] | Pire/kene ürünü değildir; external veya combined olarak sınıflandırılmamalı. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Profender') AND lower(name) = lower('Kedi Spot-on 5–8 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Büyük Köpek 65 cm İlaçlı Tasma', 'Scalibor', 'external', 'collar', 180, 'deltamethrin', 'Hedef: kene; pire; sivrisinek; kum sineği/tatarcık. Kene 6 ay; pire 4 ay; sivrisinek 6 ay; kum sineğinde etiket bilgisi daha uzun olabilir.', 7, false, '[SCALIBOR_BUYUK_KOPEK_65_CM_ILACLI_TASMA_DOG_0_PLUS] | Kedilerde kullanılmaz. Planlama için 6 aylık değişim seçildi; hedefe göre ayrıntı gösterilmeli. | Doğrulama: TR_OFFICIAL_MANUFACTURER', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Scalibor') AND lower(name) = lower('Büyük Köpek 65 cm İlaçlı Tasma'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Küçük/Orta Köpek 48 cm İlaçlı Tasma', 'Scalibor', 'external', 'collar', 180, 'deltamethrin', 'Hedef: kene; pire; sivrisinek; kum sineği/tatarcık. Kene 6 ay; pire 4 ay; sivrisinek 6 ay; kum sineğinde etiket bilgisi daha uzun olabilir.', 7, false, '[SCALIBOR_KUCUK_ORTA_KOPEK_48_CM_ILACLI_TASMA_DOG_0_PLUS] | Kedilerde kullanılmaz. Planlama için 6 aylık değişim seçildi; hedefe göre ayrıntı gösterilmeli. | Doğrulama: TR_OFFICIAL_MANUFACTURER', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Scalibor') AND lower(name) = lower('Küçük/Orta Köpek 48 cm İlaçlı Tasma'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'both', '38 cm Kedi / 8 kg altı Köpek Tasması', 'Seresto', 'external', 'collar', 240, 'imidacloprid + flumethrin', 'Hedef: pire; kene; bazı tatarcıklar. Pire için 7–8 ay; kene için yaklaşık 8 ay.', 7, false, '[SERESTO_38_CM_KEDI_8_KG_ALTI_KOPEK_TASMASI_BOTH_0_8] | Kedi ve küçük köpek ambalajı ile büyük köpek ambalajı karıştırılmamalı. | Doğrulama: TR_OFFICIAL_MANUFACTURER', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Seresto') AND lower(name) = lower('38 cm Kedi / 8 kg altı Köpek Tasması'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', '70 cm 8 kg üstü Köpek Tasması', 'Seresto', 'external', 'collar', 240, 'imidacloprid + flumethrin', 'Hedef: pire; kene; bazı tatarcıklar. Pire için 7–8 ay; kene için yaklaşık 8 ay.', 7, false, '[SERESTO_70_CM_8_KG_USTU_KOPEK_TASMASI_DOG_8_PLUS] | Doğru boy kullanılmalı; sahte ürün riski nedeniyle seri/ruhsat doğrulaması yapılmalı. | Doğrulama: TR_OFFICIAL_MANUFACTURER', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Seresto') AND lower(name) = lower('70 cm 8 kg üstü Köpek Tasması'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 1,3–2,5 kg', 'Simparica', 'external', 'oral', 35, 'sarolaner', 'Hedef: pire; kene; bazı akarlar. Pirelerde yaklaşık 5 hafta; çoğu plan aylık tekrarlanır.', 8, false, '[SIMPARICA_KOPEK_CIGNEME_TABLETI_13_25_KG_DOG_13_25] | İzoksazolin sınıfı; nörolojik öyküde veteriner değerlendirmesi gerekir. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Simparica') AND lower(name) = lower('Köpek Çiğneme Tableti 1,3–2,5 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 2,5–5 kg', 'Simparica', 'external', 'oral', 35, 'sarolaner', 'Hedef: pire; kene; bazı akarlar. Pirelerde yaklaşık 5 hafta; çoğu plan aylık tekrarlanır.', 8, false, '[SIMPARICA_KOPEK_CIGNEME_TABLETI_25_5_KG_DOG_25_5] | İzoksazolin sınıfı; nörolojik öyküde veteriner değerlendirmesi gerekir. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Simparica') AND lower(name) = lower('Köpek Çiğneme Tableti 2,5–5 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 5–10 kg', 'Simparica', 'external', 'oral', 35, 'sarolaner', 'Hedef: pire; kene; bazı akarlar. Pirelerde yaklaşık 5 hafta; çoğu plan aylık tekrarlanır.', 8, false, '[SIMPARICA_KOPEK_CIGNEME_TABLETI_5_10_KG_DOG_5_10] | İzoksazolin sınıfı; nörolojik öyküde veteriner değerlendirmesi gerekir. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Simparica') AND lower(name) = lower('Köpek Çiğneme Tableti 5–10 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 10–20 kg', 'Simparica', 'external', 'oral', 35, 'sarolaner', 'Hedef: pire; kene; bazı akarlar. Pirelerde yaklaşık 5 hafta; çoğu plan aylık tekrarlanır.', 8, false, '[SIMPARICA_KOPEK_CIGNEME_TABLETI_10_20_KG_DOG_10_20] | İzoksazolin sınıfı; nörolojik öyküde veteriner değerlendirmesi gerekir. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Simparica') AND lower(name) = lower('Köpek Çiğneme Tableti 10–20 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 20–40 kg', 'Simparica', 'external', 'oral', 35, 'sarolaner', 'Hedef: pire; kene; bazı akarlar. Pirelerde yaklaşık 5 hafta; çoğu plan aylık tekrarlanır.', 8, false, '[SIMPARICA_KOPEK_CIGNEME_TABLETI_20_40_KG_DOG_20_40] | İzoksazolin sınıfı; nörolojik öyküde veteriner değerlendirmesi gerekir. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Simparica') AND lower(name) = lower('Köpek Çiğneme Tableti 20–40 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 40–60 kg', 'Simparica', 'external', 'oral', 35, 'sarolaner', 'Hedef: pire; kene; bazı akarlar. Pirelerde yaklaşık 5 hafta; çoğu plan aylık tekrarlanır.', 8, false, '[SIMPARICA_KOPEK_CIGNEME_TABLETI_40_60_KG_DOG_40_60] | İzoksazolin sınıfı; nörolojik öyküde veteriner değerlendirmesi gerekir. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Simparica') AND lower(name) = lower('Köpek Çiğneme Tableti 40–60 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 1,25–2,5 kg', 'Simparica Trio', 'combined', 'oral', 30, 'sarolaner + moxidectin + pyrantel embonate', 'Hedef: pire; kene; yuvarlak kurt; kancalı kurt; kalp kurdu korunması. Aylık kombine ürün.', 8, false, '[SIMPARICA_TRIO_KOPEK_CIGNEME_TABLETI_125_25_KG_DOG_125_25] | Tenya kapsadığı varsayılmamalı; prazikuantel içermez. Türkiye ruhsatı HBS''de tek tek teyit edilmeli. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Simparica Trio') AND lower(name) = lower('Köpek Çiğneme Tableti 1,25–2,5 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 2,5–5 kg', 'Simparica Trio', 'combined', 'oral', 30, 'sarolaner + moxidectin + pyrantel embonate', 'Hedef: pire; kene; yuvarlak kurt; kancalı kurt; kalp kurdu korunması. Aylık kombine ürün.', 8, false, '[SIMPARICA_TRIO_KOPEK_CIGNEME_TABLETI_25_5_KG_DOG_25_5] | Tenya kapsadığı varsayılmamalı; prazikuantel içermez. Türkiye ruhsatı HBS''de tek tek teyit edilmeli. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Simparica Trio') AND lower(name) = lower('Köpek Çiğneme Tableti 2,5–5 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 5–10 kg', 'Simparica Trio', 'combined', 'oral', 30, 'sarolaner + moxidectin + pyrantel embonate', 'Hedef: pire; kene; yuvarlak kurt; kancalı kurt; kalp kurdu korunması. Aylık kombine ürün.', 8, false, '[SIMPARICA_TRIO_KOPEK_CIGNEME_TABLETI_5_10_KG_DOG_5_10] | Tenya kapsadığı varsayılmamalı; prazikuantel içermez. Türkiye ruhsatı HBS''de tek tek teyit edilmeli. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Simparica Trio') AND lower(name) = lower('Köpek Çiğneme Tableti 5–10 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 10–20 kg', 'Simparica Trio', 'combined', 'oral', 30, 'sarolaner + moxidectin + pyrantel embonate', 'Hedef: pire; kene; yuvarlak kurt; kancalı kurt; kalp kurdu korunması. Aylık kombine ürün.', 8, false, '[SIMPARICA_TRIO_KOPEK_CIGNEME_TABLETI_10_20_KG_DOG_10_20] | Tenya kapsadığı varsayılmamalı; prazikuantel içermez. Türkiye ruhsatı HBS''de tek tek teyit edilmeli. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Simparica Trio') AND lower(name) = lower('Köpek Çiğneme Tableti 10–20 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 20–40 kg', 'Simparica Trio', 'combined', 'oral', 30, 'sarolaner + moxidectin + pyrantel embonate', 'Hedef: pire; kene; yuvarlak kurt; kancalı kurt; kalp kurdu korunması. Aylık kombine ürün.', 8, false, '[SIMPARICA_TRIO_KOPEK_CIGNEME_TABLETI_20_40_KG_DOG_20_40] | Tenya kapsadığı varsayılmamalı; prazikuantel içermez. Türkiye ruhsatı HBS''de tek tek teyit edilmeli. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Simparica Trio') AND lower(name) = lower('Köpek Çiğneme Tableti 20–40 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Çiğneme Tableti 40–60 kg', 'Simparica Trio', 'combined', 'oral', 30, 'sarolaner + moxidectin + pyrantel embonate', 'Hedef: pire; kene; yuvarlak kurt; kancalı kurt; kalp kurdu korunması. Aylık kombine ürün.', 8, false, '[SIMPARICA_TRIO_KOPEK_CIGNEME_TABLETI_40_60_KG_DOG_40_60] | Tenya kapsadığı varsayılmamalı; prazikuantel içermez. Türkiye ruhsatı HBS''de tek tek teyit edilmeli. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Simparica Trio') AND lower(name) = lower('Köpek Çiğneme Tableti 40–60 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'cat', 'Kedi Spot-on 15 mg 2,5 kg altı', 'Stronghold', 'combined', 'spot-on', 30, 'selamectin', 'Hedef: pire; kulak akarı; bazı yuvarlak kurtlar; kalp kurdu korunması. Aylık kombine ürün.', 6, true, '[STRONGHOLD_KEDI_SPOT_ON_15_MG_25_KG_ALTI_CAT_01_25] | Tenya ve kene kapsamı varsayılmamalı; ülke prospektüsü kontrol edilmeli. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Stronghold') AND lower(name) = lower('Kedi Spot-on 15 mg 2,5 kg altı'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'cat', 'Kedi Spot-on 45 mg 2,6–7,5 kg', 'Stronghold', 'combined', 'spot-on', 30, 'selamectin', 'Hedef: pire; kulak akarı; bazı yuvarlak kurtlar; kalp kurdu korunması. Aylık kombine ürün.', 6, true, '[STRONGHOLD_KEDI_SPOT_ON_45_MG_26_75_KG_CAT_26_75] | Tenya ve kene kapsamı varsayılmamalı; ülke prospektüsü kontrol edilmeli. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Stronghold') AND lower(name) = lower('Kedi Spot-on 45 mg 2,6–7,5 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Spot-on 30 mg 2,6–5 kg', 'Stronghold', 'combined', 'spot-on', 30, 'selamectin', 'Hedef: pire; kulak akarı; bazı akarlar; bazı yuvarlak kurtlar; kalp kurdu korunması. Aylık kombine ürün.', 6, true, '[STRONGHOLD_KOPEK_SPOT_ON_30_MG_26_5_KG_DOG_26_5] | Kene ve tenya kapsamı varsayılmamalı; ülke prospektüsü kontrol edilmeli. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Stronghold') AND lower(name) = lower('Köpek Spot-on 30 mg 2,6–5 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Spot-on 60 mg 5,1–10 kg', 'Stronghold', 'combined', 'spot-on', 30, 'selamectin', 'Hedef: pire; kulak akarı; bazı akarlar; bazı yuvarlak kurtlar; kalp kurdu korunması. Aylık kombine ürün.', 6, true, '[STRONGHOLD_KOPEK_SPOT_ON_60_MG_51_10_KG_DOG_51_10] | Kene ve tenya kapsamı varsayılmamalı; ülke prospektüsü kontrol edilmeli. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Stronghold') AND lower(name) = lower('Köpek Spot-on 60 mg 5,1–10 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Spot-on 120 mg 10,1–20 kg', 'Stronghold', 'combined', 'spot-on', 30, 'selamectin', 'Hedef: pire; kulak akarı; bazı akarlar; bazı yuvarlak kurtlar; kalp kurdu korunması. Aylık kombine ürün.', 6, true, '[STRONGHOLD_KOPEK_SPOT_ON_120_MG_101_20_KG_DOG_101_20] | Kene ve tenya kapsamı varsayılmamalı; ülke prospektüsü kontrol edilmeli. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Stronghold') AND lower(name) = lower('Köpek Spot-on 120 mg 10,1–20 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Spot-on 240 mg 20,1–40 kg', 'Stronghold', 'combined', 'spot-on', 30, 'selamectin', 'Hedef: pire; kulak akarı; bazı akarlar; bazı yuvarlak kurtlar; kalp kurdu korunması. Aylık kombine ürün.', 6, true, '[STRONGHOLD_KOPEK_SPOT_ON_240_MG_201_40_KG_DOG_201_40] | Kene ve tenya kapsamı varsayılmamalı; ülke prospektüsü kontrol edilmeli. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Stronghold') AND lower(name) = lower('Köpek Spot-on 240 mg 20,1–40 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'both', 'Kedi ve Köpek Oral Tablet', 'Tenizol', 'internal', 'oral', 0, 'praziquantel + fenbendazole', 'Hedef: yuvarlak kurtlar; tenya. Tedavi ürünüdür; kalıcı koruma süresi yoktur. Tedavi ürünüdür; kalıcı koruma süresi yoktur.', NULL, false, '[TENIZOL_KEDI_VE_KOPEK_ORAL_TABLET_BOTH_0_PLUS] | Doz, tür ve canlı ağırlığa göre veterinerce belirlenmelidir. | Doğrulama: TR_OFFICIAL_MANUFACTURER', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Tenizol') AND lower(name) = lower('Kedi ve Köpek Oral Tablet'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Spot-on 1,5–4 kg', 'Vectra 3D', 'external', 'spot-on', 28, 'dinotefuran + pyriproxyfen + permethrin', 'Hedef: pire; kene; sivrisinek; tatarcık; ahır sineği. Pire/kene için yaklaşık 1 ay; bazı kene türlerinde 3 hafta.', 7, false, '[VECTRA_3D_KOPEK_SPOT_ON_15_4_KG_DOG_15_4] | PERMETRİN İÇERİR: Kedilerde kullanılmaz; uygulanan köpek kuruyana kadar kedilerden ayrılmalıdır. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Vectra 3D') AND lower(name) = lower('Köpek Spot-on 1,5–4 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Spot-on 4–10 kg', 'Vectra 3D', 'external', 'spot-on', 28, 'dinotefuran + pyriproxyfen + permethrin', 'Hedef: pire; kene; sivrisinek; tatarcık; ahır sineği. Pire/kene için yaklaşık 1 ay; bazı kene türlerinde 3 hafta.', 7, false, '[VECTRA_3D_KOPEK_SPOT_ON_4_10_KG_DOG_4_10] | PERMETRİN İÇERİR: Kedilerde kullanılmaz; uygulanan köpek kuruyana kadar kedilerden ayrılmalıdır. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Vectra 3D') AND lower(name) = lower('Köpek Spot-on 4–10 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Spot-on 10–25 kg', 'Vectra 3D', 'external', 'spot-on', 28, 'dinotefuran + pyriproxyfen + permethrin', 'Hedef: pire; kene; sivrisinek; tatarcık; ahır sineği. Pire/kene için yaklaşık 1 ay; bazı kene türlerinde 3 hafta.', 7, false, '[VECTRA_3D_KOPEK_SPOT_ON_10_25_KG_DOG_10_25] | PERMETRİN İÇERİR: Kedilerde kullanılmaz; uygulanan köpek kuruyana kadar kedilerden ayrılmalıdır. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Vectra 3D') AND lower(name) = lower('Köpek Spot-on 10–25 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Spot-on 25–40 kg', 'Vectra 3D', 'external', 'spot-on', 28, 'dinotefuran + pyriproxyfen + permethrin', 'Hedef: pire; kene; sivrisinek; tatarcık; ahır sineği. Pire/kene için yaklaşık 1 ay; bazı kene türlerinde 3 hafta.', 7, false, '[VECTRA_3D_KOPEK_SPOT_ON_25_40_KG_DOG_25_40] | PERMETRİN İÇERİR: Kedilerde kullanılmaz; uygulanan köpek kuruyana kadar kedilerden ayrılmalıdır. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Vectra 3D') AND lower(name) = lower('Köpek Spot-on 25–40 kg'));

INSERT INTO public.parasite_products (species, name, brand, type, application_method, protection_duration_days, active_ingredient, description, min_age_weeks, covers_ear_mites, notes, image_url, is_active)
SELECT 'dog', 'Köpek Spot-on 40 kg üstü', 'Vectra 3D', 'external', 'spot-on', 28, 'dinotefuran + pyriproxyfen + permethrin', 'Hedef: pire; kene; sivrisinek; tatarcık; ahır sineği. Pire/kene için yaklaşık 1 ay; bazı kene türlerinde 3 hafta.', 7, false, '[VECTRA_3D_KOPEK_SPOT_ON_40_KG_USTU_DOG_40_PLUS] | PERMETRİN İÇERİR: Kedilerde kullanılmaz; uygulanan köpek kuruyana kadar kedilerden ayrılmalıdır. | Doğrulama: TR_MARKET_OBSERVED_RECHECK_HBS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM public.parasite_products WHERE lower(brand) = lower('Vectra 3D') AND lower(name) = lower('Köpek Spot-on 40 kg üstü'));

-- 2026 kataloğu öncesi jenerik seed ürünleri pasife alınır (soft — geçmiş
-- kayıtlar ve FK bağları korunur; admin panelden tek tıkla geri alınabilir).
UPDATE public.parasite_products SET is_active = false
WHERE is_active = true AND (brand, name) IN (('Boehringer Ingelheim', 'NexGard'), ('MSD Animal Health', 'Bravecto Tablet'), ('Zoetis', 'Simparica'), ('Boehringer Ingelheim', 'Frontline Combo Köpek'), ('Bayer/Elanco', 'Seresto Köpek Tasması'), ('MSD Animal Health', 'Scalibor Tasma'), ('Elanco', 'Milbemax Köpek'), ('Bayer/Elanco', 'Drontal Plus'), ('Bioveta', 'Caniverm'), ('Bayer/Elanco', 'Advocate Köpek'), ('Boehringer Ingelheim', 'NexGard Spectra'), ('Zoetis', 'Revolution Köpek'), ('Boehringer Ingelheim', 'Frontline Combo Kedi'), ('Bayer/Elanco', 'Advantage Kedi'), ('Bayer/Elanco', 'Seresto Kedi Tasması'), ('Elanco', 'Milbemax Kedi'), ('Bayer/Elanco', 'Drontal Kedi'), ('Bayer/Elanco', 'Profender Kedi'), ('Bayer/Elanco', 'Advocate Kedi'), ('Zoetis', 'Revolution Kedi'), ('Boehringer Ingelheim', 'Broadline Kedi'), ('Elanco', 'Credelio'), ('MSD Animal Health', 'Bravecto Plus Köpek'), ('Ceva', 'Vectra 3D'), ('Bayer/Elanco', 'Advantix Köpek'), ('Virbac', 'Milpro Köpek'), ('Zoetis', 'Simparica'), ('Elanco', 'Capstar Köpek'), ('Elanco', 'Credelio Cat'), ('MSD Animal Health', 'Bravecto Plus Kedi'), ('Virbac', 'Milpro Kedi'), ('Ceva', 'Vectra Felis'), ('Elanco', 'Capstar Kedi'), ('Zoetis', 'Revolution Plus Kedi'), ('Virbac', 'Interceptor'), ('Bayer/Elanco', 'Drontal'), ('MSD Animal Health', 'Bravecto Spot-On Köpek'), ('Zoetis', 'Simparica Trio'), ('MSD Animal Health', 'Bravecto Spot-On Kedi'));

COMMIT;