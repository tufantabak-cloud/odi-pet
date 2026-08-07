import { config } from 'dotenv';
config({ path: '.env.local' });
import { createAdminSupabaseClient } from '../src/lib/supabase/server';
import fs from 'fs';
import path from 'path';

const supabase = createAdminSupabaseClient();

const TABLES_TO_RESTORE = [
  'feature_limits',
  'app_bundles',
  'bundle_features',
  'plan_bundles'
];

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ ABORT: Restore operations are disabled in production.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isExecute = args.includes('--execute');

  if (!isDryRun && !isExecute) {
    console.error('❌ You must specify --dry-run or --execute');
    process.exit(1);
  }

  const backupDir = path.join(process.cwd(), 'dr-backups');
  if (!fs.existsSync(backupDir)) {
    console.error('❌ Backup directory not found.');
    process.exit(1);
  }

  const files = fs.readdirSync(backupDir).filter(f => f.startsWith('manifest_'));
  if (files.length === 0) {
    console.error('❌ No backup manifests found.');
    process.exit(1);
  }

  // Find the latest manifest
  files.sort();
  const latestManifest = files[files.length - 1];
  const manifestData = JSON.parse(fs.readFileSync(path.join(backupDir, latestManifest), 'utf8'));
  const timestamp = manifestData.timestamp;

  console.log(`📦 Found backup from ${timestamp}. Mode: ${isDryRun ? 'DRY-RUN' : 'EXECUTE'}`);

  for (const table of TABLES_TO_RESTORE) {
    const fileName = `${table}_${timestamp}.json`;
    const filePath = path.join(backupDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Backup file for ${table} not found. Skipping.`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    console.log(`\n- Restoring ${table} (${data.length} records)`);
    
    if (isDryRun) {
      console.log(`  [Dry Run] Would DELETE ALL from ${table}`);
      console.log(`  [Dry Run] Would INSERT ${data.length} rows into ${table}`);
    } else {
      // Execute Delete
      const { error: delError } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
      if (delError) {
        console.error(`❌ Failed to clear ${table}:`, delError.message);
        process.exit(1);
      }
      console.log(`  Cleared ${table}`);

      // Execute Insert
      if (data.length > 0) {
        const { error: insError } = await supabase.from(table).insert(data);
        if (insError) {
          console.error(`❌ Failed to restore ${table}:`, insError.message);
          process.exit(1);
        }
        console.log(`  Restored ${data.length} rows into ${table}`);
      }
    }
  }

  // Verification step
  if (!isDryRun) {
    console.log('\n🔍 Verifying Restore Integrity...');
    for (const table of TABLES_TO_RESTORE) {
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
      const expected = manifestData.counts[table] || 0;
      if (count !== expected) {
        console.error(`❌ Mismatch in ${table}: Expected ${expected}, got ${count}`);
        process.exit(1);
      }
    }
    console.log('✅ Counts matched exactly.');
  }

  console.log('\n🎉 Restore completed successfully!');
}

main().catch(console.error);
