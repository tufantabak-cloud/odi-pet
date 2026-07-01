ALTER TABLE pets
ADD COLUMN health_history_status TEXT DEFAULT 'pending'
CHECK (health_history_status IN ('pending', 'completed', 'skipped'));
