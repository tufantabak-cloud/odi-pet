require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function run() {
  const connectionString =
    process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('ERROR: SUPABASE_DB_URL or DATABASE_URL is not defined in .env.local or .env');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL / Supabase DB...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Database!');

    const sqlPath = path.join(__dirname, '../supabase/migrations/20260807050000_system_settings_and_welcome_credit.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Applying migration 20260807050000_system_settings_and_welcome_credit.sql...');
    await client.query(sql);
    console.log('Migration SQL executed successfully!');

    // Reload PostgREST schema cache so API endpoints instantly detect system_settings table
    console.log('Reloading PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('PostgREST schema cache reloaded!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
