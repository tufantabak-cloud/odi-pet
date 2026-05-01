-- =============================================
-- TASK ASSIGNMENT ENGINE
-- Sprint 1: assignment fields + lifecycle
-- =============================================

-- 1. Add assignment columns to health_schedules
ALTER TABLE public.health_schedules
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assignment_status TEXT DEFAULT 'unassigned'
    CHECK (assignment_status IN ('unassigned','assigned','accepted','declined','completed','overdue','reassigned')),
  ADD COLUMN IF NOT EXISTS decline_reason TEXT,
  ADD COLUMN IF NOT EXISTS reassigned_at TIMESTAMPTZ;

-- 2. Notifications table (shared notification inbox)
CREATE TABLE IF NOT EXISTS public.pet_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'task_assigned' | 'task_due' | 'task_overdue' | 'task_accepted' | 'task_declined' | 'task_completed' | 'invite_accepted'
  title TEXT NOT NULL,
  body TEXT,
  entity_type TEXT,  -- 'health_schedule' | 'pet_invite'
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pet_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own notifications" ON public.pet_notifications;
CREATE POLICY "Users see own notifications" ON public.pet_notifications
  FOR ALL USING (profile_id = auth.uid());

-- 3. Helper: notify a user
CREATE OR REPLACE FUNCTION public.create_pet_notification(
  p_pet_id UUID,
  p_profile_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
) RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO public.pet_notifications(pet_id, profile_id, type, title, body, entity_type, entity_id)
  VALUES (p_pet_id, p_profile_id, p_type, p_title, p_body, p_entity_type, p_entity_id);
$$;

-- 4. Auto-notify on assignment (trigger)
CREATE OR REPLACE FUNCTION public.on_task_assigned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- New assignment
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    PERFORM public.create_pet_notification(
      NEW.pet_id,
      NEW.assigned_to,
      'task_assigned',
      'Sana yeni bir görev atandı',
      COALESCE(NEW.title, 'Bakım görevi') || ' — ' || TO_CHAR(NEW.due_date, 'DD.MM.YYYY'),
      'health_schedule',
      NEW.id
    );
  END IF;

  -- Task completed → notify owner
  IF NEW.assignment_status = 'completed' AND OLD.assignment_status != 'completed' THEN
    -- Notify the assigner (owner/admin)
    IF NEW.assigned_by IS NOT NULL THEN
      PERFORM public.create_pet_notification(
        NEW.pet_id,
        NEW.assigned_by,
        'task_completed',
        'Görev tamamlandı ✓',
        COALESCE(NEW.title, 'Görev') || ' tamamlandı',
        'health_schedule',
        NEW.id
      );
    END IF;
  END IF;

  -- Task declined → notify assigner
  IF NEW.assignment_status = 'declined' AND OLD.assignment_status != 'declined' THEN
    IF NEW.assigned_by IS NOT NULL THEN
      PERFORM public.create_pet_notification(
        NEW.pet_id,
        NEW.assigned_by,
        'task_declined',
        'Görev reddedildi',
        COALESCE(NEW.title, 'Görev') || ' reddedildi. Yeniden atayın.',
        'health_schedule',
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_assigned ON public.health_schedules;
CREATE TRIGGER on_task_assigned
  AFTER UPDATE ON public.health_schedules
  FOR EACH ROW EXECUTE PROCEDURE public.on_task_assigned();
