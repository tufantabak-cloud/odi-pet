import { auditHealthData } from '../src/lib/health/auditHealthData.ts';

// CLI Mock/Live Data Runner for Health Audit
const sampleData = {
  pets: [
    { id: 'pet-1', name: 'Odi', species: 'dog', is_active: true, owner_id: 'user-1' },
    { id: 'pet-2', name: 'Milo', species: 'cat', is_active: true, owner_id: 'user-2' },
  ],
  pet_memberships: [
    { pet_id: 'pet-1', profile_id: 'user-1', role: 'primary_owner' },
    { pet_id: 'pet-2', profile_id: 'user-2', role: 'primary_owner' },
  ],
  vaccine_records: [
    { id: 'rec-1', pet_id: 'pet-1', vaccine_code: 'DOG_RABIES', vaccine_name: 'Kuduz', administered_at: '2025-05-10', next_due_at: '2026-05-10', confidence_level: 'verified' },
    { id: 'rec-2', pet_id: 'pet-2', vaccine_code: 'CAT_RABIES', vaccine_name: 'Kuduz', administered_at: '2025-06-15', next_due_at: '2026-06-15', confidence_level: 'user_reported' },
  ],
  vaccination_plans: [
    { id: 'plan-1', pet_id: 'pet-1', vaccine_code: 'DOG_RABIES', status: 'completed', due_date: '2026-05-10', mandatory_level: 'legal_required' },
    { id: 'plan-2', pet_id: 'pet-2', vaccine_code: 'CAT_RABIES', status: 'completed', due_date: '2026-06-15', mandatory_level: 'legal_required' },
  ],
  notifications: [
    { id: 'notif-1', pet_id: 'pet-1', plan_id: 'plan-1', type: 'overdue' },
  ],
};

console.log('Health Audit\n');

const result = auditHealthData(sampleData);

const statusText = result.passed ? 'PASS' : 'FAIL';
console.log(`${statusText}\n`);

console.log(`Pets.............${result.statistics.petsScanned}`);
console.log(`Vaccines.........${result.statistics.vaccineRecords}`);
console.log(`Plans............${result.statistics.plans}`);
console.log(`Notifications....${result.statistics.notifications}\n`);

console.log(`Warnings.........${result.warnings.length}`);
console.log(`Errors...........${result.errors.length}\n`);

if (result.errors.length > 0) {
  console.error('❌ ERRORS FOUND:');
  for (const err of result.errors) {
    console.error(`  - [${err.category.toUpperCase()}] ${err.code}: ${err.message}`);
  }
  process.exit(1);
} else {
  process.exit(0);
}
