-- Migration: Add cover_url and cover_position columns to pets table
ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS cover_url TEXT,
ADD COLUMN IF NOT EXISTS cover_position TEXT DEFAULT 'center';
