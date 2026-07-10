-- ============================================================
-- KHVHD Aşı Rehberi analizi — eksik protokollerin eklenmesi
--
-- KHVHD (Türkiye) ve WSAVA rehberlerine göre gözden geçirildi.
-- Mevcut vaccine_protocols tablosunda köpek CDV/CPV2/CAV2/CPiV
-- zaten tek satırda (DOG_CDV, "DHPPi" kombine aşı olarak)
-- birleştirilmiş durumda — gerçek üründe de (Nobivac DHPPi vb.)
-- bu antijenler tek şişede satılıyor, bu yüzden ayrı satırlara
-- bölünmedi.
--
-- Eksik olan ve gerçekten ayrı ürün olarak satılan 2 protokol
-- ekleniyor. DOG_CIV eklenmedi (yalnızca ABD'de lisanslı).
-- ============================================================

INSERT INTO public.vaccine_protocols
  (species, vaccine_code, is_core, protocol_name, doses, repeat_frequency, repeat_interval_days, end_condition, notes, is_active, category, risk_group)
VALUES
(
  'dog',
  'DOG_LYME',
  false,
  'Lyme Hastalığı (Borreliosis) Protokolü',
  '[
    {"label": "1. Doz (12. Hafta)", "trigger": "birth", "days_offset": 84, "dose_number": 1},
    {"label": "2. Doz (3 Hafta Sonra)", "trigger": "prev_dose", "days_offset": 21, "dose_number": 2},
    {"label": "Yıllık Booster", "trigger": "prev_dose", "days_offset": 365, "dose_number": 3}
  ]'::jsonb,
  'yearly',
  365,
  '{"type": "indefinite"}'::jsonb,
  'Borrelia burgdorferi''ye karşı koruma sağlar. Kene maruziyeti olan (kırsal, ormanlık, otlak) bölgelerde yaşayan köpekler için önerilir. Türkiye''de rutin core aşı değildir.',
  true,
  'risk_based',
  'outdoor'
),
(
  'cat',
  'CAT_CHLAMYDIA',
  false,
  'Chlamydophila felis Protokolü',
  '[
    {"label": "1. Doz (9. Hafta)", "trigger": "birth", "days_offset": 63, "dose_number": 1},
    {"label": "2. Doz (3-4 Hafta Sonra)", "trigger": "prev_dose", "days_offset": 21, "dose_number": 2},
    {"label": "Yıllık Booster", "trigger": "prev_dose", "days_offset": 365, "dose_number": 3}
  ]'::jsonb,
  'yearly',
  365,
  '{"type": "indefinite"}'::jsonb,
  'Chlamydophila felis konjonktivit/solunum enfeksiyonuna karşı koruma sağlar. Çoklu kedi ortamlarında (barınak, cattery, kalabalık ev) önerilir. Türkiye''de rutin core aşı değildir; bazı kombine ürünlerde (Purevax RCPCh) FVRCP''ye dahil satılır.',
  true,
  'optional',
  null
);
