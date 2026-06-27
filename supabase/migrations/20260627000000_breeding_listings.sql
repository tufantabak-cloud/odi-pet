CREATE TABLE IF NOT EXISTS public.breeding_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'breeding' 
    CHECK (purpose IN ('breeding', 'playdate')),
  preferred_date_start TIMESTAMPTZ,
  preferred_date_end TIMESTAMPTZ,
  notes TEXT,
  requirements TEXT[] DEFAULT '{}'::TEXT[],
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.breeding_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active breeding listings" 
  ON public.breeding_listings FOR SELECT 
  USING (status = 'active');

CREATE POLICY "Users can manage their own breeding listings" 
  ON public.breeding_listings FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);
