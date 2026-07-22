require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyMigration() {
  console.log('=== Applying 20260722150000_article_sources_and_media.sql via Postgres REST ===');

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({
        sql_query: `
          ALTER TABLE article_sources ADD COLUMN IF NOT EXISTS source_name text;
          ALTER TABLE article_sources ADD COLUMN IF NOT EXISTS instagram_username text;
          ALTER TABLE article_sources ADD COLUMN IF NOT EXISTS short_description text;
          ALTER TABLE article_sources ADD COLUMN IF NOT EXISTS display_in_article boolean DEFAULT true;
          ALTER TABLE article_sources ADD COLUMN IF NOT EXISTS show_source_name boolean DEFAULT true;
          ALTER TABLE article_sources ADD COLUMN IF NOT EXISTS show_source_link boolean DEFAULT true;
          ALTER TABLE article_sources ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
          ALTER TABLE article_sources ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'proposed';
          ALTER TABLE article_sources ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
          ALTER TABLE article_sources ADD COLUMN IF NOT EXISTS verified_at timestamptz;

          CREATE TABLE IF NOT EXISTS article_media (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
            media_type text NOT NULL CHECK (media_type IN ('featured_image', 'content_image', 'gallery_image')),
            storage_path text,
            external_url text,
            alt_text text NOT NULL,
            caption text,
            source_name text,
            source_url text,
            rights_status text NOT NULL CHECK (rights_status IN ('owned', 'licensed', 'permission_granted', 'public_domain', 'embed_only', 'unknown')),
            rights_note text,
            display_order integer DEFAULT 0,
            is_active boolean DEFAULT true,
            created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
          );
        `
      })
    });

    console.log('SQL Exec Status:', res.status);
  } catch (e) {
    console.error('RPC exec error:', e.message);
  }

  // Verifying article_media
  const { data, error } = await supabase.from('article_media').select('*').limit(1);
  console.log('article_media table status:', data, error?.message || 'Table exists!');
}

applyMigration();
