BEGIN;

SELECT plan(7);

SELECT ok(
  has_table_privilege(
    'authenticated',
    'public.profiles',
    'SELECT'
  )
  AND NOT has_table_privilege(
    'authenticated',
    'public.profiles',
    'INSERT, UPDATE, DELETE'
  )
  AND has_column_privilege(
    'authenticated',
    'public.profiles',
    'first_name',
    'UPDATE'
  )
  AND NOT has_column_privilege(
    'authenticated',
    'public.profiles',
    'role',
    'UPDATE'
  ),
  'authenticated profilde yalnızca güvenli alanları güncelleyebilmeli'
);

SELECT ok(
  has_table_privilege(
    'authenticated',
    'public.pets',
    'SELECT, INSERT, UPDATE, DELETE'
  ),
  'authenticated pet işlemleri için tablo ayrıcalıklarına sahip olmalı'
);

SELECT ok(
  has_table_privilege('authenticated', 'public.pet_owners', 'SELECT'),
  'authenticated pet sahipliğini okuyabilmeli'
);

SELECT ok(
  has_table_privilege('authenticated', 'public.user_subscriptions', 'SELECT'),
  'authenticated kendi aboneliğini okuyabilmeli'
);

SELECT ok(
  NOT has_table_privilege(
    'authenticated',
    'public.user_subscriptions',
    'UPDATE'
  ),
  'authenticated abonelik durumunu doğrudan güncelleyememeli'
);

SELECT ok(
  has_table_privilege(
    'authenticated',
    'public.subscription_plans',
    'SELECT'
  ),
  'authenticated etkin plan kataloğunu okuyabilmeli'
);

SELECT ok(
  NOT has_table_privilege(
    'authenticated',
    'public.stripe_webhook_events',
    'SELECT'
  ),
  'authenticated Stripe olay günlüğünü okuyamamalı'
);

SELECT * FROM finish();
ROLLBACK;
