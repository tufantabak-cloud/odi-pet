-- ============================================================
-- Odi.Pet — Vaccine & Parasite Protocol Migration
-- Version: 1.0.0
-- Date: 2026-06-05
-- ============================================================

-- ─── 1. VACCINE PROTOCOLS ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vaccine_protocols (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species               text NOT NULL CHECK (species IN ('dog', 'cat')),
  vaccine_code          text NOT NULL,  -- vaccineCatalog.ts code ile eşleşir
  is_core               boolean NOT NULL DEFAULT false,
  protocol_name         text NOT NULL,
  doses                 jsonb NOT NULL DEFAULT '[]',
  -- Örnek:
  -- [
  --   {"dose_number": 1, "trigger": "birth", "days_offset": 42},
  --   {"dose_number": 2, "trigger": "prev_dose", "days_offset": 28},
  --   {"dose_number": 3, "trigger": "prev_dose", "days_offset": 365}
  -- ]
  repeat_frequency      text CHECK (repeat_frequency IN ('none','monthly','yearly','custom')),
  repeat_interval_days  integer,
  end_condition         jsonb NOT NULL DEFAULT '{"type": "indefinite"}',
  -- { "type": "indefinite" }
  -- { "type": "dose_count", "value": 3 }
  -- { "type": "duration_months", "value": 24 }
  notes                 text,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- RLS: Herkes okuyabilir, sadece admin yazabilir
ALTER TABLE public.vaccine_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vaccine_protocols_read_all"
  ON public.vaccine_protocols FOR SELECT
  USING (true);

CREATE POLICY "vaccine_protocols_admin_write"
  ON public.vaccine_protocols FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'founder')
    )
  );

-- ─── 2. PARASITE PRODUCTS ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.parasite_products (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species                  text NOT NULL CHECK (species IN ('dog', 'cat', 'both')),
  name                     text NOT NULL,
  brand                    text NOT NULL,
  type                     text NOT NULL CHECK (type IN ('internal', 'external', 'combined')),
  application_method       text NOT NULL CHECK (application_method IN ('oral', 'spot-on', 'collar', 'spray', 'injection')),
  active_ingredient        text,
  protection_duration_days integer NOT NULL,
  notes                    text,
  is_active                boolean NOT NULL DEFAULT true,
  created_at               timestamptz DEFAULT now()
);

ALTER TABLE public.parasite_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parasite_products_read_all"
  ON public.parasite_products FOR SELECT
  USING (true);

CREATE POLICY "parasite_products_admin_write"
  ON public.parasite_products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'founder')
    )
  );

-- ─── 3. VACCINE CATALOG SUGGESTIONS ──────────────────────────

CREATE TABLE IF NOT EXISTS public.vaccine_catalog_suggestions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_by    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  species         text NOT NULL CHECK (species IN ('dog', 'cat')),
  name_suggested  text NOT NULL,
  reason          text,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note      text,
  reviewed_by     uuid REFERENCES public.profiles(id),
  reviewed_at     timestamptz,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.vaccine_catalog_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suggestions_own_read"
  ON public.vaccine_catalog_suggestions FOR SELECT
  USING (suggested_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','founder'))
  );

CREATE POLICY "suggestions_insert"
  ON public.vaccine_catalog_suggestions FOR INSERT
  WITH CHECK (suggested_by = auth.uid());

CREATE POLICY "suggestions_admin_update"
  ON public.vaccine_catalog_suggestions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','founder'))
  );

-- ============================================================
-- SEED: vaccine_protocols
-- ============================================================

INSERT INTO public.vaccine_protocols
  (species, vaccine_code, is_core, protocol_name, doses, repeat_frequency, repeat_interval_days, end_condition, notes)
VALUES

-- ── KÖPEK TEMEL AŞILARI ─────────────────────────────────────

('dog', 'DOG_CDV', true, 'Gençlik Hastalığı (DHPPi) Protokolü',
  '[
    {"dose_number":1,"trigger":"birth","days_offset":49,"label":"1. Doz"},
    {"dose_number":2,"trigger":"prev_dose","days_offset":21,"label":"2. Doz"},
    {"dose_number":3,"trigger":"prev_dose","days_offset":365,"label":"Yıllık Booster"}
  ]',
  'yearly', 365, '{"type":"indefinite"}',
  'DHPPi: Distemper, Hepatitis, Parvovirus, Parainfluenza kombine aşı. 3. dozdan itibaren yıllık tekrar.'),

('dog', 'DOG_RABIES', true, 'Kuduz Aşısı Protokolü',
  '[
    {"dose_number":1,"trigger":"birth","days_offset":112,"label":"İlk Aşı (16. Hafta)"},
    {"dose_number":2,"trigger":"prev_dose","days_offset":365,"label":"Yıllık Tekrar"}
  ]',
  'yearly', 365, '{"type":"indefinite"}',
  'Yasal zorunluluk. 16. haftadan itibaren uygulanır, yıllık tekrar edilir.'),

