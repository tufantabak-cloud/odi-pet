export type CanonicalConfidenceLevel = 'verified' | 'user_reported' | 'estimated';

export const CANONICAL_CONFIDENCE_LEVELS: readonly CanonicalConfidenceLevel[] = [
  'verified',
  'user_reported',
  'estimated',
] as const;

/**
 * Normalizes any confidence level input string to a canonical database confidence_level value.
 * DB Check Constraint: CHECK (confidence_level IN ('verified','user_reported','estimated'))
 *
 * Translation Matrix:
 * - 'verified', 'high' -> 'verified'
 * - 'user_reported', 'manual', 'medium', 'low' -> 'user_reported'
 * - 'estimated', 'ocr', 'system' -> 'estimated'
 * - null, undefined, invalid_string -> 'user_reported' (Default)
 */
export function normalizeConfidenceLevel(input?: string | null): CanonicalConfidenceLevel {
  if (!input) return 'user_reported';

  const trimmed = input.trim().toLowerCase();

  switch (trimmed) {
    case 'verified':
    case 'high':
      return 'verified';
    case 'user_reported':
    case 'manual':
    case 'medium':
    case 'low':
      return 'user_reported';
    case 'estimated':
    case 'ocr':
    case 'system':
      return 'estimated';
    default:
      return 'user_reported';
  }
}
