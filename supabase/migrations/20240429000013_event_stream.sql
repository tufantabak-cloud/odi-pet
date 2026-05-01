-- Idempotent fixup for event_stream table
-- Adds any missing columns and indexes regardless of existing schema

DO $$
BEGIN
  -- event column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='event_stream' AND column_name='event') THEN
    ALTER TABLE public.event_stream ADD COLUMN event TEXT NOT NULL DEFAULT '';
  END IF;
  -- ts column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='event_stream' AND column_name='ts') THEN
    ALTER TABLE public.event_stream ADD COLUMN ts TIMESTAMPTZ DEFAULT now();
  END IF;
  -- payload column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='event_stream' AND column_name='payload') THEN
    ALTER TABLE public.event_stream ADD COLUMN payload JSONB DEFAULT '{}';
  END IF;
  -- profile_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='event_stream' AND column_name='profile_id') THEN
    ALTER TABLE public.event_stream ADD COLUMN profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Indexes (only created when columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='event_stream' AND column_name='ts')
  AND EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='event_stream' AND column_name='profile_id') THEN

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_event_stream_profile_ts
      ON public.event_stream(profile_id, ts DESC)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='event_stream' AND column_name='event')
  AND EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='event_stream' AND column_name='ts') THEN

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_event_stream_event_ts
      ON public.event_stream(event, ts DESC)';
  END IF;
END;
$$;

-- RLS
ALTER TABLE public.event_stream ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE tablename='event_stream' AND policyname='Users insert own events') THEN
    CREATE POLICY "Users insert own events" ON public.event_stream
      FOR INSERT WITH CHECK (profile_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE tablename='event_stream' AND policyname='Users read own events') THEN
    CREATE POLICY "Users read own events" ON public.event_stream
      FOR SELECT USING (profile_id = auth.uid());
  END IF;
END;
$$;