('dog', 'DOG_LEPTO_C', false, 'Leptospirosis Protokolü',
  '[
    {"dose_number":1,"trigger":"birth","days_offset":56,"label":"1. Doz (8. Hafta)"},
    {"dose_number":2,"trigger":"prev_dose","days_offset":21,"label":"2. Doz (3 Hafta Sonra)"},
    {"dose_number":3,"trigger":"prev_dose","days_offset":365,"label":"Yıllık Booster"}
  ]',
  'yearly', 365, '{"type":"indefinite"}',
  'Risk durumuna göre önerilir. Su kaynaklarına erişen köpeklerde önemlidir.'),

('dog', 'DOG_BORDETELLA', false, 'Barınak Öksürüğü (Bordetella) Protokolü',
  '[
    {"dose_number":1,"trigger":"birth","days_offset":84,"label":"1. Doz (12. Hafta)"},
    {"dose_number":2,"trigger":"prev_dose","days_offset":21,"label":"2. Doz"},
    {"dose_number":3,"trigger":"prev_dose","days_offset":365,"label":"Yıllık Booster"}
  ]',
  'yearly', 365, '{"type":"indefinite"}',
  'Barınak, köpek okulu, eğitim merkezi gibi yerlere giden köpekler için önerilir.'),

('dog', 'DOG_CCV', false, 'Köpek Koronavirüsü Protokolü',
  '[
    {"dose_number":1,"trigger":"birth","days_offset":77,"label":"1. Doz"},
    {"dose_number":2,"trigger":"prev_dose","days_offset":21,"label":"2. Doz"},
    {"dose_number":3,"trigger":"prev_dose","days_offset":365,"label":"Yıllık Booster"}
  ]',
  'yearly', 365, '{"type":"indefinite"}', NULL),

-- ── KEDİ TEMEL AŞILARI ──────────────────────────────────────

('cat', 'CAT_FPV', true, 'Kedi Üçlü Aşı (FVRCP) Protokolü',
  '[
    {"dose_number":1,"trigger":"birth","days_offset":56,"label":"1. Doz (8. Hafta)"},
    {"dose_number":2,"trigger":"prev_dose","days_offset":21,"label":"2. Doz (3 Hafta Sonra)"},
    {"dose_number":3,"trigger":"prev_dose","days_offset":21,"label":"3. Doz (3 Hafta Sonra)"},
    {"dose_number":4,"trigger":"prev_dose","days_offset":365,"label":"Yıllık Booster"}
  ]',
  'yearly', 365, '{"type":"indefinite"}',
  'FVRCP: Panleukopenia, Herpesvirus, Calicivirus. Yıllık tekrar edilir.'),

('cat', 'CAT_RABIES', true, 'Kedi Kuduz Aşısı Protokolü',
  '[
    {"dose_number":1,"trigger":"birth","days_offset":84,"label":"İlk Aşı (12. Hafta)"},
    {"dose_number":2,"trigger":"prev_dose","days_offset":365,"label":"Yıllık Tekrar"}
  ]',
  'yearly', 365, '{"type":"indefinite"}',
  'Yasal zorunluluk. 12. haftadan itibaren uygulanır.'),

('cat', 'CAT_FELV', false, 'Kedi Lösemisi (FeLV) Protokolü',
  '[
    {"dose_number":1,"trigger":"birth","days_offset":56,"label":"1. Doz (8. Hafta)"},
    {"dose_number":2,"trigger":"prev_dose","days_offset":21,"label":"2. Doz"},
    {"dose_number":3,"trigger":"prev_dose","days_offset":365,"label":"Yıllık Booster"}
  ]',
  'yearly', 365, '{"type":"indefinite"}',
  'Dış ortama çıkan veya diğer kedilerle temas eden kedilerde önerilir.'),

('cat', 'CAT_FIV', false, 'Kedi AIDS (FIV) Protokolü',
  '[
    {"dose_number":1,"trigger":"birth","days_offset":84,"label":"1. Doz"},
    {"dose_number":2,"trigger":"prev_dose","days_offset":21,"label":"2. Doz"},
    {"dose_number":3,"trigger":"prev_dose","days_offset":21,"label":"3. Doz"},
    {"dose_number":4,"trigger":"prev_dose","days_offset":365,"label":"Yıllık Booster"}
  ]',
  'yearly', 365, '{"type":"indefinite"}',
  'Dış ortama çıkan erkek kedilerde risk daha yüksektir.');

