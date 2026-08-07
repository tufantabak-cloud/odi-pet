import { SupabaseClient } from '@supabase/supabase-js';
import { AdminFeature, AuditLog, VersionHistoryLog } from './types';

export class AdminQueries {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async getAllFeatures(): Promise<AdminFeature[]> {
    // Left join with limits to construct a complete view
    const { data: features, error } = await this.supabase
      .from('app_features')
      .select(`
        *,
        limits:feature_limits(*)
      `)
      .order('display_order', { ascending: true })
      .order('key', { ascending: true });

    if (error) throw new Error(`Failed to fetch features: ${error.message}`);

    return (features || []) as AdminFeature[];
  }

  async getFeatureAuditLogs(featureKey: string): Promise<AuditLog[]> {
    const { data, error } = await this.supabase
      .from('feature_audit_logs')
      .select('*')
      .eq('feature_key', featureKey)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch audit logs: ${error.message}`);
    
    return data as AuditLog[];
  }

  async getFeatureVersionHistory(featureKey: string): Promise<VersionHistoryLog[]> {
    // Assuming feature_version_history table from Phase 5A
    const { data, error } = await this.supabase
      .from('feature_version_history')
      .select('*')
      .eq('feature_key', featureKey)
      .order('created_at', { ascending: false });

    if (error) {
      // If table doesn't exist yet or query fails, return empty
      console.error(`Failed to fetch version history:`, error);
      return [];
    }

    return data as VersionHistoryLog[];
  }
}
