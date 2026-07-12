import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runTests() {
  const TEST_PET_ID = process.env.TEST_PET_ID || 'a605bdcc-2b25-4751-beaa-40ef5f283abc';

  // Get user_id for the pet
  const { data: petData } = await supabase.from('pets').select('owner_id').eq('id', TEST_PET_ID).single();
  const TEST_USER_ID = petData?.owner_id;

  console.log("\n=== TEST 3 (Yeniden): Insert Testi ===");
  const insertPayload = {
    pet_id: TEST_PET_ID,
    user_id: TEST_USER_ID,
    category: 'asi',
    sub_type: 'Kuduz Aşısı',
    status: 'active',
    extra_data: {
      vaccine_code: 'RABIES',
      record_type: 'planned',
      source: 'api_test'
    }
  };
  
  console.log("Inserting:", JSON.stringify(insertPayload, null, 2));
  const { data: insertedData, error: e3 } = await supabase
    .from('plans')
    .insert([insertPayload])
    .select();

  if (e3) {
    console.error("Insert failed:", e3);
  } else {
    console.log("Insert success. Inserted row:", JSON.stringify(insertedData, null, 2));
    
    // Verify fields
    const row = insertedData[0];
    console.log(`Verify sub_type: ${row.sub_type === 'Kuduz Aşısı'}`);
    console.log(`Verify vaccine_code: ${row.extra_data.vaccine_code === 'RABIES'}`);
    console.log(`Verify record_type: ${row.extra_data.record_type === 'planned'}`);
    console.log(`Verify source: ${row.extra_data.source === 'api_test'}`);
    
    // Clean up
    console.log("\nCleaning up (Deleting inserted row)...");
    const { error: delErr } = await supabase
      .from('plans')
      .delete()
      .eq('id', row.id);
    if (delErr) console.error("Delete failed:", delErr);
    else console.log(`Successfully deleted row ${row.id}`);
  }
}

runTests();
