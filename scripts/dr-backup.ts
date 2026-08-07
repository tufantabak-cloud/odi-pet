import { config } from 'dotenv';
config({ path: '.env.local' });
import { createAdminSupabaseClient } from '../src/lib/supabase/server';
import fs from 'fs';
import path from 'path';

const supabase = createAdminSupabaseClient();

const TABLES_TO_BACKUP = [
  'feature_limits',
  'app_bundles',
  'bundle_features',
  'plan_bundles'
];

async function main() {
  console.log('📦 Starting Disaster Recovery Backup...');
  
  const backupDir = path.join(process.cwd(), 'dr-backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupInfo: Record<string, number> = {};

  for (const table of TABLES_TO_BACKUP) {
    console.log(`- Fetching ${table}...`);
    const { data, error } = await supabase.from(table).select('*');
    
    if (error) {
      console.error(`❌ Error fetching ${table}:`, error.message);
      process.exit(1);
    }
    
    if (!data) {
      console.log(`⚠️ No data found for ${table}.`);
      continue;
    }
    
    const fileName = `${table}_${timestamp}.json`;
    const filePath = path.join(backupDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    backupInfo[table] = data.length;
    console.log(`✅ Saved ${data.length} rows to ${fileName}`);
  }

  const manifestPath = path.join(backupDir, `manifest_${timestamp}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify({
    timestamp,
    counts: backupInfo
  }, null, 2));

  console.log('🎉 Backup completed successfully!');
}

main().catch(console.error);
