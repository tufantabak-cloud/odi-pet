-- Keep the privileged notification dispatcher key out of cron.job and attach
-- the required Bearer scheme before the Edge Function starts enforcing it.
DO $migration$
DECLARE
  notification_job_id bigint;
  has_vault_secret boolean;
  secure_command text := $command$
    SELECT net.http_post(
      url := 'https://soautcxgiqhxiaxrubxv.supabase.co/functions/v1/dispatch-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'dispatch_notifications_service_role_key'
          LIMIT 1
        )
      ),
      body := '{}'::jsonb
    );
  $command$;
BEGIN
  SELECT jobid
  INTO notification_job_id
  FROM cron.job
  WHERE jobname = 'dispatch-vaccine-notifications'
  LIMIT 1;

  IF notification_job_id IS NULL THEN
    RAISE NOTICE 'Notification cron job is not installed; no migration needed.';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM vault.secrets
    WHERE name = 'dispatch_notifications_service_role_key'
  )
  INTO has_vault_secret;

  IF has_vault_secret THEN
    PERFORM cron.alter_job(
      job_id := notification_job_id,
      schedule := '*/5 * * * *',
      command := secure_command,
      active := true
    );
  ELSE
    -- Fail closed on fresh/local installations until an administrator seeds
    -- the Vault secret instead of running a publicly callable cron.
    PERFORM cron.alter_job(
      job_id := notification_job_id,
      active := false
    );
    RAISE WARNING
      'Notification cron disabled: dispatch_notifications_service_role_key is absent from Vault.';
  END IF;
END
$migration$;

NOTIFY pgrst, 'reload schema';
