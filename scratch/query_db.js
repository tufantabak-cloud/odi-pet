const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const now = new Date().toISOString();

  // Query overdue vaccine_records_v2
  const { data: v2, error } = await supabase
    .from('vaccine_records_v2')
    .select('id, pet_id, vaccine_name, vaccine_code, dose_number, status, due_at, pets(name, species)')
    .eq('status', 'overdue')
    .lte('due_at', now);

  if (error) {
    console.error("Error querying vaccine_records_v2:", error);
    return;
  }

  console.log(`=== OVERDUE VACCINE RECORDS V2 (${v2?.length || 0}) ===`);
  console.log(JSON.stringify(v2, null, 2));
}

main().catch(console.error);
