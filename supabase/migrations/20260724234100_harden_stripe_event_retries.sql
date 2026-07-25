ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_retry
  ON public.stripe_webhook_events (status, last_attempt_at);
