-- 1. Drop the existing type constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 2. Add the extended type constraint
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('vaccine_reminder', 'vaccine_overdue', 'general', 'estrus_forecast_upcoming', 'estrus_cycle_review'));

-- 3. Add idempotency_key column
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 4. Create partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_idempotency_key
ON public.notifications (idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- 5. Create pet_estrus_preferences table
CREATE TABLE IF NOT EXISTS public.pet_estrus_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL UNIQUE
    REFERENCES public.pets(id) ON DELETE CASCADE,
  reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Enable RLS on preferences
ALTER TABLE public.pet_estrus_preferences ENABLE ROW LEVEL SECURITY;

-- 7. Add Select policy for owner
CREATE POLICY "Users can view their own pet's estrus preferences"
ON public.pet_estrus_preferences
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.pets
    WHERE pets.id = pet_estrus_preferences.pet_id
    AND pets.owner_id = auth.uid()
  )
);
