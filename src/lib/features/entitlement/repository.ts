import { createAdminSupabaseClient } from '../../supabase/server';
import { PlanKey } from './types';

// Encapsulate DB operations to allow easier mocking and swapping
export class EntitlementRepository {
  private get supabase() {
    // In a real application, you might inject the client.
    // For universal usage (Server/Action/Cron), we use the admin client or a configured service role client.
    return createAdminSupabaseClient();
  }

  async getUserTier(userId: string): Promise<PlanKey> {
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return 'free'; // Default fallback
    }

    // 1. Check for Admin Preview Override via Cookie or Header (X-Odi-Preview)
    if (profile.role === 'admin' || profile.role === 'founder') {
      try {
        const { cookies, headers } = await import('next/headers');
        const headerStore = await headers();
        const previewHeader = headerStore.get('x-odi-preview');
        if (previewHeader) {
          console.log(`[PremiumPreview] Admin ${userId} previewing via Header as ${previewHeader}`);
          return previewHeader;
        }

        const cookieStore = await cookies();
        const previewCookie = cookieStore.get('odi_premium_preview');
        if (previewCookie && previewCookie.value) {
          console.log(`[PremiumPreview] Admin ${userId} previewing via Cookie as ${previewCookie.value}`);
          return previewCookie.value;
        }
      } catch (e) {
        // Headers/Cookies unavailable outside request context
      }
    }

    // 2. Read actual subscription from user_subscriptions
    const nowISO = new Date().toISOString();
    const { data: sub, error: subError } = await this.supabase
      .from('user_subscriptions')
      .select('plan, status, ai_plus_until, pro_until')
      .eq('profile_id', userId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError || !sub) {
      return 'free';
    }

    // ai_plus_until alanı hâlâ geçerliyse ai_plus döndür
    if (sub.ai_plus_until && sub.ai_plus_until > nowISO) {
      return 'ai_plus';
    }

    // pro_until alanı hâlâ geçerliyse pro döndür
    if (sub.pro_until && sub.pro_until > nowISO) {
      return 'pro';
    }

    // plan alanı direkt olarak geçerliyse (Stripe bazlı aktif abonelik)
    if (sub.plan && sub.plan !== 'free') {
      return sub.plan;
    }

    return 'free';
  }

  async getFeatureDatabaseStatus(featureKey: string) {
    const { data, error } = await this.supabase
      .from('app_features')
      .select('status, metadata')
      .eq('key', featureKey)
      .single();

    if (error || !data) return null;
    return data;
  }

  async getFeatureLimit(featureKey: string, tier: PlanKey) {
    const { data, error } = await this.supabase
      .from('feature_limits')
      .select('*')
      .eq('feature_key', featureKey)
      .eq('plan', tier)
      .single();

    if (error || !data) return null;
    return data;
  }

  async getCurrentUsage(userId: string, featureKey: string, context?: { petId?: string }): Promise<number> {
    // Phase 1 defines feature_usage. For now, we sum usage in the current window.
    // However, exact implementation depends on how you query window_days.
    // Assuming standard aggregation or relying on a view/RPC.
    // If table schema is: feature_key, profile_id, pet_id, usage_count
    
    let query = this.supabase
      .from('feature_usage')
      .select('usage_count')
      .eq('feature_key', featureKey)
      .eq('profile_id', userId);

    if (context?.petId) {
      query = query.eq('pet_id', context.petId);
    } else {
      query = query.is('pet_id', null);
    }

    const { data, error } = await query;
    
    if (error || !data) return 0;
    
    // Sum all usage rows if there are multiple (e.g. daily rows)
    return data.reduce((acc, row) => acc + (row.usage_count || 0), 0);
  }
}

export const defaultRepository = new EntitlementRepository();
