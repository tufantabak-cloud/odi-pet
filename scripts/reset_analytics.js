require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function resetAnalytics() {
  console.log('Clearing orchestrator_analytics for campaign 4a6e2086-02f9-4a34-bad7-584cfd15d077...');

  const { error } = await supabase
    .from('orchestrator_analytics')
    .delete()
    .eq('campaign_id', '4a6e2086-02f9-4a34-bad7-584cfd15d077');

  if (error) {
    console.error('Delete error:', error);
  } else {
    console.log('SUCCESS! Analytics cleared. Campaign is ready to be shown again for user testing!');
  }
}

resetAnalytics().catch(console.error);
