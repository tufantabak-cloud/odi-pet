BEGIN;

SELECT plan(9);

SELECT has_table(
  'public',
  'stripe_webhook_events',
  'stripe_webhook_events tablosu bulunmalı'
);

SELECT col_is_pk(
  'public',
  'stripe_webhook_events',
  'id',
  'Stripe olay kimliği birincil anahtar olmalı'
);

SELECT has_column(
  'public',
  'stripe_webhook_events',
  'event_type',
  'Olay türü tutulmalı'
);

SELECT has_column(
  'public',
  'stripe_webhook_events',
  'status',
  'İşleme durumu tutulmalı'
);

SELECT has_column(
  'public',
  'stripe_webhook_events',
  'attempt_count',
  'Deneme sayısı tutulmalı'
);

SELECT has_column(
  'public',
  'stripe_webhook_events',
  'processed_at',
  'Tamamlanma zamanı tutulmalı'
);

SELECT has_column(
  'public',
  'stripe_webhook_events',
  'last_attempt_at',
  'Güvenli yeniden deneme zamanı tutulmalı'
);

SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.stripe_webhook_events'::regclass),
  true,
  'Webhook olay tablosunda RLS açık olmalı'
);

SELECT is(
  has_table_privilege('authenticated', 'public.stripe_webhook_events', 'SELECT'),
  false,
  'Kimliği doğrulanmış kullanıcılar webhook olaylarını okuyamamalı'
);

SELECT * FROM finish();
ROLLBACK;
