import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runTests() {
  console.log("=== Vercel Deployment URL ===");
  console.log("https://odi-petcare.vercel.app or https://odi.pet\n");

  const TEST_PET_ID = process.env.TEST_PET_ID || 'a605bdcc-2b25-4751-beaa-40ef5f283abc';
  console.log("Using Test Pet ID:", TEST_PET_ID);

  console.log("\n=== TEST 2: Son 3 Plan Kaydı (Aşı) ===");
  const { data: q2, error: e2 } = await supabase
    .from('plans')
    .select('id, sub_type, extra_data, status, created_at')
    .eq('category', 'asi')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (e2) console.error(e2);
  else console.log(JSON.stringify(q2, null, 2));

  console.log("\n=== TEST 3: Insert Testi ===");
  const insertPayload = {
    pet_id: TEST_PET_ID,
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

  console.log("\n=== TEST 4: Aşı Ekranı Sorgusu Testi ===");
  const { data: q4, error: e4 } = await supabase
    .from('plans')
    .select('id, sub_type, status, extra_data')
    .eq('category', 'asi')
    .in('status', ['active', 'overdue'])
    .order('scheduled_at', { ascending: true })
    .limit(10);

  if (e4) {
    // maybe scheduled_at doesn't exist on plans?
    console.error("Query 4 failed:", e4.message);
    console.log("Retrying without order by scheduled_at...");
    const { data: q4_retry } = await supabase
      .from('plans')
      .select('id, sub_type, status, extra_data')
      .eq('category', 'asi')
      .in('status', ['active', 'overdue'])
      .limit(10);
    console.log(JSON.stringify(q4_retry, null, 2));
  } else {
    console.log(JSON.stringify(q4, null, 2));
  }
}

runTests();
