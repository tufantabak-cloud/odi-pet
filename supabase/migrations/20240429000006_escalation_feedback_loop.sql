-- Update escalation function with predictive cache invalidation on critical
CREATE OR REPLACE FUNCTION public.run_escalation_check()
RETURNS TABLE(schedule_id UUID, pet_id UUID, level TEXT, hours_overdue NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r RECORD; new_level TEXT; hours_over NUMERIC;
BEGIN
  FOR r IN
    SELECT hs.id, hs.pet_id, hs.title, hs.assigned_to, hs.assigned_by,
           hs.due_date, hs.escalation_level, hs.status
    FROM public.health_schedules hs
    WHERE hs.status != 'done' AND hs.due_date < NOW()
      AND hs.assignment_status NOT IN ('completed','declined')
  LOOP
    hours_over := EXTRACT(EPOCH FROM (NOW() - r.due_date)) / 3600;
    new_level := CASE
      WHEN hours_over >= 72 THEN 'critical'
      WHEN hours_over >= 48 THEN 'warning_2'
      WHEN hours_over >= 24 THEN 'warning_1'
      ELSE 'none'
    END;
    IF new_level != 'none' AND new_level != r.escalation_level THEN
      UPDATE public.health_schedules
        SET escalation_level = new_level, last_escalated_at = NOW()
        WHERE id = r.id;

      IF r.assigned_to IS NOT NULL THEN
        PERFORM public.create_pet_notification(r.pet_id, r.assigned_to, 'task_overdue',
          CASE new_level
            WHEN 'warning_1' THEN 'Görevin gecikti'
            WHEN 'warning_2' THEN 'Görev hâlâ tamamlanmadı'
            ELSE '🚨 Kritik: Görev 3 gündür bekliyor'
          END,
          COALESCE(r.title,'Bakım görevi') || ' — Lütfen tamamlayın',
          'health_schedule', r.id);
      END IF;

      IF new_level IN ('warning_2','critical') AND r.assigned_by IS NOT NULL AND r.assigned_by != r.assigned_to THEN
        PERFORM public.create_pet_notification(r.pet_id, r.assigned_by, 'task_overdue',
          CASE new_level
            WHEN 'warning_2' THEN '⚠️ Atanan görev hâlâ tamamlanmadı'
            ELSE '🚨 Kritik gecikme — Yeniden atama gerekebilir'
          END,
          COALESCE(r.title,'Bakım görevi') || ' gecikiyor',
          'health_schedule', r.id);
      END IF;

      -- FEEDBACK LOOP: Critical escalation invalidates predictive cache
      -- → next API visit triggers full recompute with household signals
      IF new_level = 'critical' THEN
        DELETE FROM public.predictive_insights
          WHERE pet_id = r.pet_id AND created_at < NOW() - INTERVAL '1 minute';
      END IF;

      RETURN QUERY SELECT r.id, r.pet_id, new_level, hours_over;
    END IF;
  END LOOP;
END;
$$;
