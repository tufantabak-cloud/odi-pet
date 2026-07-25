-- RLS politikaları tek başına yeterli değildir; PostgREST isteğinin tablo
-- ayrıcalığına da ihtiyacı vardır. Yerel ve yeni kurulumlarda eksik kalan
-- authenticated ayrıcalıklarını yalnızca mevcut RLS politika komutlarından
-- türeterek verir. RLS'siz veya politikasız tablolar bu işlemden etkilenmez.
GRANT USAGE ON SCHEMA public TO authenticated;

DO $$
DECLARE
  grant_record record;
BEGIN
  FOR grant_record IN
    WITH policy_operations AS (
      SELECT
        policy.schemaname,
        policy.tablename,
        unnest(
          CASE policy.cmd
            WHEN 'ALL' THEN ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']
            ELSE ARRAY[policy.cmd]
          END
        ) AS operation
      FROM pg_policies AS policy
      JOIN pg_class AS table_class
        ON table_class.relname = policy.tablename
      JOIN pg_namespace AS table_namespace
        ON table_namespace.oid = table_class.relnamespace
       AND table_namespace.nspname = policy.schemaname
      WHERE policy.schemaname = 'public'
        AND table_class.relrowsecurity
        AND (
          'public' = ANY(policy.roles)
          OR 'authenticated' = ANY(policy.roles)
        )
    )
    SELECT
      schemaname,
      tablename,
      string_agg(DISTINCT operation, ', ' ORDER BY operation) AS operations
    FROM policy_operations
    GROUP BY schemaname, tablename
  LOOP
    EXECUTE format(
      'GRANT %s ON TABLE %I.%I TO authenticated',
      grant_record.operations,
      grant_record.schemaname,
      grant_record.tablename
    );
  END LOOP;
END
$$;

-- INSERT politikası bulunan ve seri/identity kullanan tablolar için gerekli
-- dizi yetkisini de aynı dar kapsamla tamamla.
DO $$
DECLARE
  sequence_record record;
BEGIN
  FOR sequence_record IN
    SELECT DISTINCT
      sequence_namespace.nspname AS sequence_schema,
      sequence_class.relname AS sequence_name
    FROM pg_class AS table_class
    JOIN pg_namespace AS table_namespace
      ON table_namespace.oid = table_class.relnamespace
    JOIN pg_depend AS dependency
      ON dependency.refobjid = table_class.oid
     AND dependency.deptype IN ('a', 'i')
    JOIN pg_class AS sequence_class
      ON sequence_class.oid = dependency.objid
     AND sequence_class.relkind = 'S'
    JOIN pg_namespace AS sequence_namespace
      ON sequence_namespace.oid = sequence_class.relnamespace
    WHERE table_namespace.nspname = 'public'
      AND table_class.relrowsecurity
      AND EXISTS (
        SELECT 1
        FROM pg_policies AS policy
        WHERE policy.schemaname = table_namespace.nspname
          AND policy.tablename = table_class.relname
          AND policy.cmd IN ('ALL', 'INSERT')
          AND (
            'public' = ANY(policy.roles)
            OR 'authenticated' = ANY(policy.roles)
          )
      )
  LOOP
    EXECUTE format(
      'GRANT USAGE, SELECT ON SEQUENCE %I.%I TO authenticated',
      sequence_record.sequence_schema,
      sequence_record.sequence_name
    );
  END LOOP;
END
$$;
