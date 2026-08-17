import { describe, it, expect } from 'vitest';
import { EntitlementPolicy } from '../policy';
import { FeatureAccessReason } from '../types';
import { FeatureDefinition } from '../../types';

describe('EntitlementPolicy Exhaustive Decision Matrix', () => {

  const dummyFeatureDef: FeatureDefinition = {
    key: 'test_feature',
    version: '1.0.0',
    name: 'Test Feature',
    description: 'Test feature description',
    category: 'health',
    icon: 'activity',
    tags: ['test'],
    visibility: 'public',
    state: 'ACTIVE',
    display_order: 1,
    dependsOn: [],
    requiresAuth: true,
    requiresPet: false,
    metadata: {}
  };

  const dummyDbStatus = { status: 'active' };

  it('1. Returns FEATURE_NOT_FOUND if definition is missing', () => {
    const res = EntitlementPolicy.evaluate('unknown', undefined, dummyDbStatus, 'pro', {}, 0);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe(FeatureAccessReason.FEATURE_NOT_FOUND);
  });

  it('2. Returns DISABLED when feature state is DISABLED', () => {
    const disabledDef = { ...dummyFeatureDef, state: 'DISABLED' as const };
    const res = EntitlementPolicy.evaluate('test', disabledDef, dummyDbStatus, 'pro', { is_enabled: true, limit_type: 'unlimited' }, 0);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe(FeatureAccessReason.DISABLED);
  });

  it('3. Returns DISABLED with featureState=COMING_SOON when feature state is COMING_SOON', () => {
    const comingSoonDef = { ...dummyFeatureDef, state: 'COMING_SOON' as const };
    const res = EntitlementPolicy.evaluate('test', comingSoonDef, dummyDbStatus, 'pro', { is_enabled: true, limit_type: 'unlimited' }, 0);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe(FeatureAccessReason.DISABLED);
    expect(res.featureState).toBe('COMING_SOON');
  });

  it('4. Returns DEPRECATED when feature state is DEPRECATED', () => {
    const deprecatedDef = { ...dummyFeatureDef, state: 'DEPRECATED' as const };
    const res = EntitlementPolicy.evaluate('test', deprecatedDef, dummyDbStatus, 'pro', { is_enabled: true, limit_type: 'unlimited' }, 0);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe(FeatureAccessReason.DEPRECATED);
  });

  it('6. Returns MISSING_LIMIT_RECORD when limit record is null', () => {
    const res = EntitlementPolicy.evaluate('test', dummyFeatureDef, dummyDbStatus, 'pro', null, 0);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe(FeatureAccessReason.MISSING_LIMIT_RECORD);
  });

  it('7. Returns ALLOWED for unlimited feature', () => {
    const res = EntitlementPolicy.evaluate('test', dummyFeatureDef, dummyDbStatus, 'pro', { limit_type: 'unlimited', is_enabled: true }, 50);
    expect(res.allowed).toBe(true);
    expect(res.isUnlimited).toBe(true);
    expect(res.reason).toBe(FeatureAccessReason.ALLOWED);
  });

  it('8. Quota Edge Case: Usage 29 / Limit 30 -> ALLOWED (nearLimit = true)', () => {
    const limitRecord = { limit_type: 'quota', limit_value: 30, window_value: 1, window_unit: 'month', is_enabled: true };
    const res = EntitlementPolicy.evaluate('test', dummyFeatureDef, dummyDbStatus, 'pro', limitRecord, 29);
    
    expect(res.allowed).toBe(true);
    expect(res.usage).toBe(29);
    expect(res.remaining).toBe(1);
    expect(res.percent).toBe(97); // Math.round(29/30 * 100)
    expect(res.status).toBe('critical');
    expect(res.critical).toBe(true);
  });

  it('9. Quota Edge Case: Usage 30 / Limit 30 -> USAGE_LIMIT_REACHED (exceeded = true)', () => {
    const limitRecord = { limit_type: 'quota', limit_value: 30, window_value: 1, window_unit: 'month', is_enabled: true };
    const res = EntitlementPolicy.evaluate('test', dummyFeatureDef, dummyDbStatus, 'pro', limitRecord, 30);
    
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe(FeatureAccessReason.USAGE_LIMIT_REACHED);
    expect(res.usage).toBe(30);
    expect(res.remaining).toBe(0);
    expect(res.exceeded).toBe(true);
    expect(res.status).toBe('exceeded');
  });

  it('10. Quota Edge Case: Usage 31 / Limit 30 -> USAGE_LIMIT_REACHED', () => {
    const limitRecord = { limit_type: 'quota', limit_value: 30, window_value: 1, window_unit: 'month', is_enabled: true };
    const res = EntitlementPolicy.evaluate('test', dummyFeatureDef, dummyDbStatus, 'pro', limitRecord, 31);
    
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe(FeatureAccessReason.USAGE_LIMIT_REACHED);
    expect(res.remaining).toBe(0);
  });

  it('11. Boolean Feature: Enabled = true -> ALLOWED', () => {
    const res = EntitlementPolicy.evaluate('test', dummyFeatureDef, dummyDbStatus, 'pro', { limit_type: 'boolean', is_enabled: true }, 0);
    expect(res.allowed).toBe(true);
    expect(res.reason).toBe(FeatureAccessReason.ALLOWED);
  });

  it('12. Boolean Feature: Enabled = false -> DISABLED', () => {
    const res = EntitlementPolicy.evaluate('test', dummyFeatureDef, dummyDbStatus, 'pro', { limit_type: 'boolean', is_enabled: false }, 0);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe(FeatureAccessReason.DISABLED);
  });

});
