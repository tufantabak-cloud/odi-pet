-- B6: Lot Numarası Veri Modellemesinin Ürün Seviyesinde Tutulması
ALTER TABLE public.vaccine_records_v2
ADD COLUMN IF NOT EXISTS lot_number TEXT,
ADD COLUMN IF NOT EXISTS expiration_date TIMESTAMPTZ;
