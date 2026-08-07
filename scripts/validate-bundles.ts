import { config } from 'dotenv';
config({ path: '.env.local' });
import { createAdminSupabaseClient } from '../src/lib/supabase/server';
import { featureRegistry } from '../src/lib/features/registry';

async function validateBundles() {
  console.log('Starting Bundle Consistency Validation...');
  const supabase = createAdminSupabaseClient();
  const registeredFeatures = Array.from(featureRegistry.values());
  const registryKeys = new Set(registeredFeatures.map(f => f.key));

  let hasErrors = false;

  // 1. Validate DB limits against Registry
  const { data: limits, error } = await supabase
    .from('feature_limits')
    .select('*');

  if (error) {
    console.error('❌ Failed to fetch feature_limits from DB:', error);
    process.exit(1);
  }

  const dbFeatureKeys = new Set(limits.map((l: any) => l.feature_key));
  const missingInRegistry: string[] = [];

  for (const dbKey of dbFeatureKeys) {
    if (!registryKeys.has(dbKey)) {
      missingInRegistry.push(dbKey);
      hasErrors = true;
    }
  }

  if (missingInRegistry.length > 0) {
    console.error(`❌ BUNDLE ERROR: The following features exist in DB (feature_limits) but NOT in local Registry:\n  - ${missingInRegistry.join('\n  - ')}`);
  } else {
    console.log('✅ DB Limits <-> Registry Sync verified.');
  }

  // 2. Validate Bundles Table against Registry
  const { data: bundles, error: bundleError } = await supabase
    .from('bundles')
    .select('*');

  if (!bundleError && bundles) {
    // If you have a bundles table that lists included features, validate here.
    // Example logic if a 'bundle_features' table exists:
    const { data: bundleFeatures, error: bfError } = await supabase
      .from('bundle_features')
      .select('*');
      
    if (!bfError && bundleFeatures) {
      const invalidBundleFeatures = bundleFeatures.filter((bf: any) => !registryKeys.has(bf.feature_key));
      if (invalidBundleFeatures.length > 0) {
        console.error(`❌ BUNDLE ERROR: Invalid feature_keys found in bundle_features:\n  - ${invalidBundleFeatures.map((bf: any) => bf.feature_key).join('\n  - ')}`);
        hasErrors = true;
      }
    }
  }

  if (hasErrors) {
    console.error('💥 Bundle consistency validation FAILED.');
    process.exit(1);
  } else {
    console.log('✅ Bundle consistency validation PASSED.');
    process.exit(0);
  }
}

validateBundles();
