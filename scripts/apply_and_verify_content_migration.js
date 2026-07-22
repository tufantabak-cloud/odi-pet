require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSQL(ddlText) {
  const cleanDdl = ddlText.trim().replace(/;$/, '');
  let { error } = await supabase.rpc('execute_ddl', { ddl: cleanDdl });
  if (error) {
    console.error('DDL Çalıştırma Hatası:', error.message, '\nSQL:', cleanDdl.substring(0, 100));
    throw error;
  }
}

async function run() {
  console.log('--- 1. Migration Tekil DDL Komutlarıyla Uygulanıyor ---');

  const statements = [
    // 1. articles kolonları
    `ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false`,
    `ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS species_filter text[] DEFAULT '{}'`,
    `ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS target_breed_keys text[] DEFAULT '{}'`,
    `ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS target_breed_traits text[] DEFAULT '{}'`,
    `ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS target_life_stages text[] DEFAULT '{}'`,
    `ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS target_genders text[] DEFAULT '{}'`,
    `ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS target_neutered_status text DEFAULT 'all'`,
    `ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS target_seasons text[] DEFAULT '{}'`,
    `ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS start_date date`,
    `ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS end_date date`,
    `ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS priority_order integer DEFAULT 0`,
    `ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS is_medical_content boolean DEFAULT false`,
    `ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS vet_review_status text DEFAULT 'not_required'`,
    `ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS vet_reviewed_by uuid REFERENCES public.profiles(id)`,
    `ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS vet_reviewed_at timestamptz`,
    `ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS references_list text[] DEFAULT '{}'`,

    // Constraints
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'articles_vet_review_status_check') THEN ALTER TABLE public.articles ADD CONSTRAINT articles_vet_review_status_check CHECK (vet_review_status IN ('not_required', 'pending', 'approved')); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'articles_neutered_status_check') THEN ALTER TABLE public.articles ADD CONSTRAINT articles_neutered_status_check CHECK (target_neutered_status IN ('all', 'neutered', 'intact')); END IF; END $$`,

    // Indeksler
    `CREATE INDEX IF NOT EXISTS idx_articles_species ON public.articles USING GIN (species_filter)`,
    `CREATE INDEX IF NOT EXISTS idx_articles_breed_keys ON public.articles USING GIN (target_breed_keys)`,
    `CREATE INDEX IF NOT EXISTS idx_articles_breed_traits ON public.articles USING GIN (target_breed_traits)`,
    `CREATE INDEX IF NOT EXISTS idx_articles_life_stages ON public.articles USING GIN (target_life_stages)`,
    `CREATE INDEX IF NOT EXISTS idx_articles_priority ON public.articles (priority_order, is_published)`,

    // 2. article_pet_states Tablosu
    `CREATE TABLE IF NOT EXISTS public.article_pet_states (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
      article_id uuid REFERENCES public.articles(id) ON DELETE CASCADE NOT NULL,
      last_shown_at timestamptz,
      last_viewed_at timestamptz,
      read_at timestamptz,
      dismissed_at timestamptz,
      created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
      CONSTRAINT article_pet_states_user_pet_article_key UNIQUE (user_id, pet_id, article_id)
    )`,

    `CREATE INDEX IF NOT EXISTS idx_article_pet_states_lookup ON public.article_pet_states (user_id, pet_id, article_id)`,

    // Trigger
    `CREATE OR REPLACE FUNCTION public.update_article_pet_states_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = timezone('utc'::text, now()); RETURN NEW; END $$ LANGUAGE plpgsql`,
    `DROP TRIGGER IF EXISTS update_article_pet_states_updated_at_trigger ON public.article_pet_states`,
    `CREATE TRIGGER update_article_pet_states_updated_at_trigger BEFORE UPDATE ON public.article_pet_states FOR EACH ROW EXECUTE FUNCTION public.update_article_pet_states_updated_at()`,

    // 3. RLS
    `ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY`,
    `DROP POLICY IF EXISTS "Anyone can read published articles" ON public.articles`,
    `DROP POLICY IF EXISTS "Anyone can read eligible published articles" ON public.articles`,
    `CREATE POLICY "Anyone can read eligible published articles" ON public.articles FOR SELECT USING ((is_published = true AND (is_medical_content = false OR vet_review_status = 'approved')) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'founder')))`,
    `DROP POLICY IF EXISTS "Admin and founder can manage articles" ON public.articles`,
    `CREATE POLICY "Admin and founder can manage articles" ON public.articles FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'founder'))) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'founder')))`,

    // article_pet_states RLS
    `ALTER TABLE public.article_pet_states ENABLE ROW LEVEL SECURITY`,
    `DROP POLICY IF EXISTS "Users can view own pet article states" ON public.article_pet_states`,
    `CREATE POLICY "Users can view own pet article states" ON public.article_pet_states FOR SELECT USING (auth.uid() = user_id AND (EXISTS (SELECT 1 FROM public.pets WHERE pets.id = article_pet_states.pet_id AND pets.owner_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.pet_owners WHERE pet_owners.pet_id = article_pet_states.pet_id AND pet_owners.profile_id = auth.uid())))`,

    `DROP POLICY IF EXISTS "Users can insert own pet article states" ON public.article_pet_states`,
    `CREATE POLICY "Users can insert own pet article states" ON public.article_pet_states FOR INSERT WITH CHECK (auth.uid() = user_id AND (EXISTS (SELECT 1 FROM public.pets WHERE pets.id = article_pet_states.pet_id AND pets.owner_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.pet_owners WHERE pet_owners.pet_id = article_pet_states.pet_id AND pet_owners.profile_id = auth.uid())))`,

    `DROP POLICY IF EXISTS "Users can update own pet article states" ON public.article_pet_states`,
    `CREATE POLICY "Users can update own pet article states" ON public.article_pet_states FOR UPDATE USING (auth.uid() = user_id AND (EXISTS (SELECT 1 FROM public.pets WHERE pets.id = article_pet_states.pet_id AND pets.owner_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.pet_owners WHERE pet_owners.pet_id = article_pet_states.pet_id AND pet_owners.profile_id = auth.uid()))) WITH CHECK (auth.uid() = user_id AND (EXISTS (SELECT 1 FROM public.pets WHERE pets.id = article_pet_states.pet_id AND pets.owner_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.pet_owners WHERE pet_owners.pet_id = article_pet_states.pet_id AND pet_owners.profile_id = auth.uid())))`,

    `DROP POLICY IF EXISTS "Users can delete own pet article states" ON public.article_pet_states`,
    `CREATE POLICY "Users can delete own pet article states" ON public.article_pet_states FOR DELETE USING (auth.uid() = user_id AND (EXISTS (SELECT 1 FROM public.pets WHERE pets.id = article_pet_states.pet_id AND pets.owner_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.pet_owners WHERE pet_owners.pet_id = article_pet_states.pet_id AND pet_owners.profile_id = auth.uid())))`
  ];

  for (let i = 0; i < statements.length; i++) {
    try {
      await runSQL(statements[i]);
    } catch (e) {
      console.error(`Komut #${i + 1} başarısız oldu:`, statements[i]);
      process.exit(1);
    }
  }

  console.log('✅ Migration canlı DB\'ye sorunsuz uygulandı.');

  console.log('\n--- 2. Canlı RLS ve Güvenlik Testleri ---');

  // Test Makalesi
  const { data: testArtPending } = await supabase
    .from('articles')
    .upsert({
      title: 'RLS Tıbbi Onaysız Test',
      slug: 'rls-tibbi-onaysiz-test',
      content: 'Tıbbi taslak...',
      is_published: true,
      is_medical_content: true,
      vet_review_status: 'pending'
    })
    .select()
    .single();

  const { data: testArtApproved } = await supabase
    .from('articles')
    .upsert({
      title: 'RLS Tıbbi Onaylı Test',
      slug: 'rls-tibbi-onayli-test',
      content: 'Tıbbi onaylı...',
      is_published: true,
      is_medical_content: true,
      vet_review_status: 'approved'
    })
    .select()
    .single();

  const anonSupabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const { data: pendingRead } = await anonSupabase.from('articles').select('id').eq('id', testArtPending.id);
  const { data: approvedRead } = await anonSupabase.from('articles').select('id').eq('id', testArtApproved.id);

  console.log('• RLS Test A (Tıbbi & Pending İçerik Gizli mi?):', pendingRead && pendingRead.length === 0 ? 'GEÇTİ (Gizli)' : 'BAŞARISIZ');
  console.log('• RLS Test B (Tıbbi & Approved İçerik Görünür mü?):', approvedRead && approvedRead.length === 1 ? 'GEÇTİ (Görünüyor)' : 'BAŞARISIZ');

  // Temizlik
  if (testArtPending?.id) await supabase.from('articles').delete().eq('id', testArtPending.id);
  if (testArtApproved?.id) await supabase.from('articles').delete().eq('id', testArtApproved.id);

  console.log('\n✅ Canlı DB doğrulaması başarıyla bitti.');
}

run();
