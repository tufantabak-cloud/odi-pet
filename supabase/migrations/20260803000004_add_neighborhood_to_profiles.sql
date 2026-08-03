-- Add neighborhood and postal_code columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS postal_code TEXT;

NOTIFY pgrst, 'reload schema';
