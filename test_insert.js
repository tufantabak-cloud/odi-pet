const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const testPetId = 'b0000000-0000-0000-0000-000000000001';
  
  // Clean up previous run if exists
  await supabase.from('pets').delete().eq('id', testPetId);

  // Insert test pet with 'cat'
  const { data, error } = await supabase.from('pets').insert({
    id: testPetId,
    owner_id: '4f1256db-2a84-434d-852c-bdba22e538ca', // Some valid user ID, using the one from the previous error
    name: 'Regression Test Cat',
    species: 'cat',
    breed: 'Tekir',
    is_neutered: false
  }).select().single();

  if (error) {
    console.error('Insert Failed:', error);
  } else {
    console.log('✅ Insert Successful! Species saved as:', data.species);
    // Cleanup
    await supabase.from('pets').delete().eq('id', testPetId);
  }
}

run();
