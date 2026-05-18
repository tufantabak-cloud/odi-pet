-- =============================================
-- ODI.PET — Supabase Cron Job: Daily Notification Dispatch
-- Runs the dispatch-notifications Edge Function every day at 09:00 Istanbul time (UTC+3 = 06:00 UTC)
-- Apply via: Supabase Dashboard → SQL Editor
-- Requires: pg_cron extension (enabled by default on Supabase)
-- =============================================

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop if exists to allow re-run
SELECT cron.unschedule('dispatch-vaccine-notifications') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'dispatch-vaccine-notifications'
);

-- Schedule: every day at 09:00 Istanbul (06:00 UTC)
SELECT cron.schedule(
  'dispatch-vaccine-notifications',
  '0 6 * * *',
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

-- Verify schedule was created
SELECT jobname, schedule, command, active
FROM cron.job
WHERE jobname = 'dispatch-vaccine-notifications';
