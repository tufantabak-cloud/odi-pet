const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  // Try using RPC if exists, or just query all and group manually since supabase-js doesn't support GROUP BY natively unless using an RPC
  const { data, error } = await supabase.from('pets').select('species');
  if (error) {
    console.error('Error fetching pets:', error);
    process.exit(1);
  }

  const counts = {};
  for (const pet of data) {
    const s = pet.species || 'NULL';
    counts[s] = (counts[s] || 0) + 1;
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  console.log('Species Counts:');
  sorted.forEach(([s, c]) => console.log(`- ${s}: ${c}`));
}

run();
