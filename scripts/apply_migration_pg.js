require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function runPgMigration() {
  // Direct connection string
  const dbUrl = 'postgres://postgres.soautcxgiqhxiaxrubxv:att1472o@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
  const dbDirect = 'postgres://postgres:att1472o@db.soautcxgiqhxiaxrubxv.supabase.co:5432/postgres';

  console.log('Connecting to Supabase Direct DB...');

  const client = new Client({
    connectionString: dbDirect,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Direct DB successfully!');

    await client.query(`
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

      CREATE INDEX IF NOT EXISTS idx_article_media_article_id ON article_media(article_id);
      CREATE INDEX IF NOT EXISTS idx_article_media_type ON article_media(article_id, media_type);

      ALTER TABLE article_media ENABLE ROW LEVEL SECURITY;
    `);

    console.log('PostgreSQL migration applied successfully!');
  } catch (err) {
    console.error('PostgreSQL Direct DB Error:', err.message);
  } finally {
    await client.end();
  }
}

runPgMigration();
