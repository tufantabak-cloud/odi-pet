-- =============================================
-- Update Cron Job Frequency for Notifications
-- Changes the schedule from once a day to every 5 minutes
-- =============================================

-- Drop if exists
SELECT cron.unschedule('dispatch-vaccine-notifications') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'dispatch-vaccine-notifications'
);

-- Schedule: every 5 minutes
SELECT cron.schedule(
  'dispatch-vaccine-notifications',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://soautcxgiqhxiaxrubxv.supabase.co/functions/v1/dispatch-notifications',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      ),
      body := '{}'::jsonb
    );
  $$
);
