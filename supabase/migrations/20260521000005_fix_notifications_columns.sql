-- Add type and sent_email columns to notifications table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'type'
  ) THEN
    ALTER TABLE public.notifications 
    ADD COLUMN type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('vaccine_reminder','vaccine_overdue','general'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'sent_email'
  ) THEN
    ALTER TABLE public.notifications 
    ADD COLUMN sent_email BOOLEAN DEFAULT FALSE;
  END IF;
END $$;
