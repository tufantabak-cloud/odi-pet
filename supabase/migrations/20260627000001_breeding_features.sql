-- 20260627000001_breeding_features.sql

ALTER TABLE public.breeding_listings
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS estrus_start_date DATE,
ADD COLUMN IF NOT EXISTS estrus_end_date DATE,
ADD COLUMN IF NOT EXISTS estrus_notification_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS experience_level TEXT DEFAULT 'beginner'
  CHECK (experience_level IN ('beginner','experienced','expert'));
