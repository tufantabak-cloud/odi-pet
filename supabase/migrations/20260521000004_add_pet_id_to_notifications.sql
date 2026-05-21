-- Add pet_id column to notifications table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'pet_id'
  ) THEN
    ALTER TABLE public.notifications 
    ADD COLUMN pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE;
  END IF;
END $$;
