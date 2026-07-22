require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkJobConstraints() {
  // `check_job_article_type` check kısıtı neyi denetliyor görelim.
  // job_type === 'new_content' ise article_id başlangıçta null veya update_content ise mi ilişkili?
  const { data: job } = await supabase
    .from('content_generation_jobs')
    .select('*')
    .eq('id', '9b3a1986-6067-4746-9b7d-502816de196f')
    .single();

  console.log('Job details:', job);
}

checkJobConstraints();
