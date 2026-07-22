require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkJobStatusEnum() {
  const { data: job, error } = await supabase
    .from('content_generation_jobs')
    .select('id, topic, generation_status, article_id, last_error')
    .in('topic', ['Kedilerde Su Tüketimini Artırmanın Sağlıklı Yolları', 'Köpeklerde Temel Sosyalleşme İlkeleri']);

  console.log('Jobs status sample:', job, error);
}

checkJobStatusEnum();
