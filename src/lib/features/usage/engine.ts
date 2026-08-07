import { createClient } from '@supabase/supabase-js';
import { CacheProvider } from '../cache/types';
import { WindowResolver, WindowUnit } from './WindowResolver';

// Since this is a core engine, we expect Supabase and Cache dependencies to be injected or imported
// For this implementation, we assume we receive a Supabase client.
import { SupabaseClient } from '@supabase/supabase-js';

export interface ConsumeUsageParams {
  userId: string;
  featureKey: string;
  petId?: string;
  amount: number;
  idempotencyKey: string;
  windowUnit?: WindowUnit; 
  windowValue?: number;
}

export interface RollbackUsageParams {
  userId: string;
  featureKey: string;
  originalEventId: string;
  idempotencyKey: string;
  reason: string;
}

export interface PreviewUsageParams {
  userId: string;
  featureKey: string;
  petId?: string;
  windowUnit?: WindowUnit; 
  windowValue?: number;
}

export interface UsageResult {
  success: boolean;
  idempotentAlreadyProcessed?: boolean;
  reason?: string;
  eventId?: string;
  newTotalCount?: number;
  error?: string;
}

export interface PreviewUsageResult {
  currentUsage: number;
  windowStart: string;
  windowEnd: string | null;
}

export class UsageEngine {
  private supabase: SupabaseClient;
  private cache: CacheProvider;

  constructor(supabase: SupabaseClient, cache: CacheProvider) {
    this.supabase = supabase;
    this.cache = cache;
  }

  /**
   * Atomically consumes usage via RPC and invalidates cache upon success.
   */
  async consumeUsage(params: ConsumeUsageParams): Promise<UsageResult> {
    const window = WindowResolver.resolveWindow(params.windowUnit || 'month', params.windowValue || 1);
    const windowStartStr = window.start.toISOString().split('T')[0];
    const windowEndStr = window.end ? window.end.toISOString().split('T')[0] : null;

    const { data, error } = await this.supabase.rpc('consume_feature_usage', {
      p_profile_id: params.userId,
      p_feature_key: params.featureKey,
      p_pet_id: params.petId || null,
      p_amount: params.amount,
      p_idempotency_key: params.idempotencyKey
    });

    if (error) {
      return { success: false, idempotentAlreadyProcessed: false, error: error.message };
    }

    const result = data as any;
    
    // Invalidate the cache for this user so the next checkFeatureAccess pulls fresh usage
    if (result.success) {
      await this.cache.invalidateByUser(params.userId);
    }

    return {
      success: result.success,
      idempotentAlreadyProcessed: result.reason === 'IDEMPOTENCE_REPLAY',
      reason: result.reason,
      eventId: result.request_id || result.event_id,
      newTotalCount: result.used || result.new_total_count
    };
  }

  /**
   * Reverts a transaction by creating a compensating event (negative delta).
   */
  async rollbackUsage(params: RollbackUsageParams): Promise<UsageResult> {
    const { data, error } = await this.supabase.rpc('rollback_feature_usage', {
      p_original_event_id: params.originalEventId,
      p_reason: params.reason,
      p_idempotency_key: params.idempotencyKey
    });

    if (error) {
      return { success: false, idempotentAlreadyProcessed: false, error: error.message };
    }

    const result = data as any;

    if (result.success) {
      await this.cache.invalidateByUser(params.userId);
    }

    return {
      success: result.success,
      idempotentAlreadyProcessed: result.idempotent_already_processed,
      eventId: result.event_id,
      newTotalCount: result.new_total_count
    };
  }

  /**
   * Strictly READ-ONLY. No cache invalidation, no DB writes, no events.
   * Gets the current aggregate count for the resolved window.
   */
  async previewUsage(params: PreviewUsageParams): Promise<PreviewUsageResult> {
    const window = WindowResolver.resolveWindow(params.windowUnit || 'month', params.windowValue || 1);
    const windowStartStr = window.start.toISOString().split('T')[0];
    const windowEndStr = window.end ? window.end.toISOString().split('T')[0] : null;

    let query = this.supabase
      .from('feature_usage')
      .select('count')
      .eq('profile_id', params.userId)
      .eq('feature_key', params.featureKey)
      .eq('window_start', windowStartStr);

    if (params.petId) {
      query = query.eq('pet_id', params.petId);
    } else {
      query = query.is('pet_id', null);
    }

    const { data, error } = await query.single();

    // Not found means 0 usage for this window
    const currentUsage = data ? data.count : 0;

    return {
      currentUsage,
      windowStart: windowStartStr,
      windowEnd: windowEndStr
    };
  }

  /**
   * Gets current aggregate usage (alias for previewUsage since previewUsage is already purely read-only)
   */
  async getCurrentUsage(params: PreviewUsageParams): Promise<number> {
    const res = await this.previewUsage(params);
    return res.currentUsage;
  }

  /**
   * Resets usage by creating a new usage window.
   */
  async resetUsage(userId: string, featureKey: string, petId?: string): Promise<void> {
    const current = await this.previewUsage({ userId, featureKey, petId, windowUnit: 'month', windowValue: 1 });
    
    if (current.currentUsage > 0) {
       await this.consumeUsage({
         userId,
         featureKey,
         petId,
         amount: -current.currentUsage, // negative consume
         idempotencyKey: crypto.randomUUID(), // one-off key
       });
    }
  }
}
