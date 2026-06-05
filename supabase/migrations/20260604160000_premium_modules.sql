-- Create pet_gallery table
CREATE TABLE IF NOT EXISTS public.pet_gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create pet_expenses table
CREATE TABLE IF NOT EXISTS public.pet_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    category TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create pet_matches table
CREATE TABLE IF NOT EXISTS public.pet_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    target_pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('liked', 'passed', 'matched')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(pet_id, target_pet_id)
);

-- Create pet_adoptions table
CREATE TABLE IF NOT EXISTS public.pet_adoptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    story TEXT,
    requirements TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.pet_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_adoptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pet_gallery
CREATE POLICY "Users can view their own pet gallery" ON public.pet_gallery FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert into their own pet gallery" ON public.pet_gallery FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own pet gallery" ON public.pet_gallery FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for pet_expenses
CREATE POLICY "Users can view their own pet expenses" ON public.pet_expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert into their own pet expenses" ON public.pet_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own pet expenses" ON public.pet_expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own pet expenses" ON public.pet_expenses FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for pet_matches
CREATE POLICY "Users can view matches related to their pets" ON public.pet_matches FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.pets WHERE id = pet_matches.pet_id AND owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.pets WHERE id = pet_matches.target_pet_id AND owner_id = auth.uid())
);
CREATE POLICY "Users can insert matches for their pets" ON public.pet_matches FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.pets WHERE id = pet_matches.pet_id AND owner_id = auth.uid())
);
CREATE POLICY "Users can update matches for their pets" ON public.pet_matches FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.pets WHERE id = pet_matches.pet_id AND owner_id = auth.uid())
);

-- RLS Policies for pet_adoptions
CREATE POLICY "Anyone can view active adoptions" ON public.pet_adoptions FOR SELECT USING (status = 'active');
CREATE POLICY "Users can view all their own adoptions" ON public.pet_adoptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert adoptions for their pets" ON public.pet_adoptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own adoptions" ON public.pet_adoptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own adoptions" ON public.pet_adoptions FOR DELETE USING (auth.uid() = user_id);

-- Insert Storage Bucket (Must run as superuser or using the storage API usually, but adding for completeness)
INSERT INTO storage.buckets (id, name, public) VALUES ('pet_gallery_bucket', 'pet_gallery_bucket', true) ON CONFLICT DO NOTHING;

-- Storage Policies for pet_gallery_bucket
CREATE POLICY "Anyone can view pet_gallery_bucket" ON storage.objects FOR SELECT USING (bucket_id = 'pet_gallery_bucket');
CREATE POLICY "Authenticated users can upload to pet_gallery_bucket" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pet_gallery_bucket' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own uploads in pet_gallery_bucket" ON storage.objects FOR UPDATE USING (bucket_id = 'pet_gallery_bucket' AND auth.uid() = owner);
CREATE POLICY "Users can delete their own uploads in pet_gallery_bucket" ON storage.objects FOR DELETE USING (bucket_id = 'pet_gallery_bucket' AND auth.uid() = owner);
