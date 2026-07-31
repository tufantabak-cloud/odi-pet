import { describe, it, expect } from 'vitest';
import { normalizeConfidenceLevel, CANONICAL_CONFIDENCE_LEVELS } from '../confidenceLevels';

describe('Sprint X.3R - normalizeConfidenceLevel Regression Matrix', () => {
  it('verifies CANONICAL_CONFIDENCE_LEVELS matching DB CHECK constraint', () => {
    expect(CANONICAL_CONFIDENCE_LEVELS).toEqual(['verified', 'user_reported', 'estimated']);
  });

  // 12 Mandatory Regression Matrix Test Cases
  it('maps "verified" -> "verified"', () => {
    expect(normalizeConfidenceLevel('verified')).toBe('verified');
  });

  it('maps "user_reported" -> "user_reported"', () => {
    expect(normalizeConfidenceLevel('user_reported')).toBe('user_reported');
  });

  it('maps "estimated" -> "estimated"', () => {
    expect(normalizeConfidenceLevel('estimated')).toBe('estimated');
  });

  it('maps "manual" -> "user_reported"', () => {
    expect(normalizeConfidenceLevel('manual')).toBe('user_reported');
  });

  it('maps "high" -> "verified"', () => {
    expect(normalizeConfidenceLevel('high')).toBe('verified');
  });

  it('maps "medium" -> "user_reported"', () => {
    expect(normalizeConfidenceLevel('medium')).toBe('user_reported');
  });

  it('maps "low" -> "user_reported"', () => {
    expect(normalizeConfidenceLevel('low')).toBe('user_reported');
  });

  it('maps "ocr" -> "estimated"', () => {
    expect(normalizeConfidenceLevel('ocr')).toBe('estimated');
  });

  it('maps "system" -> "estimated"', () => {
    expect(normalizeConfidenceLevel('system')).toBe('estimated');
  });

  it('maps null -> "user_reported"', () => {
    expect(normalizeConfidenceLevel(null)).toBe('user_reported');
  });

  it('maps undefined -> "user_reported"', () => {
    expect(normalizeConfidenceLevel(undefined)).toBe('user_reported');
  });

  it('maps invalid_string -> "user_reported"', () => {
    expect(normalizeConfidenceLevel('invalid_string')).toBe('user_reported');
    expect(normalizeConfidenceLevel('UNKNOWN_VAL')).toBe('user_reported');
  });

  it('handles whitespace and uppercase gracefully', () => {
    expect(normalizeConfidenceLevel('  HIGH  ')).toBe('verified');
    expect(normalizeConfidenceLevel('USER_REPORTED')).toBe('user_reported');
    expect(normalizeConfidenceLevel('OCR')).toBe('estimated');
  });
});
