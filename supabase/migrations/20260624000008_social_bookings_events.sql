-- =============================================
-- SOCIAL, EVENTS & BOOKINGS MIGRATION
-- =============================================

-- 1. SOCIAL POSTS
CREATE TABLE IF NOT EXISTS public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  pet_id uuid REFERENCES public.pets(id) ON DELETE SET NULL,
  content text NOT NULL,
  media_url text,
  is_public boolean DEFAULT true,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;

-- 2. POST COMMENTS
CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.social_posts(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp DEFAULT now()
);

-- 3. POST LIKES
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.social_posts(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp DEFAULT now(),
  UNIQUE(post_id, profile_id)
);

-- 4. EVENTS (Etkinlikler)
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_date timestamp NOT NULL,
  location text,
  max_attendees integer,
  current_attendees integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

-- 5. EVENT ATTENDEES (Kayıtlar)
CREATE TABLE IF NOT EXISTS public.event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  pet_id uuid REFERENCES public.pets(id) ON DELETE SET NULL,
  status text DEFAULT 'registered', -- registered, cancelled, attended
  created_at timestamp DEFAULT now(),
  UNIQUE(event_id, profile_id)
);

-- 6. BUSINESS AVAILABILITY (İşletme Müsaitlik Saatleri)
CREATE TABLE IF NOT EXISTS public.business_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL, -- 1=Pazartesi, 7=Pazar
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

-- 7. BOOKINGS (Rezervasyonlar)
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  pet_id uuid REFERENCES public.pets(id) ON DELETE SET NULL,
  service_type text NOT NULL,
  booking_date timestamp NOT NULL,
  status text DEFAULT 'pending', -- pending, confirmed, cancelled, completed
  total_price decimal(10,2),
  notes text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- RLS POLICIES ENABLE
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- REALTIME ENABLE
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
-- Bookings kasıtlı olarak Realtime'a eklenmiyor (Push Notification ile yönetilecek)

-- POLICY: social_posts
CREATE POLICY "Public social_posts are viewable by everyone" ON public.social_posts FOR SELECT USING (is_public = true);
CREATE POLICY "Users can insert their own posts" ON public.social_posts FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "Users can update their own posts" ON public.social_posts FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY "Users can delete their own posts" ON public.social_posts FOR DELETE USING (author_id = auth.uid());

-- POLICY: post_comments
CREATE POLICY "Public comments are viewable by everyone" ON public.post_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.social_posts p WHERE p.id = post_id AND p.is_public = true)
);
CREATE POLICY "Users can insert comments" ON public.post_comments FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "Users can delete their own comments" ON public.post_comments FOR DELETE USING (author_id = auth.uid());

-- POLICY: post_likes
CREATE POLICY "Public likes are viewable by everyone" ON public.post_likes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.social_posts p WHERE p.id = post_id AND p.is_public = true)
);
CREATE POLICY "Users can insert likes" ON public.post_likes FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Users can delete their own likes" ON public.post_likes FOR DELETE USING (profile_id = auth.uid());

-- POLICY: events
CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (true);
CREATE POLICY "Organizers can insert events" ON public.events FOR INSERT WITH CHECK (organizer_id = auth.uid());
CREATE POLICY "Organizers can update their own events" ON public.events FOR UPDATE USING (organizer_id = auth.uid());
CREATE POLICY "Organizers can delete their own events" ON public.events FOR DELETE USING (organizer_id = auth.uid());

-- POLICY: event_attendees
CREATE POLICY "Attendees and organizers can view attendees" ON public.event_attendees FOR SELECT USING (
  profile_id = auth.uid() OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organizer_id = auth.uid())
);
CREATE POLICY "Users can register for events" ON public.event_attendees FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Users can cancel their own registration" ON public.event_attendees FOR DELETE USING (profile_id = auth.uid());

-- POLICY: business_availability
CREATE POLICY "Availability is viewable by everyone" ON public.business_availability FOR SELECT USING (true);
CREATE POLICY "Business owners can manage their availability" ON public.business_availability FOR ALL USING (
  EXISTS (SELECT 1 FROM public.business_profiles bp WHERE bp.id = business_id AND bp.profile_id = auth.uid())
);

-- POLICY: bookings
CREATE POLICY "Users and business owners can view their bookings" ON public.bookings FOR SELECT USING (
  owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.business_profiles bp WHERE bp.id = business_id AND bp.profile_id = auth.uid())
);
CREATE POLICY "Users can insert bookings" ON public.bookings FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users and business owners can update bookings" ON public.bookings FOR UPDATE USING (
  owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.business_profiles bp WHERE bp.id = business_id AND bp.profile_id = auth.uid())
);
