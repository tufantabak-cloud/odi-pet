-- Add 'appetite' to pet_journal_entries entry_type CHECK constraint
-- 1. Drop existing constraint
-- 2. Add new constraint

ALTER TABLE public.pet_journal_entries DROP CONSTRAINT IF EXISTS pet_journal_entries_entry_type_check;

ALTER TABLE public.pet_journal_entries ADD CONSTRAINT pet_journal_entries_entry_type_check 
    CHECK (entry_type IN ('health', 'mood', 'nutrition', 'activity', 'note', 'appetite'));
