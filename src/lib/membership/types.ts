export type SubscriptionState =
  | 'FREE'
  | 'TRIAL'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'GRACE'
  | 'CANCELLED'
  | 'PAUSED';

export type MembershipPlan = 'free' | 'pro' | 'ai_plus' | 'enterprise' | string;

export type MembershipProviderType = 'referral' | 'manual' | 'stripe' | 'iyzico' | 'google_play' | 'apple';

export type MembershipEventType =
  | 'WELCOME_GRANTED'
  | 'REFERRAL_REGISTERED'
  | 'REFERRAL_APPROVED'
  | 'REFERRAL_REJECTED'
  | 'PROMOTION_GRANTED'
  | 'PROMOTION_EXPIRED'
  | 'REWARD_GRANTED'
  | 'ASSIGNED'
  | 'CHANGED'
  | 'TRIAL_STARTED'
  | 'TRIAL_EXTENDED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'RESUMED'
  | 'OVERRIDE_CREATED'
  | 'OVERRIDE_REMOVED'
  | 'QUOTA_GRANTED'
  | 'QUOTA_RESET';

export interface ReferralRewardSettings {
  welcome_plan: string;
  welcome_duration_days: number;
  referral_reward_days: number;
  maximum_reward_days: number;
  minimum_verification: string;
  auto_approve: boolean;
  promotion_enabled: boolean;
}

export interface AssignPlanParams {
  profileId: string;
  plan: MembershipPlan;
  durationDays?: number;
  reason?: string;
  adminId?: string;
  metadata?: Record<string, any>;
}

export interface ChangePlanParams {
  profileId: string;
  newPlan: MembershipPlan;
  reason?: string;
  adminId?: string;
  metadata?: Record<string, any>;
}

export interface StartTrialParams {
  profileId: string;
  plan?: MembershipPlan;
  trialDays: number;
  reason?: string;
  adminId?: string;
  metadata?: Record<string, any>;
}

export interface ExtendMembershipParams {
  profileId: string;
  additionalDays: number;
  reason?: string;
  adminId?: string;
  metadata?: Record<string, any>;
}

export interface CancelMembershipParams {
  profileId: string;
  immediate?: boolean;
  reason?: string;
  adminId?: string;
  metadata?: Record<string, any>;
}

export interface ResumeMembershipParams {
  profileId: string;
  reason?: string;
  adminId?: string;
  metadata?: Record<string, any>;
}

export interface GrantQuotaParams {
  profileId: string;
  featureKey: string;
  quotaAmount: number;
  reason?: string;
  adminId?: string;
  metadata?: Record<string, any>;
}

export interface ResetQuotaParams {
  profileId: string;
  featureKey: string;
  reason?: string;
  adminId?: string;
  metadata?: Record<string, any>;
}

export interface CreateOverrideParams {
  profileId: string;
  featureKey: string;
  isEnabled: boolean;
  customLimit?: number;
  expiresAt?: string;
  reason?: string;
  adminId?: string;
  metadata?: Record<string, any>;
}

export interface RemoveOverrideParams {
  profileId: string;
  featureKey: string;
  reason?: string;
  adminId?: string;
  metadata?: Record<string, any>;
}

export interface MembershipDetails {
  id: string;
  profileId: string;
  plan: string;
  status: SubscriptionState;
  provider: MembershipProviderType | string;
  reason?: string;
  aiPlusUntil?: string | null;
  proUntil?: string | null;
  currentPeriodEnd?: string | null;
  createdAt?: string | null;
  profile?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    referral_code?: string | null;
  };
}

export interface ListMembershipsOptions {
  search?: string;
  plan?: string;
  status?: string;
  provider?: string;
  page?: number;
  limit?: number;
}

export interface IMembershipProvider {
  readonly providerType: MembershipProviderType;

  assignPlan(params: AssignPlanParams): Promise<{ success: boolean; membership: MembershipDetails }>;
  changePlan(params: ChangePlanParams): Promise<{ success: boolean; membership: MembershipDetails }>;
  startTrial(params: StartTrialParams): Promise<{ success: boolean; membership: MembershipDetails }>;
  extendMembership(params: ExtendMembershipParams): Promise<{ success: boolean; membership: MembershipDetails }>;
  cancelMembership(params: CancelMembershipParams): Promise<{ success: boolean; membership: MembershipDetails }>;
  resumeMembership(params: ResumeMembershipParams): Promise<{ success: boolean; membership: MembershipDetails }>;
  grantQuota(params: GrantQuotaParams): Promise<{ success: boolean }>;
  resetQuota(params: ResetQuotaParams): Promise<{ success: boolean }>;
  createOverride(params: CreateOverrideParams): Promise<{ success: boolean }>;
  removeOverride(params: RemoveOverrideParams): Promise<{ success: boolean }>;
  getMembership(profileId: string): Promise<MembershipDetails | null>;
  listMemberships(options?: ListMembershipsOptions): Promise<{ data: MembershipDetails[]; total: number }>;
}
