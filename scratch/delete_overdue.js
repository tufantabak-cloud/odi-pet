const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const now = new Date().toISOString();

  // Fetch the 12 overdue vaccine records first to log them
  const { data: overdueRecs, error: fetchError } = await supabase
    .from('vaccine_records_v2')
    .select('id, vaccine_name, due_at, status')
    .eq('status', 'overdue');

  if (fetchError) {
    console.error("Error fetching overdue records:", fetchError);
    return;
  }

  console.log(`Found ${overdueRecs?.length || 0} overdue vaccine records to delete:`);
  console.log(JSON.stringify(overdueRecs, null, 2));

  if (!overdueRecs || overdueRecs.length === 0) {
    console.log("No overdue records found to delete.");
    return;
  }

  // Delete them
  const idsToDelete = overdueRecs.map(r => r.id);
  const { data: deleted, error: deleteError } = await supabase
    .from('vaccine_records_v2')
    .delete()
    .in('id', idsToDelete)
    .select();

  if (deleteError) {
    console.error("Error deleting overdue records:", deleteError);
    return;
  }

  console.log(`Successfully deleted ${deleted?.length || 0} vaccine records!`);
}

main().catch(console.error);
