-- C.5: overdue aşı bildirimleri için plan_id referansı ve idempotency index'i.

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS plan_id UUID
REFERENCES public.plans(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_one_vaccine_overdue_per_plan
ON public.notifications (plan_id, type)
WHERE plan_id IS NOT NULL AND type = 'vaccine_overdue';
