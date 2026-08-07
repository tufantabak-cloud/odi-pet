require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function test() {
  console.log('Testing system_settings table read...');
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('key', 'membership_rules')
    .maybeSingle();

  if (error) {
    console.error('FAILED to read system_settings:', error);
    process.exit(1);
  }

  console.log('SUCCESS! Read system_settings:', data);
}

test();
