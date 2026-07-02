-- ============================================================
-- Odi.Pet — Parasite Products v2
-- 1. description + image_url kolonları ekle
-- 2. Mevcut ürünlere açıklama ekle
-- 3. 16 yeni ürün ekle
-- ============================================================

ALTER TABLE public.parasite_products
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS image_url   text;

-- ── Mevcut ürünlere açıklama ekle ───────────────────────────
UPDATE public.parasite_products SET description = 'Köpeklerde pire ve kene koruması sağlayan aylık oral tablet. Afoxolaner etken maddesi.' WHERE name = 'NexGard' AND species = 'dog';
UPDATE public.parasite_products SET description = 'Köpeklerde pire, kene ve iç parazit koruması sağlayan aylık kombine oral tablet.' WHERE name = 'NexGard Spectra';
UPDATE public.parasite_products SET description = 'Köpeklerde 3 aylık pire ve kene koruması sağlayan fluralaner içerikli oral tablet.' WHERE name = 'Bravecto Tablet';
UPDATE public.parasite_products SET description = 'Köpeklerde 3 aylık pire ve kene koruması sağlayan fluralaner içerikli spot-on.' WHERE name = 'Bravecto Spot-On Köpek';
UPDATE public.parasite_products SET description = 'Köpeklerde pire, kene ve bit koruması sağlayan aylık fipronil içerikli spot-on.' WHERE name = 'Frontline Combo Köpek';
UPDATE public.parasite_products SET description = 'Köpeklerde 8 aylık sürekli pire ve kene koruması sağlayan tasma.' WHERE name = 'Seresto Köpek Tasması';
UPDATE public.parasite_products SET description = 'Köpeklerde kene ve sivrisineğe karşı 7 aylık koruma. Leişmanya riskini azaltır.' WHERE name = 'Scalibor Tasma';
UPDATE public.parasite_products SET description = 'Köpeklerde pire, iç parazit ve kulak akarına karşı aylık spot-on koruma.' WHERE name = 'Advocate Köpek';
UPDATE public.parasite_products SET description = 'Köpeklerde pire, kene, iç parazit ve heartworm koruması sağlayan aylık kombine oral tablet.' WHERE name = 'Simparica Trio';
UPDATE public.parasite_products SET description = 'Kedilerde pire ve kene koruması sağlayan 3 aylık spot-on.' WHERE name = 'Bravecto Spot-On Kedi';
UPDATE public.parasite_products SET description = 'Kedilerde geniş spektrum: pire, kene, iç ve dış parazit koruması sağlayan aylık spot-on.' WHERE name = 'Broadline Kedi';
UPDATE public.parasite_products SET description = 'Kedilerde pire, kulak akarı ve iç parazite karşı aylık spot-on koruma.' WHERE name = 'Advocate Kedi';
UPDATE public.parasite_products SET description = 'Kediler için yuvarlak ve yassı kurta karşı etkili iç parazit tableti. 3 ayda bir uygulanır.' WHERE name = 'Drontal Kedi';
UPDATE public.parasite_products SET description = 'Kediler için spot-on uygulanan iç parazit ilacı. Hap yutturamayanlar için ideal.' WHERE name = 'Profender Kedi';

-- ── Yeni ürünler ─────────────────────────────────────────────
INSERT INTO public.parasite_products
  (species, name, brand, type, application_method, active_ingredient, protection_duration_days, description, is_active)
VALUES

-- Köpek - Yeni ürünler
('dog','Credelio','Elanco','external','oral','Lotilaner',35,
 'Köpeklerde pire ve kene koruması sağlayan 35 günlük küçük çiğneme tableti. Yemekle birlikte verilir.', true),

('dog','Bravecto Plus Köpek','MSD Animal Health','combined','spot-on','Fluralaner + Moksidestin',84,
 'Köpeklerde 3 aylık pire, kene ve iç parazit koruması sağlayan kombine spot-on.', true),

('dog','Vectra 3D','Ceva','external','spot-on','Dinotefuran + Permethrin + Pyriproxyfen',30,
 'Köpeklerde pire, kene ve sivrisinekten aylık spot-on koruma. Kedilere toksik, dikkat.', true),

('dog','Advantix Köpek','Bayer/Elanco','external','spot-on','İmidakloprid + Permethrin',30,
 'Köpeklerde pire, kene, sivrisinek ve tatarcığa karşı aylık spot-on. Kedilere uygulanmaz.', true),

('dog','Milpro Köpek','Virbac','internal','oral','Milbemisin Oksim + Prazikuantel',90,
 'Köpekler için yuvarlak ve yassı kurt tedavisi. 3 ayda bir uygulanır.', true),

('dog','Simparica','Zoetis','external','oral','Sarolaner',35,
 'Köpeklerde pire ve kene koruması sağlayan 35 günlük oral tablet.', true),

('dog','Capstar Köpek','Elanco','external','oral','Nitenpyram',1,
 'Köpeklerde anlık pire öldürücü tablet. 30 dakikada etki gösterir, 24 saatlik koruma.', true),

-- Kedi - Yeni ürünler
('cat','Credelio Cat','Elanco','external','oral','Lotilaner',35,
 'Kedilerde pire koruması sağlayan 35 günlük küçük oral tablet.', true),

('cat','Bravecto Plus Kedi','MSD Animal Health','combined','spot-on','Fluralaner + Moksidestin',84,
 'Kedilerde 3 aylık pire, kene ve iç parazit koruması sağlayan kombine spot-on.', true),

('cat','Milpro Kedi','Virbac','internal','oral','Milbemisin Oksim + Prazikuantel',90,
 'Kediler için yuvarlak ve yassı kurt tedavisi. 3 ayda bir uygulanır.', true),

('cat','Vectra Felis','Ceva','external','spot-on','Dinotefuran + Pyriproxyfen',30,
 'Kedilerde pire ve bit koruması sağlayan aylık spot-on.', true),

('cat','Capstar Kedi','Elanco','external','oral','Nitenpyram',1,
 'Kedilerde anlık pire öldürücü tablet. 30 dakikada etki gösterir, 24 saatlik koruma.', true),

('cat','Revolution Plus Kedi','Zoetis','combined','spot-on','Selamektin + Sarolaner',30,
 'Kedilerde pire, kene, kulak akarı ve iç parazite karşı aylık kombine spot-on.', true),

-- Her iki tür için
('both','Interceptor','Virbac','internal','oral','Milbemisin Oksim',30,
 'Kedi ve köpekler için heartworm dahil geniş spektrum iç parazit koruması. Aylık oral tablet.', true),

('both','Drontal','Bayer/Elanco','internal','oral','Prazikuantel + Pirantel',90,
 'Kedi ve köpekler için yuvarlak ve yassı kurt tedavisi. 3 ayda bir uygulanır.', true);
