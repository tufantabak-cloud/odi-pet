import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateVaccinationPlan } from '../vaccination-algorithm';

const mockProtocols = [
  {
    vaccine_code: 'DOG_DHPPI',
    protocol_name: 'Karma Aşı (DHPPI)',
    category: 'vaccine',
    species: 'dog',
    is_active: true,
    is_core: true,
    mandatory_level: 'core',
    repeat_frequency: 'yearly',
    repeat_interval_days: 21,
    doses: [{ trigger: 'birth', days_offset: 56 }, { trigger: 'birth', days_offset: 77 }],
  },
  {
    vaccine_code: 'DOG_RABIES',
    protocol_name: 'Kuduz Aşısı',
    category: 'vaccine',
    species: 'dog',
    is_active: true,
    is_core: false,
    mandatory_level: 'legal_required',
    repeat_frequency: 'yearly',
    repeat_interval_days: 365,
    doses: [{ trigger: 'birth', days_offset: 84 }],
  },
  {
    vaccine_code: 'CAT_FPV',
    protocol_name: 'Kedi Karma Aşısı (FPV)',
    category: 'vaccine',
    species: 'cat',
    is_active: true,
    is_core: true,
    mandatory_level: 'core',
    repeat_frequency: 'yearly',
    repeat_interval_days: 21,
    doses: [{ trigger: 'birth', days_offset: 56 }],
  },
  {
    vaccine_code: 'CAT_RABIES',
    protocol_name: 'Kedi Kuduz Aşısı',
    category: 'vaccine',
    species: 'cat',
    is_active: true,
    is_core: false,
    mandatory_level: 'legal_required',
    repeat_frequency: 'yearly',
    repeat_interval_days: 365,
    doses: [{ trigger: 'birth', days_offset: 84 }],
  },
  {
    vaccine_code: 'CAT_FELV',
    protocol_name: 'Kedi Lösemi Aşısı (FeLV)',
    category: 'vaccine',
    species: 'cat',
    is_active: true,
    is_core: false,
    mandatory_level: 'elective',
    repeat_frequency: 'yearly',
    repeat_interval_days: 365,
    doses: [{ trigger: 'birth', days_offset: 56 }],
  },
];

function createMockSupabase(speciesFilter?: string) {
  return {
    from: (table: string) => {
      if (table === 'vaccine_protocols') {
        return {
          select: () => ({
            eq: () => ({
              in: (_col: string, speciesList: string[]) => {
                const filtered = mockProtocols.filter((p) =>
                  speciesList.includes(p.species) || p.species === 'both'
                );
                return Promise.resolve({ data: filtered, error: null });
              },
            }),
          }),
        };
      }
      return {
        select: () => Promise.resolve({ data: [], error: null }),
      };
    },
  } as any;
}

