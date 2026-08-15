import { describe, it, expect } from 'vitest';
import { generateReproductiveForecastWithDate, generateReproductiveForecast } from './generateReproductiveForecast';

describe('Reproductive Forecast Engine (ADIM 15.1)', () => {
  const TODAY = new Date('2026-07-15T12:00:00Z');

  // Mock Supabase Client Factory
  const createMockSupabase = (pet: Record<string, unknown>, cycles: Record<string, unknown>[] = [], observations: Record<string, unknown>[] = [], tests: Record<string, unknown>[] = []) => {
    return {
      from: (table: string) => ({
        select: () => ({
          eq: (field: string, val: unknown) => {
            if (table === 'pets' && field === 'id') {
              return { single: async () => ({ data: pet }) };
            }
            if (table === 'pet_estrus_cycles' && field === 'pet_id') {
              return { order: async () => ({ data: cycles }) };
            }
            if (table === 'pet_estrus_observations' && field === 'cycle_id') {
              return { order: async () => ({ data: observations }) };
            }
            if (table === 'pet_reproductive_tests' && field === 'cycle_id') {
              return { data: tests }; 
            }
            return { single: async () => ({ data: null }), order: async () => ({ data: [] }) };
          }
        })
      })
    } as unknown as import('@supabase/supabase-js').SupabaseClient;
  };

  const expectReproductiveWindowEmpty = (result: Record<string, unknown>) => {
    expect((result.reproductiveWindow as Record<string, unknown>).start).toBeNull();
    expect((result.reproductiveWindow as Record<string, unknown>).end).toBeNull();
    expect((result.reproductiveWindow as Record<string, unknown>).label).toBe('not_available');
    expect((result.confidence as Record<string, unknown>).reproductiveWindow).toBe('none');
  };

  it('1. Senaryo: Erkek pet', async () => {
    const supabase = createMockSupabase({ species: 'dog', gender: 'male', is_neutered: false });
    const result = await generateReproductiveForecastWithDate('1', supabase, TODAY);
    expect(result.confidence.nextHeat).toBe('none');
    expect(result.advisories[0].code).toBe('MALE_PET');
    expectReproductiveWindowEmpty(result);
  });

  it('2. Senaryo: Kısır dişi pet', async () => {
    const supabase = createMockSupabase({ species: 'dog', gender: 'female', is_neutered: true });
    const result = await generateReproductiveForecastWithDate('1', supabase, TODAY);
    expect(result.confidence.nextHeat).toBe('none');
    expect(result.advisories[0].code).toBe('NEUTERED_ESTRUS_SIGNS_VET_REVIEW');
    expectReproductiveWindowEmpty(result);
  });

  it('3. Senaryo: Köpek, hiç döngü yok', async () => {
    const supabase = createMockSupabase({ species: 'dog', gender: 'female', is_neutered: false }, []);
    const result = await generateReproductiveForecastWithDate('1', supabase, TODAY);
    expect(result.confidence.nextHeat).toBe('none');
    expect(result.nextHeatWindow).toBeNull();
    expectReproductiveWindowEmpty(result);
  });

  it('4. Senaryo: Köpek, tek başlangıç', async () => {
    const cycles = [{ start_date: '2026-01-01', end_date: '2026-01-20' }];
    const supabase = createMockSupabase({ species: 'dog', gender: 'female', is_neutered: false }, cycles);
    const result = await generateReproductiveForecastWithDate('1', supabase, TODAY);
    expect(result.calculationMethod).toBe('insufficient_data');
    expect(result.confidence.nextHeat).toBe('none');
    expect(result.nextHeatWindow).toBeNull();
    expectReproductiveWindowEmpty(result);
  });

  it('5. Senaryo: Köpek, iki başlangıç', async () => {
    const cycles = [
      { start_date: '2025-06-01', end_date: '2025-06-20' },
      { start_date: '2026-01-01', end_date: '2026-01-20' }
    ];
    const supabase = createMockSupabase({ species: 'dog', gender: 'female', is_neutered: false }, cycles);
    const result = await generateReproductiveForecastWithDate('1', supabase, TODAY);
    expect(result.calculationMethod).toBe('single_historical_interval');
    expect(result.confidence.nextHeat).toBe('low');
    expect(result.nextHeatWindow).toBeNull();
    expectReproductiveWindowEmpty(result);
  });

  it('6. Senaryo: Köpek, üç başlangıç', async () => {
    const cycles = [
      { start_date: '2024-12-01', end_date: '2024-12-20' },
      { start_date: '2025-06-01', end_date: '2025-06-20' },
      { start_date: '2026-01-01', end_date: '2026-01-20' }
    ];
    const supabase = createMockSupabase({ species: 'dog', gender: 'female', is_neutered: false }, cycles);
    const result = await generateReproductiveForecastWithDate('1', supabase, TODAY);
    expect(result.calculationMethod).toBe('historical_interval_range');
    expect(result.confidence.nextHeat).toBe('low');
    expect(result.nextHeatWindow).not.toBeNull();
    expectReproductiveWindowEmpty(result);
  });

  it('7. Senaryo: Köpek, dört düzenli başlangıç', async () => {
    const cycles = [
      { start_date: '2024-06-01', end_date: '2024-06-20' }, 
      { start_date: '2024-12-01', end_date: '2024-12-20' }, 
      { start_date: '2025-06-01', end_date: '2025-06-20' }, 
      { start_date: '2026-01-01', end_date: '2026-01-20' }
    ];
    const supabase = createMockSupabase({ species: 'dog', gender: 'female', is_neutered: false }, cycles);
    const result = await generateReproductiveForecastWithDate('1', supabase, TODAY);
    expect(result.calculationMethod).toBe('product_estimation_heuristic');
    expect(result.confidence.nextHeat).toBe('medium');
    expect(result.nextHeatWindow).not.toBeNull();
    expectReproductiveWindowEmpty(result);
  });

  it('8. Senaryo: Köpek, düzensiz geçmiş', async () => {
    const cycles = [
      { start_date: '2024-01-01', end_date: '2024-01-20' },
      { start_date: '2024-03-01', end_date: '2024-03-20' }, // very short interval
      { start_date: '2025-01-01', end_date: '2025-01-20' }, // long interval
      { start_date: '2026-01-01', end_date: '2026-01-20' }
    ];
    const supabase = createMockSupabase({ species: 'dog', gender: 'female', is_neutered: false }, cycles);
    const result = await generateReproductiveForecastWithDate('1', supabase, TODAY);
    expect(result.calculationMethod).toBe('product_estimation_heuristic');
    expect(result.confidence.nextHeat).toBe('low'); 
    expectReproductiveWindowEmpty(result);
  });

  it('9. Senaryo: Aktif döngü gün hesabı', async () => {
    const cycles = [{ id: 'c1', start_date: '2026-07-10', end_date: null }]; // 5 days ago => day 6
    const supabase = createMockSupabase({ species: 'dog', gender: 'female', is_neutered: false }, cycles);
    const result = await generateReproductiveForecastWithDate('1', supabase, TODAY);
    expect(result.activeCycle.state).toBe('active_observation_period');
    expect(result.activeCycle.cycleDay).toBe(6);
    expect(result.confidence.behavioralObservation).toBe('none'); // no obs yet
    expectReproductiveWindowEmpty(result);
  });

  it('10. Senaryo: Aktif döngü ve gözlem', async () => {
    const cycles = [{ id: 'c1', start_date: '2026-07-10', end_date: null }];
    const obs = [
      { observation_date: '2026-07-11', symptom_code: 'BLEEDING' },
      { observation_date: '2026-07-12', symptom_code: 'VULVAR_SWELLING' }
    ];
    const supabase = createMockSupabase({ species: 'dog', gender: 'female', is_neutered: false }, cycles, obs);
    const result = await generateReproductiveForecastWithDate('1', supabase, TODAY);
    expect(result.behavioralObservationWindow).not.toBeNull();
    expect(result.confidence.behavioralObservation).toBe('low');
    expect(result.confidence.nextHeat).toBe('none'); // didn't elevate nextHeat
    expectReproductiveWindowEmpty(result);
  });

  it('11. Senaryo: Yalnız eski symptoms', async () => {
    // observations belonging to a non-active cycle
    const cycles = [{ id: 'c1', start_date: '2026-01-01', end_date: '2026-01-20' }];
    const obs = [{ observation_date: '2026-01-10', symptom_code: 'BLEEDING' }];
    const supabase = createMockSupabase({ species: 'dog', gender: 'female', is_neutered: false }, cycles, obs);
    const result = await generateReproductiveForecastWithDate('1', supabase, TODAY);
    expect(result.behavioralObservationWindow).toBeNull();
    expectReproductiveWindowEmpty(result);
  });

  it('12. Senaryo: Tek progesteron testi', async () => {
    const cycles = [{ id: 'c1', start_date: '2026-07-10', end_date: null }];
    const tests = [{ sampled_at: '2026-07-11' }];
    const supabase = createMockSupabase({ species: 'dog', gender: 'female', is_neutered: false }, cycles, [], tests);
    const result = await generateReproductiveForecastWithDate('1', supabase, TODAY);
    expect(result.activeCycle.state).toBe('test_supported_monitoring');
    expect(result.confidence.behavioralObservation).toBe('low');
    expectReproductiveWindowEmpty(result);
  });

  it('13. Senaryo: Karşılaştırılabilir seri test', async () => {
    const cycles = [{ id: 'c1', start_date: '2026-07-10', end_date: null }];
    const tests = [{ sampled_at: '2026-07-11' }, { sampled_at: '2026-07-13' }];
    const supabase = createMockSupabase({ species: 'dog', gender: 'female', is_neutered: false }, cycles, [], tests);
    const result = await generateReproductiveForecastWithDate('1', supabase, TODAY);
    expect(result.activeCycle.state).toBe('test_supported_monitoring');
    expectReproductiveWindowEmpty(result);
  });

  it('14. Senaryo: Kedi aktif dönem', async () => {
    const cycles = [{ id: 'c1', start_date: '2026-07-10', end_date: null }];
    const obs = [{ observation_date: '2026-07-11', symptom_code: 'VOCALIZATION' }];
    const supabase = createMockSupabase({ species: 'cat', gender: 'female', is_neutered: false }, cycles, obs);
    const result = await generateReproductiveForecastWithDate('1', supabase, TODAY);
    expect(result.calculationMethod).toBe('cat_behavioral_tracking');
    expect(result.nextHeatWindow).toBeNull();
    expect(result.confidence.nextHeat).toBe('none');
    expect(result.behavioralObservationWindow).not.toBeNull();
    expectReproductiveWindowEmpty(result);
  });

  it('15. Senaryo: Gelecek başlangıç tarihli kayıt', async () => {
    const cycles = [{ id: 'c1', start_date: '2026-07-20', end_date: null }]; 
    const supabase = createMockSupabase({ species: 'dog', gender: 'female', is_neutered: false }, cycles);
    const result = await generateReproductiveForecastWithDate('1', supabase, TODAY);
    expect(result.activeCycle.state).toBe('no_active_cycle');
    expect(result.advisories[0].code).toBe('FUTURE_START_DATE');
    expectReproductiveWindowEmpty(result);
  });

  it('16. Senaryo: Döngü dışı test', async () => {
    const cycles = [{ id: 'c1', start_date: '2026-01-01', end_date: '2026-01-20' }]; // cycle is closed
    const tests = [{ sampled_at: '2026-07-11' }]; // test is current, but cycle is old
    const supabase = createMockSupabase({ species: 'dog', gender: 'female', is_neutered: false }, cycles, [], tests);
    const result = await generateReproductiveForecastWithDate('1', supabase, TODAY);
    // Since cycle c1 is ended, tests shouldn't trigger test_supported_monitoring for activeCycle
    expect(result.activeCycle.state).toBe('no_active_cycle');
    expectReproductiveWindowEmpty(result);
  });

  describe('Tarih ve Saat Dilimi Testi', () => {
    it('Farklı saat dilimlerinde (UTC vs TSİ) aynı gün hesabını doğrular', async () => {
      // 2026-07-15T00:30:00+03:00 == 2026-07-14T21:30:00Z
      const dateLocal = new Date('2026-07-15T00:30:00+03:00');
      const dateUTC = new Date('2026-07-14T21:30:00Z');
      
      const cycles = [{ id: 'c1', start_date: '2026-07-10', end_date: null }];
      
      const supabaseLocal = createMockSupabase({ species: 'dog', gender: 'female', is_neutered: false }, cycles);
      const resLocal = await generateReproductiveForecastWithDate('1', supabaseLocal, dateLocal);
      
      const supabaseUTC = createMockSupabase({ species: 'dog', gender: 'female', is_neutered: false }, cycles);
      const resUTC = await generateReproductiveForecastWithDate('1', supabaseUTC, dateUTC);
      
      expect(resLocal.activeCycle.cycleDay).toBe(resUTC.activeCycle.cycleDay);
      // July 14th vs July 10th (start) => 14 - 10 + 1 = 5
      expect(resLocal.activeCycle.cycleDay).toBe(5);
    });
  });

  describe('Veri Sızıntısı ve Güvenlik Testleri', () => {
    it('Servis response sözleşmesinde hiçbir şekilde hassas veya gizli veri alanı barındırmaz', async () => {
      const supabase = createMockSupabase({ species: 'dog', gender: 'female', is_neutered: false });
      const result = await generateReproductiveForecastWithDate('1', supabase, TODAY) as unknown as Record<string, unknown>;
      
      const keys = JSON.stringify(result);
      expect(keys).not.toContain('document_storage_path');
      expect(keys).not.toContain('notes');
      expect(keys).not.toContain('phone');
      expect(keys).not.toContain('email');
      expect(keys).not.toContain('clinic_name');
      expect(keys).not.toContain('veterinarian_name');
      expect(keys).not.toContain('sample_identifier');
      
      // Kedi için nextHeatWindow daima null olmalı
      const supabaseCat = createMockSupabase({ species: 'cat', gender: 'female', is_neutered: false });
      const catResult = await generateReproductiveForecastWithDate('1', supabaseCat, TODAY);
      expect(catResult.nextHeatWindow).toBeNull();
    });
  });

});
