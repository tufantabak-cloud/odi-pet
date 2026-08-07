import { FeatureDefinition } from '../types';

export type PlanKey = string;

export enum FeatureAccessReason {
  ALLOWED = 'ALLOWED',
  FEATURE_NOT_FOUND = 'FEATURE_NOT_FOUND',
  PENDING_REVIEW = 'PENDING_REVIEW',
  DISABLED = 'DISABLED',
  DEPRECATED = 'DEPRECATED',
  TIER_REQUIRED = 'TIER_REQUIRED',
  USAGE_LIMIT_REACHED = 'USAGE_LIMIT_REACHED',
  MISSING_LIMIT_RECORD = 'MISSING_LIMIT_RECORD',
  BUNDLE_DISABLED = 'BUNDLE_DISABLED'
}

export interface FeatureContext {
  petId?: string;
  organizationId?: string;
  clinicId?: string;
  platform?: string;
  country?: string;
  [key: string]: unknown; // Allow future extension
}

export interface CheckFeatureAccessParams {
  userId: string;
  featureKey: string;
  context?: FeatureContext;
}

export interface FeatureAccessResult {
  allowed: boolean;
  reason: FeatureAccessReason;
  feature?: FeatureDefinition;
  currentTier?: PlanKey;
  requiredTier?: PlanKey; // e.g. for suggesting an upgrade
  usage?: number;
  limit?: number;
  remaining?: number;
  resetAt?: string; // ISO8601 UTC
  featureStatus?: string;
  isUnlimited?: boolean;
  featureState?: 'ACTIVE' | 'BETA' | 'HIDDEN' | 'COMING_SOON' | 'DEPRECATED' | 'DISABLED';
  // Computed Usage Metrics
  percent?: number;
  status?: 'normal' | 'nearLimit' | 'critical' | 'exceeded';
  nearLimit?: boolean;
  critical?: boolean;
  exceeded?: boolean;
}
