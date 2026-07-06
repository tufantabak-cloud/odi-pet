-- ============================================================
-- OdiPet — Faz 2 Seed Güncellemesi (brand_name versiyonu)
-- Migration: 20260705000003_vaccine_brands_clinical_seed.sql
-- Tarih: 5 Temmuz 2026
-- Açıklama: vaccine_brands tablosuna is_live_vaccine ve
--           administration_route değerleri brand_name
--           üzerinden atanıyor.
-- Antigravity onayı: A4, A5 kural motoru gereksinimi.
-- ============================================================

-- ============================================================
-- KÖPEK AŞILARI
-- ============================================================

-- DHPPi / Karma — MLV, parenteral SC
UPDATE public.vaccine_brands SET
  is_live_vaccine      = true,
  administration_route = 'parenteral_sc'
WHERE brand_name IN (
  'Nobivac DHPPi',
  'Versaguard Plus',
  'Eurican DHPPi',
  'Canigen DHPPi',
  'Canigen DHPPi/L'
);

-- Leptospiroz — inaktive, parenteral SC (2 doz — B2)
UPDATE public.vaccine_brands SET
  is_live_vaccine      = false,
  administration_route = 'parenteral_sc'
WHERE brand_name IN (
  'Nobivac Lepto 2',
  'Nobivac Lepto 4',
  'Versaguard Lepto'
);

-- Kuduz köpek — inaktive, parenteral IM (TR yasal)
UPDATE public.vaccine_brands SET
  is_live_vaccine      = false,
  administration_route = 'parenteral_im'
WHERE brand_name IN (
  'Nobivac Rabies',
  'Rabisin',
  'Defensor 3',
  'Quantum Rabies'
);

-- Bordetella intranasal — MLV, intranasal (1 doz — A5 KRİTİK)
UPDATE public.vaccine_brands SET
  is_live_vaccine      = true,
  administration_route = 'intranasal'
WHERE brand_name IN (
  'Nobivac KC',
  'Bronchicine CAe'
);

-- Leishmania — inaktive, parenteral SC
UPDATE public.vaccine_brands SET
  is_live_vaccine      = false,
  administration_route = 'parenteral_sc'
WHERE brand_name IN (
  'CaniLeish',
  'Letifend'
);

-- Lyme — inaktive, parenteral SC
UPDATE public.vaccine_brands SET
  is_live_vaccine      = false,
  administration_route = 'parenteral_sc'
WHERE brand_name IN (
  'Nobivac Lyme'
);

-- Coronavirus köpek — inaktive, parenteral SC
UPDATE public.vaccine_brands SET
  is_live_vaccine      = false,
  administration_route = 'parenteral_sc'
WHERE brand_name IN (
  'Canigen C'
);

-- ============================================================
-- KEDİ AŞILARI
-- ============================================================

-- FPV/FHV/FCV karma — MLV, parenteral SC
UPDATE public.vaccine_brands SET
  is_live_vaccine      = true,
  administration_route = 'parenteral_sc'
WHERE brand_name IN (
  'Nobivac Tricat Trio',
  'Purevax RCP',
  'Purevax RCPCh',
  'Feligen CRP',
  'Versifel CVR',
  'Felocell CVR'
);

-- Kedi Kuduz — inaktive, parenteral IM
UPDATE public.vaccine_brands SET
  is_live_vaccine      = false,
  administration_route = 'parenteral_im'
WHERE brand_name IN (
  'Purevax Rabies',
  'Rabisin'
)
AND (species = 'cat' OR species IS NULL);

-- FeLV — inaktive, parenteral SC (yaşam biçimi risk bazlı — B3)
UPDATE public.vaccine_brands SET
  is_live_vaccine      = false,
  administration_route = 'parenteral_sc'
WHERE brand_name IN (
  'Purevax FeLV',
  'Versifel FeLV',
  'Nobivac FeLV',
  'Leucogen'
);

-- FIV — inaktive, parenteral SC
UPDATE public.vaccine_brands SET
  is_live_vaccine      = false,
  administration_route = 'parenteral_sc'
WHERE brand_name IN (
  'Fel-O-Vax FIV'
);

-- FIP — MLV, intranasal
UPDATE public.vaccine_brands SET
  is_live_vaccine      = true,
  administration_route = 'intranasal'
WHERE brand_name IN (
  'Primucell FIP'
);

-- Chlamydia — inaktive, parenteral SC
UPDATE public.vaccine_brands SET
  is_live_vaccine      = false,
  administration_route = 'parenteral_sc'
WHERE brand_name IN (
  'Feligen Cr'
);

-- ============================================================
-- DOĞRULAMA SORGULARI
-- ============================================================

-- 1. Güncellenmemiş satır var mı? Boş dönmeli.
-- SELECT brand_name, is_live_vaccine, administration_route FROM vaccine_brands WHERE is_live_vaccine IS NULL OR administration_route IS NULL ORDER BY brand_name;

-- 2. Intranasal ürünleri kontrol et — yalnızca KC, Bronchicine, Primucell olmalı.
-- SELECT brand_name, is_live_vaccine, administration_route FROM vaccine_brands WHERE administration_route = 'intranasal' ORDER BY brand_name;

-- 3. FIV ve FIP — is_core false olduğunu doğrula.
-- SELECT brand_name, administration_route, is_core FROM vaccine_brands WHERE brand_name IN ('Fel-O-Vax FIV', 'Primucell FIP');
