-- clinics tablosunda is_public kolonu bulunamadığı için oluşan hatayı gidermek üzere eklendi.
-- is_public: false = Onay bekleyen veteriner / klinik
-- is_public: true = Sistemde aktif, halka açık klinik

ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
