-- ============================================================
-- Odi.Pet — Vaccine Brands (Türkiye'de satışa sunulan markalar)
-- vaccine_code: vaccineCatalog.ts'deki code ile eşleşir
-- ============================================================

CREATE TABLE IF NOT EXISTS public.vaccine_brands (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vaccine_code  text NOT NULL,          -- DOG_RABIES, CAT_FPV vb.
  species       text NOT NULL CHECK (species IN ('dog','cat','both')),
  brand_name    text NOT NULL,          -- Nobivac Rabies
  manufacturer  text NOT NULL,          -- MSD Animal Health
  description   text,
  image_url     text,
  is_core       boolean NOT NULL DEFAULT false,
  is_active     boolean NOT NULL DEFAULT true,
  status        text NOT NULL DEFAULT 'approved'
                CHECK (status IN ('pending','approved','rejected')),
  suggested_by  uuid REFERENCES public.profiles(id),
  admin_note    text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.vaccine_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vaccine_brands_read"
  ON public.vaccine_brands FOR SELECT USING (is_active = true OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','founder')));

CREATE POLICY "vaccine_brands_admin_write"
  ON public.vaccine_brands FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','founder')));

CREATE POLICY "vaccine_brands_user_suggest"
  ON public.vaccine_brands FOR INSERT
  WITH CHECK (suggested_by = auth.uid() AND is_active = false AND status = 'pending');

-- ============================================================
-- SEED: Türkiye'de satışa sunulan aşı markaları
-- ============================================================

INSERT INTO public.vaccine_brands
  (vaccine_code, species, brand_name, manufacturer, description, is_core, is_active, status)
VALUES

-- ── KÖPEK TEMEL AŞILARI ─────────────────────────────────────

-- DHPPi / Karma Aşı
('DOG_CDV','dog','Nobivac DHPPi','MSD Animal Health',
 'Distemper, Hepatit, Parvovirus ve Parainfluenza''ya karşı karma aşı. Türkiye''de en yaygın kullanılan köpek karma aşısı.', true, true, 'approved'),
('DOG_CDV','dog','Versaguard Plus','Zoetis',
 'DHPPi formülasyonlu kombine köpek aşısı. Geniş spektrum koruma sağlar.', true, true, 'approved'),
('DOG_CDV','dog','Eurican DHPPi','Boehringer Ingelheim',
 'Boehringer Ingelheim''ın DHPPi formülasyonlu karma köpek aşısı.', true, true, 'approved'),
('DOG_CDV','dog','Canigen DHPPi','Virbac',
 'Virbac''ın dört hastalığa karşı kombine köpek aşısı.', true, true, 'approved'),
('DOG_CDV','dog','Canigen DHPPi/L','Virbac',
 'DHPPi + Leptospira kombinasyonlu geniş spektrum köpek aşısı.', true, true, 'approved'),

-- Kuduz - Köpek
('DOG_RABIES','dog','Nobivac Rabies','MSD Animal Health',
 'MSD''nin inaktive kuduz aşısı. Türkiye''de en çok kullanılan kuduz aşılarından biri. Yasal zorunluluk.', true, true, 'approved'),
('DOG_RABIES','dog','Rabisin','Boehringer Ingelheim',
 'Boehringer Ingelheim''ın inaktive kuduz aşısı. Yıllık tekrar gerektiren yasal aşı.', true, true, 'approved'),
('DOG_RABIES','dog','Defensor 3','Zoetis',
 'Zoetis''in inaktive kuduz aşısı. Üç yıllık koruma süresi iddiasıyla bilinir.', true, true, 'approved'),
('DOG_RABIES','dog','Quantum Rabies','Hipra',
 'Hipra''nın inaktive kuduz aşısı. Türkiye''de kullanılan alternatif kuduz aşısı.', true, true, 'approved'),

-- ── KÖPEK EK AŞILARI ────────────────────────────────────────

-- Leptospira
('DOG_LEPTO_C','dog','Nobivac Lepto 2','MSD Animal Health',
 'İki Leptospira suşuna karşı (L. canicola + L. icterohaemorrhagiae) koruma sağlar.', false, true, 'approved'),
('DOG_LEPTO_C','dog','Nobivac Lepto 4','MSD Animal Health',
 'Dört Leptospira suşuna karşı geniş spektrum koruma. Su kaynaklarına yakın köpeklerde önerilir.', false, true, 'approved'),
('DOG_LEPTO_C','dog','Versaguard Lepto','Zoetis',
 'Zoetis''in çoklu suş Leptospira aşısı.', false, true, 'approved'),

-- Bordetella / Kennel Cough
('DOG_BORDETELLA','dog','Nobivac KC','MSD Animal Health',
 'Bordetella bronchiseptica ve Parainfluenza''ya karşı intranasal uygulanan kennel cough aşısı.', false, true, 'approved'),
('DOG_BORDETELLA','dog','Bronchicine CAe','Zoetis',
 'Kanin Adenovirus-2 ve Bordetella bronchiseptica''ya karşı intranasal aşı.', false, true, 'approved'),

-- Leishmania
('DOG_LEISH','dog','CaniLeish','Virbac',
 'Kala-azar (Leişmanya) hastalığına karşı geliştirilmiş ilk lisanslı köpek aşısı. Akdeniz bölgesi için kritik.', false, true, 'approved'),
('DOG_LEISH','dog','Letifend','Laboratorio ORF',
 'Rekombinant Leishmania aşısı. Tek doz protokolüyle uygulanır.', false, true, 'approved'),

-- Lyme
('DOG_LYME','dog','Nobivac Lyme','MSD Animal Health',
 'Borrelia burgdorferi''ye karşı Lyme hastalığı aşısı. Kene kaynaklı enfeksiyon riski olan bölgelerde önerilir.', false, true, 'approved'),

-- Coronavirus
('DOG_CCV','dog','Canigen C','Virbac',
 'Köpek koronavirüsüne karşı sindirim sistemi koruyucu aşı. Genellikle karma aşı protokolüne eklenir.', false, true, 'approved'),

-- ── KEDİ TEMEL AŞILARI ──────────────────────────────────────

-- FVRCP / Üçlü
('CAT_FPV','cat','Nobivac Tricat Trio','MSD Animal Health',
 'Panleukopenia, Rhinotracheitis ve Calicivirus''e karşı klasik kedi üçlü aşısı.', true, true, 'approved'),
('CAT_FPV','cat','Purevax RCP','Boehringer Ingelheim',
 'Rekombinant teknolojili kedi üçlü aşısı. Adjuvan içermez, yan etki riski düşüktür.', true, true, 'approved'),
('CAT_FPV','cat','Purevax RCPCh','Boehringer Ingelheim',
 'Üçlü aşıya Chlamydia korumas eklenmiş dörtlü formülasyon.', true, true, 'approved'),
('CAT_FPV','cat','Feligen CRP','Virbac',
 'Virbac''ın kedi üçlü aşısı. Rhinotracheitis, Calicivirus ve Panleukopenia''ya karşı.', true, true, 'approved'),
('CAT_FPV','cat','Versifel CVR','Zoetis',
 'Zoetis''in kedi üçlü aşısı formülasyonu.', true, true, 'approved'),
('CAT_FPV','cat','Felocell CVR','Zoetis',
 'Kedi Calicivirus, Viral Rhinotracheitis ve Panleukopenia''ya karşı modifiye canlı aşı.', true, true, 'approved'),

-- Kuduz - Kedi
('CAT_RABIES','cat','Nobivac Rabies','MSD Animal Health',
 'Kedi ve köpekler için inaktive kuduz aşısı. Yıllık tekrar gerektirir.', true, true, 'approved'),
('CAT_RABIES','cat','Purevax Rabies','Boehringer Ingelheim',
 'Rekombinant, adjuvan içermeyen kedi kuduz aşısı. Aşı kaynaklı sarkom riskini azaltır.', true, true, 'approved'),
('CAT_RABIES','cat','Rabisin','Boehringer Ingelheim',
 'Boehringer Ingelheim''ın inaktive kuduz aşısı. Kedi ve köpeklerde kullanılır.', true, true, 'approved'),

-- ── KEDİ EK AŞILARI ─────────────────────────────────────────

-- FeLV (Lösemi)
('CAT_FELV','cat','Purevax FeLV','Boehringer Ingelheim',
 'Rekombinant, adjuvan içermeyen kedi lösemi aşısı. Dış ortama çıkan kedilerde kritik öneme sahiptir.', false, true, 'approved'),
('CAT_FELV','cat','Versifel FeLV','Zoetis',
 'Zoetis''in kedi lösemi virüsüne karşı aşısı.', false, true, 'approved'),
('CAT_FELV','cat','Nobivac FeLV','MSD Animal Health',
 'MSD''nin adjuvanlı kedi lösemi aşısı.', false, true, 'approved'),
('CAT_FELV','cat','Leucogen','Virbac',
 'Virbac''ın kedi lösemi aşısı. Subunit teknolojisiyle üretilmiştir.', false, true, 'approved'),

-- FIP
('CAT_FIP','cat','Primucell FIP','Zoetis',
 'Feline Infectious Peritonitis (FIP) hastalığına karşı intranasal uygulanan aşı.', false, true, 'approved'),

-- FIV (Kedi AIDS)
('CAT_FIV','cat','Fel-O-Vax FIV','Zoetis',
 'Feline İmmünodeficiency Virus (FIV/Kedi AIDS)''e karşı inaktive aşı. Dış ortamda dişi kedilerle temas eden erkek kedilerde önerilir.', false, true, 'approved'),

-- Chlamydia
('CAT_CHLAMYDIA','cat','Feligen Cr','Virbac',
 'Chlamydia felis''e karşı koruma sağlayan kedi aşısı. Genellikle üçlü aşıyla kombine kullanılır.', false, true, 'approved');