-- ============================================================
-- SEED: parasite_products (Türkiye'de yaygın 24 ürün)
-- ============================================================

INSERT INTO public.parasite_products
  (species, name, brand, type, application_method, active_ingredient, protection_duration_days, notes)
VALUES

-- ── KÖPEK — DIŞ PARAZİT ─────────────────────────────────────
('dog', 'NexGard', 'Boehringer Ingelheim', 'external', 'oral', 'Afoxolaner', 30, 'Pire ve kene. Aylık uygulanır.'),
('dog', 'Bravecto Tablet', 'MSD Animal Health', 'external', 'oral', 'Fluralaner', 84, 'Pire ve kene. 3 ayda bir uygulanır.'),
('dog', 'Simparica', 'Zoetis', 'external', 'oral', 'Sarolaner', 35, 'Pire ve kene. 35 günde bir uygulanır.'),
('dog', 'Frontline Combo Köpek', 'Boehringer Ingelheim', 'external', 'spot-on', 'Fipronil + Methoprene', 30, 'Pire, kene ve bit. Aylık spot-on.'),
('dog', 'Bravecto Spot-On Köpek', 'MSD Animal Health', 'external', 'spot-on', 'Fluralaner', 84, 'Pire ve kene. 3 ayda bir spot-on.'),
('dog', 'Seresto Köpek Tasması', 'Bayer/Elanco', 'external', 'collar', 'İmidakloprid + Flumethrin', 240, 'Pire ve kene. 8 aylık koruma. Takma sırası boyunca aktif.'),
('dog', 'Scalibor Tasma', 'MSD Animal Health', 'external', 'collar', 'Deltamethrin', 210, 'Kene ve sivrisinek. 7 aylık koruma. Leişmanya riskine karşı da etkili.'),

-- ── KÖPEK — İÇ PARAZİT ──────────────────────────────────────
('dog', 'Milbemax Köpek', 'Elanco', 'internal', 'oral', 'Milbemisin Oksim + Prazikuantel', 90, 'Yuvarlak ve yassı kurt. 3 ayda bir uygulanır.'),
('dog', 'Drontal Plus', 'Bayer/Elanco', 'internal', 'oral', 'Prazikuantel + Pirantel + Febantel', 90, 'Geniş spektrum iç parazit. 3 ayda bir uygulanır.'),
('dog', 'Caniverm', 'Bioveta', 'internal', 'oral', 'Prazikuantel + Pirantel + Febantel', 90, 'Yuvarlak ve yassı kurt. 3 ayda bir uygulanır.'),

-- ── KÖPEK — BİRLEŞİK (İÇ + DIŞ) ────────────────────────────
('dog', 'Advocate Köpek', 'Bayer/Elanco', 'combined', 'spot-on', 'İmidakloprid + Moksidestin', 30, 'Pire, iç parazit, kulak akarı. Aylık spot-on.'),
('dog', 'NexGard Spectra', 'Boehringer Ingelheim', 'combined', 'oral', 'Afoxolaner + Milbemisin Oksim', 30, 'Pire, kene, iç parazit. Aylık oral.'),
('dog', 'Simparica Trio', 'Zoetis', 'combined', 'oral', 'Sarolaner + Moksidestin + Pirantel', 35, 'Pire, kene, heartworm, iç parazit. 35 günde bir oral.'),
('dog', 'Revolution Köpek', 'Zoetis', 'combined', 'spot-on', 'Selamektin', 30, 'Pire, kene, kulak akarı, iç parazit. Aylık spot-on.'),

-- ── KEDİ — DIŞ PARAZİT ──────────────────────────────────────
('cat', 'Frontline Combo Kedi', 'Boehringer Ingelheim', 'external', 'spot-on', 'Fipronil + Methoprene', 30, 'Pire ve kene. Aylık spot-on.'),
('cat', 'Bravecto Spot-On Kedi', 'MSD Animal Health', 'external', 'spot-on', 'Fluralaner', 84, 'Pire ve kene. 3 ayda bir spot-on.'),
('cat', 'Advantage Kedi', 'Bayer/Elanco', 'external', 'spot-on', 'İmidakloprid', 30, 'Pire. Aylık spot-on.'),
('cat', 'Seresto Kedi Tasması', 'Bayer/Elanco', 'external', 'collar', 'İmidakloprid + Flumethrin', 240, 'Pire ve kene. 8 aylık koruma.'),

-- ── KEDİ — İÇ PARAZİT ───────────────────────────────────────
('cat', 'Milbemax Kedi', 'Elanco', 'internal', 'oral', 'Milbemisin Oksim + Prazikuantel', 90, 'Yuvarlak ve yassı kurt. 3 ayda bir.'),
('cat', 'Drontal Kedi', 'Bayer/Elanco', 'internal', 'oral', 'Prazikuantel + Pirantel', 90, 'Yassı ve yuvarlak kurt. 3 ayda bir.'),
('cat', 'Profender Kedi', 'Bayer/Elanco', 'internal', 'spot-on', 'Emodepzid + Prazikuantel', 90, 'Yassı ve yuvarlak kurt. Spot-on. Hap yutturamayanlar için.'),

-- ── KEDİ — BİRLEŞİK (İÇ + DIŞ) ─────────────────────────────
('cat', 'Advocate Kedi', 'Bayer/Elanco', 'combined', 'spot-on', 'İmidakloprid + Moksidestin', 30, 'Pire, iç parazit, kulak akarı. Aylık spot-on.'),
('cat', 'Revolution Kedi', 'Zoetis', 'combined', 'spot-on', 'Selamektin', 30, 'Pire, kulak akarı, iç parazit. Aylık spot-on.'),
('cat', 'Broadline Kedi', 'Boehringer Ingelheim', 'combined', 'spot-on', 'Fipronil + Methoprene + Prazikuantel + Eprinomektin', 30, 'Geniş spektrum: pire, kene, iç ve dış parazit. Aylık spot-on.');
