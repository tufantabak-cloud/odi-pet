import { describe, test, expect } from 'vitest';
import { addDaysToDateKey } from '../coverage';

describe('Expired Recurring Coverage Missed Calculation', () => {
  test('correctly calculates day after protection end date', () => {
    const protectionEnd = '2027-06-25';
    const missedStart = addDaysToDateKey(protectionEnd, 1);
    expect(missedStart).toBe('2027-06-26');
  });

  test('protection ending today does not trigger missed before tomorrow', () => {
    const protectionEnd = '2026-07-27';
    const missedStart = addDaysToDateKey(protectionEnd, 1);
    expect(missedStart).toBe('2026-07-28');
  });
});
