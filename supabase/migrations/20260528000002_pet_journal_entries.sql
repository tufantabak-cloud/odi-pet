CREATE TABLE pet_journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('health', 'mood', 'nutrition', 'activity', 'note')),
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE pet_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own pet's journal entries"
    ON pet_journal_entries FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert journal entries for their pets"
    ON pet_journal_entries FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own pet's journal entries"
    ON pet_journal_entries FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own pet's journal entries"
    ON pet_journal_entries FOR DELETE
    USING (user_id = auth.uid());
