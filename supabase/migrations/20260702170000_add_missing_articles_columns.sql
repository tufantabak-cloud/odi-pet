-- Migration: Add missing columns and policies from sprint6 to articles, conversations, messages, admin_audit_logs and pet_expenses
-- Created: 2026-07-02 17:00:00

-- 1. articles Tablosu Eksik Kolonlar ve Indeksler
ALTER TABLE public.articles 
  ADD COLUMN IF NOT EXISTS excerpt text,
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS species_filter text[],
  ADD COLUMN IF NOT EXISTS tags text[],
  ADD COLUMN IF NOT EXISTS read_time_minutes integer,
  ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_sponsored boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsor_name text,
  ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS like_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published_at timestamp;

CREATE INDEX IF NOT EXISTS idx_articles_category ON public.articles (category, is_published);
CREATE INDEX IF NOT EXISTS idx_articles_species ON public.articles USING GIN (species_filter);

-- 2. conversations Tablosu Eksik Kolonlar
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id),
  ADD COLUMN IF NOT EXISTS last_message_at timestamp,
  ADD COLUMN IF NOT EXISTS last_message_preview text,
  ADD COLUMN IF NOT EXISTS unread_count_1 integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unread_count_2 integer DEFAULT 0;

-- 3. messages Tablosu Eksik Kolonlar
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Realtime yetkisi (bookings KASITLI OLARAK EKLENMEDİ)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Realtime yetkisi hatalarını sessizce yut (bypass)
END $$;

-- 4. admin_audit_logs Tablosu Eksik Kolonlar
ALTER TABLE public.admin_audit_logs
  ADD COLUMN IF NOT EXISTS ip_address text;

-- 5. pet_expenses Tablosu Eksik Kolonlar
ALTER TABLE public.pet_expenses 
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS expense_date timestamp;

-- 6. RLS ve Policies Kurulumu
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Articles policies
DROP POLICY IF EXISTS "Anyone can read published articles" ON public.articles;
CREATE POLICY "Anyone can read published articles" ON public.articles FOR SELECT USING (is_published = true);

-- Article Saves policies (sprint_integrations tablosunda user_id kullanıldığı için ona bağladık)
DROP POLICY IF EXISTS "Users can read their saved articles" ON public.article_saves;
CREATE POLICY "Users can read their saved articles" ON public.article_saves FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can save articles" ON public.article_saves;
CREATE POLICY "Users can save articles" ON public.article_saves FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their saved articles" ON public.article_saves;
CREATE POLICY "Users can delete their saved articles" ON public.article_saves FOR DELETE USING (auth.uid() = user_id);

-- Conversations policies
DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
CREATE POLICY "Participants can view conversations" ON public.conversations FOR SELECT USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

DROP POLICY IF EXISTS "Participants can insert conversations" ON public.conversations;
CREATE POLICY "Participants can insert conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
CREATE POLICY "Participants can update conversations" ON public.conversations FOR UPDATE USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Messages policies
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
CREATE POLICY "Participants can view messages" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = messages.conversation_id AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  )
);

DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
CREATE POLICY "Participants can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Participants can update their messages" ON public.messages;
CREATE POLICY "Participants can update their messages" ON public.messages FOR UPDATE USING (auth.uid() = sender_id);
