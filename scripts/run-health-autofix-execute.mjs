import { auditHealthData } from '../src/lib/health/auditHealthData.ts';
import { planHealthAutoFix } from '../src/lib/health/healthAutoFix.ts';
import { executeHealthAutoFix } from '../src/lib/health/executeHealthAutoFix.ts';

// Mock Supabase Client for CLI Demonstration
function createMockSupabase() {
  const store = {
    notifications: new Map([
      ['notif-dup-1', { id: 'notif-dup-1', type: 'overdue' }],
      ['notif-orphan', { id: 'notif-orphan', type: 'overdue' }],
    ]),
    vaccine_records_v2: new Map([
      ['rec-1', { id: 'rec-1', confidence_level: 'manual', notes: null }],
      ['rec-dup-2', { id: 'rec-dup-2', notes: null }],
    ]),
    vaccination_plans: new Map([
      ['plan-dup', { id: 'plan-dup', status: 'completed' }],
    ]),
  };

  return {
    from: (table) => ({
      select: () => ({
        eq: (field, val) => ({
          maybeSingle: async () => {
            const row = store[table]?.get(val);
            return { data: row ?? null, error: null };
          },
        }),
      }),
      delete: () => ({
        eq: (field, val) => {
          store[table]?.delete(val);
          return Promise.resolve({ error: null });
        },
      }),
      update: (patch) => ({
        eq: (field, val) => {
          const row = store[table]?.get(val);
          if (row) {
            Object.assign(row, patch);
          }
          return Promise.resolve({ error: null });
        },
      }),
    }),
  };
}

const sampleData = {
  pets: [
    { id: 'pet-1', name: 'Odi', species: 'dog', is_active: true, owner_id: 'user-1' },
    { id: 'pet-orphan', name: 'OrphanPet', is_active: true, owner_id: null },
  ],
  pet_memberships: [
    { pet_id: 'pet-1', profile_id: 'user-1', role: 'primary_owner' },
  ],
  vaccine_records: [
    { id: 'rec-1', pet_id: 'pet-1', vaccine_code: 'DOG_RABIES', confidence_level: 'manual' },
    { id: 'rec-dup-1', pet_id: 'pet-1', vaccine_code: 'DOG_CDV', administered_at: '2025-06-01' },
    { id: 'rec-dup-2', pet_id: 'pet-1', vaccine_code: 'DOG_CDV', administered_at: '2025-06-01' },
  ],
  vaccination_plans: [
    { id: 'plan-1', pet_id: 'pet-1', vaccine_code: 'DOG_RABIES', status: 'completed', due_date: '2026-05-10' },
  ],
  notifications: [
    { id: 'notif-1', pet_id: 'pet-1', plan_id: 'plan-1', type: 'overdue' },
    { id: 'notif-dup-1', pet_id: 'pet-1', plan_id: 'plan-1', type: 'overdue' },
    { id: 'notif-orphan', pet_id: 'pet-1', plan_id: 'missing-plan-id', type: 'overdue' },
  ],
};

const isApproved = process.argv.includes('--approved');

console.log('Health Auto Fix Executor\n');
console.log(`${isApproved ? 'APPROVED MODE' : 'UNAPPROVED MODE (Dry Run Security Barrier)'}\n`);

const auditResult = auditHealthData(sampleData);
const plan = planHealthAutoFix(auditResult, { dryRun: !isApproved });
const supabaseMock = createMockSupabase();

const execResult = await executeHealthAutoFix({
  supabase: supabaseMock,
  plan,
  approved: isApproved,
});

console.log(`Executed ...... ${execResult.executed}`);
console.log(`Skipped ....... ${execResult.skipped}`);
console.log(`Failed ........ ${execResult.failed}\n`);

if (execResult.operations.length > 0) {
  console.log('Execution Operation Audit Log:');
  for (const op of execResult.operations) {
    console.log(`  [${op.status.toUpperCase()}] ${op.action} on ${op.targetTable} (${op.targetId}) ${op.reason ? `- ${op.reason}` : ''}`);
  }
}
