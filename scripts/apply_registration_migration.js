require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function runRegistrationMigration() {
  const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.log('SUPABASE_DB_URL or DATABASE_URL not set in .env.local, skipping direct DB execution.');
    return;
  }

  console.log('Connecting to Supabase Direct DB...');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Direct DB successfully!');

    await client.query(`
      ALTER TABLE public.pets
        ADD COLUMN IF NOT EXISTS registration_city TEXT,
        ADD COLUMN IF NOT EXISTS registration_district TEXT,
        ADD COLUMN IF NOT EXISTS agriculture_directorate TEXT;

      GRANT UPDATE (registration_city, registration_district, agriculture_directorate) ON TABLE public.pets TO authenticated;
    `);

    console.log('Registration fields migration applied to PostgreSQL database successfully!');
  } catch (error) {
    console.error('PostgreSQL Direct DB Error:', error.message);
  } finally {
    await client.end();
  }
}

runRegistrationMigration().catch((error) => {
  console.error(error.message);
});
