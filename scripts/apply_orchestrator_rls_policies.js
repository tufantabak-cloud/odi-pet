require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function addAdminRlsPolicies() {
  console.log('Adding INSERT/UPDATE/DELETE policies for orchestrator tables...');

  const policies = [
    `CREATE POLICY "Users can insert orchestrator campaigns" ON public.orchestrator_campaigns FOR INSERT TO authenticated WITH CHECK (true)`,
    `CREATE POLICY "Users can update orchestrator campaigns" ON public.orchestrator_campaigns FOR UPDATE TO authenticated USING (true)`,
    `CREATE POLICY "Users can delete orchestrator campaigns" ON public.orchestrator_campaigns FOR DELETE TO authenticated USING (true)`,
    `CREATE POLICY "Users can insert orchestrator prompts" ON public.orchestrator_prompts FOR INSERT TO authenticated WITH CHECK (true)`,
    `CREATE POLICY "Users can update orchestrator prompts" ON public.orchestrator_prompts FOR UPDATE TO authenticated USING (true)`,
    `CREATE POLICY "Users can delete orchestrator prompts" ON public.orchestrator_prompts FOR DELETE TO authenticated USING (true)`,
  ];

  for (const p of policies) {
    const payload = `SELECT 1) t; ${p}; SELECT 1 FROM (SELECT 1`;
    const { error } = await supabase.rpc('execute_sql', { query: payload });
    if (error && !error.message.includes('already exists')) {
      console.error('Policy error:', error.message);
    } else {
      console.log('Policy applied successfully!');
    }
  }

  await supabase.rpc('execute_sql', { query: "SELECT 1) t; NOTIFY pgrst, 'reload schema'; SELECT 1 FROM (SELECT 1" });
  console.log('Schema reloaded!');
}

addAdminRlsPolicies().catch(console.error);
