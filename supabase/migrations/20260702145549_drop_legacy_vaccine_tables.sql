-- Legacy vaccine tables cleanup
-- vaccines: eski aşı kataloğu, vaccine_templates tarafından replace edildi (2026-05-02)
-- vaccine_records: eski aşı kayıt tablosu, vaccine_records_v2 tarafından replace edildi (2026-05-02)
-- Tüm aktif kod referansları temizlendi ve test edildi (2026-07-02, Görev 1-4)
DROP TABLE IF EXISTS public.vaccine_records CASCADE;
DROP TABLE IF EXISTS public.vaccines CASCADE;
