-- Add 2nd emergency contact columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact2_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact2_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact2_relation TEXT;
