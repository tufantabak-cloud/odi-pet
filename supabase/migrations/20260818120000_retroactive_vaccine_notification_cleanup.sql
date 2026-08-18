-- Retroactive cleanup for premature vaccine notifications
-- Legacy vaccine_reminder rows created with stale offsets are archived / marked read
-- so they do not clutter the user's in-app notification center ahead of time.

UPDATE public.notifications n
SET is_read = true,
    action_taken = 'retroactive_cleanup_p1_fix'
FROM public.plans p
WHERE n.plan_id = p.id
  AND n.type = 'vaccine_reminder'
  AND n.is_read = false
  AND p.scheduled_at > (now() + interval '1 day')
  AND n.created_at < now();
