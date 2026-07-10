-- plans.status CHECK kısıtlamasına 'overdue' ekleniyor.
-- Sprint C.4.1: build-vaccination-schedule.ts artık geçmiş tarihli
-- (özellikle yavru pet'lerde birth_date+days_offset geçmişte kalan)
-- dozları 'overdue' olarak işaretleyebiliyor — kullanıcı bunları
-- "bekleyen görev" (active) sanmasın diye.

ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_status_check;
ALTER TABLE public.plans ADD CONSTRAINT plans_status_check
  CHECK (status IN ('active', 'completed', 'cancelled', 'overdue'));
