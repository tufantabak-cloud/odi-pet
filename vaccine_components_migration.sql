-- 1. Create vaccine_components table
CREATE TABLE IF NOT EXISTS public.vaccine_components (
    code text PRIMARY KEY,
    name text NOT NULL,
    description text,
    is_zoonotic boolean DEFAULT false,
    risk_level text CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')) DEFAULT 'MEDIUM',
    annual_required boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Add RLS policies for vaccine_components
ALTER TABLE public.vaccine_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.vaccine_components FOR SELECT USING (true);

-- 3. Add components array to vaccine_templates
ALTER TABLE public.vaccine_templates ADD COLUMN IF NOT EXISTS components text[] DEFAULT '{}';

-- 4. Seed basic components
INSERT INTO public.vaccine_components (code, name, description, is_zoonotic, risk_level, annual_required) VALUES
('DIST', 'Gençlik Hastalığı (Distemper)', 'Köpek gençlik hastalığı virüsü, ölümcül olabilir.', false, 'HIGH', true),
('PARVO', 'Kanlı İshal (Parvovirus)', 'Bağırsakları ve bağışıklık sistemini etkileyen ölümcül virüs.', false, 'HIGH', true),
('HEP', 'Hepatitis (Adenovirus)', 'Karaciğer enfeksiyonuna yol açan virüs.', false, 'HIGH', true),
('PARA', 'Parainfluenza', 'Solunum yolu enfeksiyonlarına neden olan virüs.', false, 'MEDIUM', true),
('LEPTO', 'Leptospirosis', 'Bakteriyel enfeksiyon, karaciğer ve böbrek yetmezliğine neden olabilir.', true, 'HIGH', true),
('LEPTO1', 'Leptospira Canicola', 'Leptospirosis tip 1.', true, 'HIGH', true),
('LEPTO2', 'Leptospira Icterohaemorrhagiae', 'Leptospirosis tip 2.', true, 'HIGH', true),
('LEPTO3', 'Leptospira Grippotyphosa', 'Leptospirosis tip 3.', true, 'HIGH', true),
('LEPTO4', 'Leptospira Pomona', 'Leptospirosis tip 4.', true, 'HIGH', true),
('RABIES', 'Kuduz (Rabies)', 'Merkezi sinir sistemini etkileyen ve yasal zorunluluğu olan ölümcül virüs.', true, 'HIGH', true),
('BORDET', 'Boğmaca (Bordetella)', 'Barınak hastalığı olarak da bilinen solunum yolu enfeksiyonu.', false, 'MEDIUM', true),
('LYME', 'Lyme (Borrelia)', 'Kenelerle bulaşan bakteriyel hastalık.', true, 'MEDIUM', true),
('CCV', 'Coronavirus', 'Köpek koronavirüsü, sindirim sistemini etkiler.', false, 'LOW', false),
('RINGW', 'Mantar (Microsporum canis)', 'Cilt enfeksiyonuna yol açan mantar hastalığı.', true, 'LOW', false),
('FCV', 'Calicivirus', 'Kedilerde solunum ve ağız enfeksiyonlarına neden olur.', false, 'HIGH', true),
('FHV', 'Rhinotracheitis (Herpesvirus)', 'Kedilerde göz ve solunum yolu enfeksiyonlarına neden olur.', false, 'HIGH', true),
('FPV', 'Panleukopenia (Gençlik)', 'Kedilerde çok bulaşıcı ve ölümcül olan kanlı ishal benzeri virüs.', false, 'HIGH', true),
('FeLV', 'Lösemi (Feline Leukemia)', 'Kedi lösemi virüsü, bağışıklık sistemini baskılar.', false, 'HIGH', true),
('FIV', 'Kedi AIDS (Feline Immunodeficiency)', 'Kedilerde bağışıklık sistemini zayıflatan virüs.', false, 'HIGH', false)
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name, 
    description = EXCLUDED.description, 
    is_zoonotic = EXCLUDED.is_zoonotic, 
    risk_level = EXCLUDED.risk_level, 
    annual_required = EXCLUDED.annual_required;

-- 5. Map existing core templates to their components
-- DHPPI -> DIST, HEP, PARVO, PARA
UPDATE public.vaccine_templates SET components = ARRAY['DIST', 'HEP', 'PARVO', 'PARA'] WHERE vaccine_code = 'DHPPI';
-- PUPPY_DP -> DIST, PARVO
UPDATE public.vaccine_templates SET components = ARRAY['DIST', 'PARVO'] WHERE vaccine_code = 'PUPPY_DP';
-- LEPTO -> LEPTO
UPDATE public.vaccine_templates SET components = ARRAY['LEPTO'] WHERE vaccine_code = 'LEPTO';
-- 5L4 -> DIST, HEP, PARVO, PARA, LEPTO1, LEPTO2, LEPTO3, LEPTO4
UPDATE public.vaccine_templates SET components = ARRAY['DIST', 'HEP', 'PARVO', 'PARA', 'LEPTO1', 'LEPTO2', 'LEPTO3', 'LEPTO4'] WHERE vaccine_code = '5L4';
-- KC / BORDET -> BORDET, PARA
UPDATE public.vaccine_templates SET components = ARRAY['BORDET', 'PARA'] WHERE vaccine_code IN ('KC', 'BORDET');
-- RABIES -> RABIES
UPDATE public.vaccine_templates SET components = ARRAY['RABIES'] WHERE vaccine_code = 'RABIES';
-- CCV -> CCV
UPDATE public.vaccine_templates SET components = ARRAY['CCV'] WHERE vaccine_code = 'CCV';
-- LYME -> LYME
UPDATE public.vaccine_templates SET components = ARRAY['LYME'] WHERE vaccine_code = 'LYME';
-- RINGW -> RINGW
UPDATE public.vaccine_templates SET components = ARRAY['RINGW'] WHERE vaccine_code = 'RINGW';

-- Feline templates
-- TRICAT -> FCV, FHV, FPV
UPDATE public.vaccine_templates SET components = ARRAY['FCV', 'FHV', 'FPV'] WHERE vaccine_code = 'TRICAT';
-- FELV -> FeLV
UPDATE public.vaccine_templates SET components = ARRAY['FeLV'] WHERE vaccine_code = 'FELV';

-- Force schema cache reload (if required)
NOTIFY pgrst, 'reload schema';
