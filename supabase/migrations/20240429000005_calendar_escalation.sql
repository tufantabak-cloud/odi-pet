-- =============================================
-- HOUSEHOLD CALENDAR + ESCALATION ENGINE
-- =============================================

-- 1. Add escalation fields to health_schedules
ALTER TABLE public.health_schedules
  ADD COLUMN IF NOT EXISTS escalation_level TEXT DEFAULT 'none'
    CHECK (escalation_level IN ('none','warning_1','warning_2','critical')),
  ADD COLUMN IF NOT EXISTS last_escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal'
    CHECK (priority IN ('low','normal','high','critical'));

-- 2. Escalation runner function (called by cron or API)
-- Idempotent: same level fires notification only once
CREATE OR REPLACE FUNCTION public.run_escalation_check()
RETURNS TABLE(schedule_id UUID, pet_id UUID, level TEXT, hours_overdue NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r RECORD;
  new_level TEXT;
  hours_over NUMERIC;
BEGIN
  FOR r IN
    SELECT hs.id, hs.pet_id, hs.title, hs.assigned_to, hs.assigned_by,
           hs.due_date, hs.escalation_level, hs.last_escalated_at, hs.status
    FROM public.health_schedules hs
    WHERE hs.status != 'done'
      AND hs.due_date < NOW()
      AND hs.assignment_status NOT IN ('completed','declined')
  LOOP
    hours_over := EXTRACT(EPOCH FROM (NOW() - r.due_date)) / 3600;

    new_level := CASE
      WHEN hours_over >= 72 THEN 'critical'
      WHEN hours_over >= 48 THEN 'warning_2'
      WHEN hours_over >= 24 THEN 'warning_1'
      ELSE 'none'
    END;

    -- Only escalate if level changed (prevents spam)
    IF new_level != 'none' AND new_level != r.escalation_level THEN
      UPDATE public.health_schedules
      SET escalation_level = new_level, last_escalated_at = NOW()
      WHERE id = r.id;

      -- Notify assigned member
      IF r.assigned_to IS NOT NULL THEN
        PERFORM public.create_pet_notification(
          r.pet_id, r.assigned_to,
          'task_overdue',
          CASE new_level
            WHEN 'warning_1' THEN 'Görevin gecikti'
            WHEN 'warning_2' THEN 'Görev hâlâ tamamlanmadı'
            ELSE '🚨 Kritik: Görev 3 gündür bekliyor'
          END,
          COALESCE(r.title, 'Bakım görevi') || ' — Lütfen tamamlayın',
          'health_schedule', r.id
        );
      END IF;

      -- On warning_2+ also notify owner/assigner
      IF new_level IN ('warning_2','critical') AND r.assigned_by IS NOT NULL AND r.assigned_by != r.assigned_to THEN
        PERFORM public.create_pet_notification(
          r.pet_id, r.assigned_by,
          'task_overdue',
          CASE new_level
            WHEN 'warning_2' THEN '⚠️ Atanan görev hâlâ tamamlanmadı'
            ELSE '🚨 Kritik gecikme — Yeniden atama gerekebilir'
          END,
          COALESCE(r.title, 'Bakım görevi') || ' gecikiyor',
          'health_schedule', r.id
        );
      END IF;

      -- CRITICAL: invalidate predictive cache → force recompute on next visit
      -- Delete cached insights older than now so next API call recomputes
      IF new_level = 'critical' THEN
        DELETE FROM public.predictive_insights
        WHERE pet_id = r.pet_id
          AND created_at < NOW() - INTERVAL '1 minute';
      END IF;

      RETURN QUERY SELECT r.id, r.pet_id, new_level, hours_over;
    END IF;

  END LOOP;
END;
$$;
