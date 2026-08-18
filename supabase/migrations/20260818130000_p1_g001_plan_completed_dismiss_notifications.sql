-- Migration: 20260818130000_p1_g001_plan_completed_dismiss_notifications.sql
-- Description: Automatically marks active in-app notifications as read (is_read = true)
-- when a plan is completed, preventing stale reminders in the notification center.

-- 1. Kanonik Trigger Fonksiyonu
CREATE OR REPLACE FUNCTION public.handle_plan_completed_dismiss_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE public.notifications
    SET is_read = true,
        opened_at = COALESCE(opened_at, now())
    WHERE is_read = false
      AND (
        plan_id = NEW.id
        OR (NEW.parent_plan_id IS NOT NULL AND plan_id = NEW.parent_plan_id)
      );
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Trigger Tanımı
DROP TRIGGER IF EXISTS trg_plan_completed_dismiss_notifications ON public.plans;
CREATE TRIGGER trg_plan_completed_dismiss_notifications
  AFTER INSERT OR UPDATE OF status
  ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_plan_completed_dismiss_notifications();

-- 3. Retroaktif Temizlik (Tek Seferlik İyileştirme)
-- Daha önceden tamamlanmış olan planlara bağlı açık bildirimleri okundu olarak işaretler.
UPDATE public.notifications n
SET is_read = true,
    opened_at = COALESCE(n.opened_at, now())
FROM public.plans p
WHERE n.is_read = false
  AND (n.plan_id = p.id OR (p.parent_plan_id IS NOT NULL AND n.plan_id = p.parent_plan_id))
  AND p.status = 'completed';
