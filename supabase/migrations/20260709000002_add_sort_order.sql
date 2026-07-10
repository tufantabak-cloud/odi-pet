-- ============================================================
-- Admin panel (/admin/vaccines) GET /api/admin/vaccines
-- .order('sort_order', ...) çağırıyordu ama kolon hiç yoktu —
-- bu yüzden liste sorgusu 42703 hatasıyla başarısız oluyordu.
-- ============================================================

ALTER TABLE public.vaccine_protocols
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 999;

-- Mantıklı görüntüleme sırası (tür + önem sırasına göre)
UPDATE public.vaccine_protocols SET sort_order = 10 WHERE vaccine_code = 'DOG_CDV';
UPDATE public.vaccine_protocols SET sort_order = 20 WHERE vaccine_code = 'DOG_RABIES';
UPDATE public.vaccine_protocols SET sort_order = 30 WHERE vaccine_code = 'DOG_LEPTO_C';
UPDATE public.vaccine_protocols SET sort_order = 40 WHERE vaccine_code = 'DOG_BORDETELLA';
UPDATE public.vaccine_protocols SET sort_order = 50 WHERE vaccine_code = 'DOG_LYME';
UPDATE public.vaccine_protocols SET sort_order = 60 WHERE vaccine_code = 'DOG_CCV';

UPDATE public.vaccine_protocols SET sort_order = 110 WHERE vaccine_code = 'CAT_FPV';
UPDATE public.vaccine_protocols SET sort_order = 120 WHERE vaccine_code = 'CAT_RABIES';
UPDATE public.vaccine_protocols SET sort_order = 130 WHERE vaccine_code = 'CAT_FELV';
UPDATE public.vaccine_protocols SET sort_order = 140 WHERE vaccine_code = 'CAT_FIV';
UPDATE public.vaccine_protocols SET sort_order = 150 WHERE vaccine_code = 'CAT_CHLAMYDIA';
