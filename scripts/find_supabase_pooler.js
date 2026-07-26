require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const hosts = [
  'db.soautcxgiqhxiaxrubxv.supabase.co',
  'aws-0-eu-central-1.pooler.supabase.com',
  'aws-0-eu-west-1.pooler.supabase.com'
];

const users = [
  'postgres',
  'postgres.soautcxgiqhxiaxrubxv',
  'soautcxgiqhxiaxrubxv'
];

async function findPooler() {
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    throw new Error('SUPABASE_DB_PASSWORD ortam değişkeni tanımlanmalıdır.');
  }

  for (const host of hosts) {
    for (const user of users) {
      for (const port of [5432, 6543]) {
        console.log(`Testing ${user}@${host}:${port}...`);
        const connectionString =
          `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/postgres`;
        const client = new Client({
          connectionString,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 3000
        });

        try {
          await client.connect();
          console.log(`SUCCESS! Connected via ${user}@${host}:${port}`);
          await client.end();
          return;
        } catch {
          try {
            await client.end();
          } catch {
            // Connection was never established.
          }
        }
      }
    }
  }

  throw new Error('Supabase pooler bağlantısı bulunamadı.');
}

findPooler().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
