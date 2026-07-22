require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verifyDetails() {
  console.log('--- Canlı DB Şema & Güvenlik Detay Taraması ---');

  // 1. Articles Kolonları
  const { data: artCols } = await supabase.rpc('execute_sql', {
    query: `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'articles'`
  });

  // 2. Article Pet States Kolonları
  const { data: stateCols } = await supabase.rpc('execute_sql', {
    query: `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'article_pet_states'`
  });

  // 3. Constraintler
  const { data: constraints } = await supabase.rpc('execute_sql', {
    query: `SELECT conrelid::regclass::text AS table_name, conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid IN ('public.articles'::regclass, 'public.article_pet_states'::regclass, 'public.article_saves'::regclass)`
  });

  // 4. Indeksler
  const { data: indexes } = await supabase.rpc('execute_sql', {
    query: `SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('articles', 'article_pet_states', 'article_saves')`
  });

  // 5. Triggerlar
  const { data: triggers } = await supabase.rpc('execute_sql', {
    query: `SELECT event_object_table AS table_name, trigger_name, action_statement FROM information_schema.triggers WHERE event_object_schema = 'public' AND event_object_table = 'article_pet_states'`
  });

  // 6. RLS Kuralları
  const { data: policies } = await supabase.rpc('execute_sql', {
    query: `SELECT tablename, policyname, roles, cmd, qual FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('articles', 'article_pet_states', 'article_saves')`
  });

  const fullReport = {
    articles_columns: artCols,
    article_pet_states_columns: stateCols,
    constraints: constraints,
    indexes: indexes,
    triggers: triggers,
    policies: policies
  };

  fs.writeFileSync('live_db_verification_report.json', JSON.stringify(fullReport, null, 2));
  console.log('✅ Canlı DB detay doğrulama raporu "live_db_verification_report.json" dosyasına yazıldı.');
}

verifyDetails();
