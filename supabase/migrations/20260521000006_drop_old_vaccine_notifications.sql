-- =============================================
-- ODI.PET: CLEANUP OLD VACCINE NOTIFICATIONS
-- Drops the old generate_vaccine_notifications function
-- as we now use the new schedule-based notifications.
-- =============================================

DROP FUNCTION IF EXISTS public.generate_vaccine_notifications();
