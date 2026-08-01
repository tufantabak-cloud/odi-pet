import { auditHealthData } from '../src/lib/health/auditHealthData.ts';
import { planHealthAutoFix } from '../src/lib/health/healthAutoFix.ts';

// Sample dataset with mixed fixable and manual issues for CLI verification
const sampleAuditData = {
  pets: [
    { id: 'pet-1', name: 'Odi', species: 'dog', is_active: true, owner_id: 'user-1' },
    { id: 'pet-orphan', name: 'OrphanPet', is_active: true, owner_id: null }, // Manual: PET_WITHOUT_OWNER
    { id: 'pet-inactive', name: 'OldPet', is_active: false, owner_id: 'user-2' },
  ],
  pet_memberships: [
    { pet_id: 'pet-1', profile_id: 'user-1', role: 'primary_owner' },
  ],
  vaccine_records: [
    { id: 'rec-1', pet_id: 'pet-1', vaccine_code: 'DOG_RABIES', administered_at: '2025-05-10', next_due_at: '2026-05-10', confidence_level: 'manual' }, // Fixable: NON_CANONICAL_CONFIDENCE_LEVEL
    { id: 'rec-dup-1', pet_id: 'pet-1', vaccine_code: 'DOG_CDV', administered_at: '2025-06-01', next_due_at: '2026-06-01', confidence_level: 'verified' },
    { id: 'rec-dup-2', pet_id: 'pet-1', vaccine_code: 'DOG_CDV', administered_at: '2025-06-01', next_due_at: '2026-06-01', confidence_level: 'verified' }, // Fixable: DUPLICATE_VACCINE_RECORD
    { id: 'rec-date-err', pet_id: 'pet-1', vaccine_code: 'DOG_CDV', administered_at: '2026-05-10', next_due_at: '2025-01-01' }, // Manual: VACCINE_INVALID_DATE_ORDER
  ],
  vaccination_plans: [
    { id: 'plan-1', pet_id: 'pet-1', vaccine_code: 'DOG_RABIES', status: 'completed', due_date: '2026-05-10' },
    { id: 'plan-inactive', pet_id: 'pet-inactive', vaccine_code: 'DOG_CDV', status: 'pending', due_date: '2026-08-01' }, // Manual: ACTIVE_PLAN_ON_INACTIVE_PET
  ],
  notifications: [
    { id: 'notif-1', pet_id: 'pet-1', plan_id: 'plan-1', type: 'overdue' },
    { id: 'notif-dup-1', pet_id: 'pet-1', plan_id: 'plan-1', type: 'overdue' }, // Fixable: DUPLICATE_NOTIFICATION_INSERT
    { id: 'notif-orphan', pet_id: 'pet-1', plan_id: 'missing-plan-id', type: 'overdue' }, // Fixable: INVALID_PLAN_REFERENCE
  ],
};

console.log('Health Auto Fix\n');
console.log('DRY RUN\n');

const auditResult = auditHealthData(sampleAuditData);
const autoFixPlan = planHealthAutoFix(auditResult, { dryRun: true });

console.log(`Fixable ........ ${autoFixPlan.summary.fixable}`);
console.log(`Manual ......... ${autoFixPlan.summary.manual}\n`);

const willExecuteText = autoFixPlan.executable ? 'YES' : 'NO';
console.log(`Will execute ... ${willExecuteText}\n`);

if (autoFixPlan.fixes.length > 0) {
  console.log('Proposed Auto-Fixes (Dry Run):');
  for (const fix of autoFixPlan.fixes) {
    console.log(`  [${fix.actionType}] ${fix.description}`);
  }
}
