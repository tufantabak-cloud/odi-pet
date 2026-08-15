require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Supabase credentials missing!');
  process.exit(1);
}

const supabase = createClient(url, key);

async function testApi() {
  const petId = '47ae5aca-2fef-438e-8c53-8ffc12d7cea8';

  const { data: petBefore } = await supabase.from('pets').select('id, name, target_weight_kg').eq('id', petId).single();
  console.log('Pet before update:', petBefore);

  const { data: updated, error } = await supabase.from('pets').update({ target_weight_kg: 6.2 }).eq('id', petId).select('id, name, target_weight_kg').single();
  console.log('Pet after update (6.2 kg):', { updated, error });
}

testApi().catch(console.error);