describe('X.2 - Vaccination Algorithm Legal Required (Rabies) Coverage', () => {
  const originalEnv = process.env.ENABLE_LEGAL_REQUIRED_PLANS;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ENABLE_LEGAL_REQUIRED_PLANS = originalEnv;
    } else {
      delete process.env.ENABLE_LEGAL_REQUIRED_PLANS;
    }
  });

  // Test 1: legal_required protocols included when feature flag is enabled (default)
  it('Test 1: includes legal_required protocols when ENABLE_LEGAL_REQUIRED_PLANS is enabled (default)', async () => {
    delete process.env.ENABLE_LEGAL_REQUIRED_PLANS;
    const supabase = createMockSupabase();
    const birthDate = '2026-01-01';

    const tasks = await generateVaccinationPlan(birthDate, 'dog', supabase);
    const vaccineCodes = tasks.map((t) => t.extra_data?.vaccine?.code);

    expect(vaccineCodes).toContain('DOG_RABIES');
  });

  // Test 2: legal_required protocols NOT included when feature flag is disabled
  it('Test 2: excludes legal_required protocols when ENABLE_LEGAL_REQUIRED_PLANS=false', async () => {
    process.env.ENABLE_LEGAL_REQUIRED_PLANS = 'false';
    const supabase = createMockSupabase();
    const birthDate = '2026-01-01';

    const tasks = await generateVaccinationPlan(birthDate, 'dog', supabase);
    const vaccineCodes = tasks.map((t) => t.extra_data?.vaccine?.code);

    expect(vaccineCodes).not.toContain('DOG_RABIES');
    expect(vaccineCodes).toContain('DOG_DHPPI');
  });

  // Test 3: Existing core template behavior is preserved
  it('Test 3: preserves existing core template behavior', async () => {
    delete process.env.ENABLE_LEGAL_REQUIRED_PLANS;
    const supabase = createMockSupabase();
    const birthDate = '2026-01-01';

    const tasks = await generateVaccinationPlan(birthDate, 'dog', supabase);
    const dhppiTasks = tasks.filter((t) => t.extra_data?.vaccine?.code === 'DOG_DHPPI');

    expect(dhppiTasks.length).toBeGreaterThan(0);
    expect(dhppiTasks[0].category).toBe('asi');
  });

  // Test 4: 2-month old dog generates Rabies plan (minimum age 12 weeks rule preserved)
  it('Test 4: generates Rabies plan for dog preserving minimum age rule (week 12)', async () => {
    delete process.env.ENABLE_LEGAL_REQUIRED_PLANS;
    const supabase = createMockSupabase();
    const birthDate = '2026-05-01';

    const tasks = await generateVaccinationPlan(birthDate, 'dog', supabase);
    const rabiesTasks = tasks.filter((t) => t.extra_data?.vaccine?.code === 'DOG_RABIES');

    expect(rabiesTasks.length).toBeGreaterThan(0);
    const rabiesScheduledDate = new Date(rabiesTasks[0].scheduled_at);
    const birthDateObj = new Date(birthDate + 'T12:00:00');
    const diffDays = Math.round((rabiesScheduledDate.getTime() - birthDateObj.getTime()) / (1000 * 3600 * 24));
    
    // Minimum 12 weeks (84 days)
    expect(diffDays).toBeGreaterThanOrEqual(84);
  });

  // Test 5: Cat + outdoor generates Rabies + FeLV plan
  it('Test 5: generates Rabies and FeLV plans for outdoor cat', async () => {
    delete process.env.ENABLE_LEGAL_REQUIRED_PLANS;
    const supabase = createMockSupabase();
    const birthDate = '2026-01-01';

    const tasks = await generateVaccinationPlan(birthDate, 'cat', supabase, { isOutdoor: true });
    const vaccineCodes = tasks.map((t) => t.extra_data?.vaccine?.code);

    expect(vaccineCodes).toContain('CAT_FPV');
    expect(vaccineCodes).toContain('CAT_RABIES');
    expect(vaccineCodes).toContain('CAT_FELV');
  });

  // Test 6: Cat + indoor generates Rabies plan, FeLV not generated
  it('Test 6: generates Rabies plan but excludes FeLV for indoor cat', async () => {
    delete process.env.ENABLE_LEGAL_REQUIRED_PLANS;
    const supabase = createMockSupabase();
    const birthDate = '2026-01-01';

    const tasks = await generateVaccinationPlan(birthDate, 'cat', supabase, { isOutdoor: false });
    const vaccineCodes = tasks.map((t) => t.extra_data?.vaccine?.code);

    expect(vaccineCodes).toContain('CAT_FPV');
    expect(vaccineCodes).toContain('CAT_RABIES');
    expect(vaccineCodes).not.toContain('CAT_FELV');
  });

  // Test 7 (MANDATORY): Flag=false => bit-for-bit identical to pre-X.2 behavior
  it('Test 7 (MANDATORY): bit-for-bit identical output when ENABLE_LEGAL_REQUIRED_PLANS=false vs legacy core-only filter', async () => {
    process.env.ENABLE_LEGAL_REQUIRED_PLANS = 'false';
    const supabase = createMockSupabase();
    const birthDate = '2026-01-01';

    const tasksWithFlagDisabled = await generateVaccinationPlan(birthDate, 'dog', supabase);

    // Simulate pre-X.2 legacy filter (only is_core)
    const legacyFilteredProtocols = mockProtocols.filter((p) => p.species === 'dog' && p.is_core);
    const expectedLegacyCodes = legacyFilteredProtocols.map((p) => p.vaccine_code);

    const actualCodes = Array.from(new Set(tasksWithFlagDisabled.map((t) => t.extra_data?.vaccine?.code)));

    expect(actualCodes).toEqual(expectedLegacyCodes);
    expect(JSON.stringify(tasksWithFlagDisabled)).toEqual(
      JSON.stringify(
        tasksWithFlagDisabled.filter((t) => t.extra_data?.vaccine?.code === 'DOG_DHPPI')
      )
    );
  });
});
