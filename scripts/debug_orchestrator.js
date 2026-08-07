require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function debugOrchestrator() {
  console.log('--- Debugging Orchestrator Active Campaigns ---');

  const now = new Date().toISOString();
  console.log('Current ISO Time:', now);

  // 1. Fetch campaigns
  const { data: campaigns, error: campErr } = await supabase
    .from('orchestrator_campaigns')
    .select('*, orchestrator_prompts(*)')
    .eq('status', 'active');

  console.log(`Found ${campaigns?.length || 0} active campaigns:`);
  for (const c of campaigns || []) {
    console.log(`\nCampaign ID: ${c.id}`);
    console.log(`  Name: ${c.name}`);
    console.log(`  Status: ${c.status}`);
    console.log(`  Start Date: ${c.start_date}`);
    console.log(`  End Date: ${c.end_date}`);
    console.log(`  Trigger Events:`, c.trigger_events);
    console.log(`  Prompts:`, c.orchestrator_prompts);
  }

  // 2. Fetch recent analytics
  const { data: analytics } = await supabase
    .from('orchestrator_analytics')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log(`\nRecent Analytics (${analytics?.length || 0}):`);
  for (const a of analytics || []) {
    console.log(`  [${a.created_at}] Profile: ${a.profile_id} | Event: ${a.event_type} | Campaign: ${a.campaign_id}`);
  }

  // 3. Fetch profiles to check saved addresses
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, phone, emergency_contact_phone, city, district');

  console.log(`\nUser Profiles (${profiles?.length || 0}):`);
  for (const p of profiles || []) {
    console.log(`  ID: ${p.id} | Name: ${p.first_name} | City: ${p.city} | Phone: ${p.phone} | Emergency Phone: ${p.emergency_contact_phone}`);
  }
}

debugOrchestrator().catch(console.error);
