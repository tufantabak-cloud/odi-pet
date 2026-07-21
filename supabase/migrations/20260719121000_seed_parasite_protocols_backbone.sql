BEGIN;

-- ==========================================
-- SEED: Parazit Protokol Omurgası (7 protokol)
-- ==========================================
-- Kaynak: odipet_parazit_urun_katalogu_2026.xlsx → PROTOKOL_ESLEME sayfası.
-- 2026-07-19'da service-role importu ile canlıya uygulandı; bu dosya repo-DB
-- eşitliği ve yeni ortam kurulumları içindir (idempotent — kod+tür mevcutsa atlar).
--
-- Notlar:
--  - Protokoller MARKASIZDIR; ticari ürünler parasite_products kataloğundadır.
--  - İç parazit için sayfadaki "0 / ürün tedavidir" değeri DB CHECK'i (>0) ile
--    çelişir; planlama varsayılanı olarak 90 günlük klasik tekrar aralığı
--    kullanıldı. Ürün seçildiğinde süre üründen/tedavi kuralından yürür.
--  - COLLAR_DOG bilinçli olarak EKLENMEDİ: canlıda admin tarafından oluşturulmuş
--    "SERASTO / Dış Parazit Tasması" (dog, collar) protokolü bu rolü görüyor;
--    çift kayıt yaratılmadı. (Öneri: admin panelden markasız bir ada çevirin.)

INSERT INTO public.parasite_protocols
  (parasite_code, protocol_name, parasite_type, species, default_protection_duration_days, allowed_application_methods, default_application_method, min_age_weeks, is_active, sort_order)
SELECT v.code, v.name, v.ptype, v.species, v.days, v.methods, v.def_method, NULL, true, v.sort
FROM (VALUES
  ('INTERNAL_CAT',  'Kedi İç Parazit',               'internal', 'cat', 90,  ARRAY['oral','spot_on']::text[],         'oral',    10),
  ('INTERNAL_DOG',  'Köpek İç Parazit',              'internal', 'dog', 90,  ARRAY['oral']::text[],                   'oral',    11),
  ('EXTERNAL_CAT',  'Kedi Dış Parazit',              'external', 'cat', 30,  ARRAY['spot_on','spray']::text[],        'spot_on', 20),
  ('EXTERNAL_DOG',  'Köpek Dış Parazit',             'external', 'dog', 30,  ARRAY['oral','spot_on','spray']::text[], 'spot_on', 21),
  ('COMBINED_CAT',  'Kedi Kombine (İç+Dış) Parazit', 'combined', 'cat', 30,  ARRAY['spot_on']::text[],                'spot_on', 30),
  ('COMBINED_DOG',  'Köpek Kombine (İç+Dış) Parazit','combined', 'dog', 30,  ARRAY['oral','spot_on']::text[],         'oral',    31),
  ('COLLAR_CAT',    'Kedi Parazit Tasması',          'collar',   'cat', 240, ARRAY['collar']::text[],                 'collar',  40)
) AS v(code, name, ptype, species, days, methods, def_method, sort)
WHERE NOT EXISTS (
  SELECT 1 FROM public.parasite_protocols p
  WHERE p.parasite_code = v.code AND p.species = v.species
);

COMMIT;
