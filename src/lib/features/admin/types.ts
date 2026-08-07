export type FeatureStatus = 'pending_review' | 'active' | 'beta' | 'deprecated' | 'disabled';
export type FeatureVisibility = 'public' | 'hidden' | 'internal';
export type FeatureScope = 'global' | 'per_pet';

export interface AdminFeature {
  key: string;
  label: string;
  description: string | null;
  scope: FeatureScope;
  status: FeatureStatus;
  visibility: FeatureVisibility;
  tags: string[];
  display_order: number;
  metadata: Record<string, any>;
  
  // Versioning info
  feature_version?: string;
  registry_version?: string;
  schema_version?: number;
  introduced_in_version?: string;
  deprecated_in_version?: string;
  last_synced_at?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;

  // Joined limits
  limits?: AdminFeatureLimit[];
}

export interface AdminFeatureLimit {
  id: string;
  plan_tier: string;
  limit_value: number | null;
  window_days: number;
  is_enabled: boolean;
}

export interface AuditLog {
  id: string;
  action: string;
  actor_id: string | null;
  feature_key: string;
  before_state: any;
  after_state: any;
  diff: any;
  created_at: string;
}

export interface VersionHistoryLog {
  id: string;
  feature_id: string;
  feature_key: string;
  old_version: string;
  new_version: string;
  sync_source: string;
  change_reason: string;
  actor: string;
  created_at: string;
}
