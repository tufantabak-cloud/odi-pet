import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { writeEvent, OdiEventType, EventMetadataMap } from '@/lib/agents/orchestrator/eventContract'

export type RiskSegment = 'high' | 'medium' | 'low';

export interface HealthMetadata {
  completeness_score: number;
  days_inactive: number;
  action_required: string;
}

export function calculateChurnRisk(completeness_score: number, last_active_at: Date | string | null): { segment: RiskSegment; days_inactive: number } {
  if (!last_active_at) {
    return { segment: 'high', days_inactive: 999 }; 
  }
  const lastActiveDate = new Date(last_active_at);
  const diffTime = Math.abs(new Date().getTime() - lastActiveDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let segment: RiskSegment = 'low';
  if (diffDays > 30 || (diffDays > 14 && completeness_score < 40)) {
    segment = 'high';
  } else if (diffDays > 14 || (diffDays > 7 && completeness_score < 70)) {
    segment = 'medium';
  } else {
    segment = 'low';
  }
  return { segment, days_inactive: diffDays };
}

export async function emitHealthEvent(
  supabase: any,
  profile_id: string, 
  risk_segment: RiskSegment, 
  metadata: HealthMetadata
) {
  try {
    const { error } = await writeEvent(supabase, profile_id, 'churn_risk_detected', {
      risk_level: risk_segment as 'high' | 'medium',
      completeness_score: metadata.completeness_score,
      last_active_at: new Date().toISOString(),
      reason: 'Rule based churn risk calculation'
    });

    if (error) {
      console.error('Error emitting health event:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to emit health event:', err);
    return false;
  }
}

// Orchestrator için toplu scan wrapper
export async function runUserHealthScan() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {} 
      },
    }
  )

  const { data: profiles, error } = await supabase.from('profiles').select('id, updated_at');
  if (error) throw error;
  
  let processed = 0;
  let highRisks = 0;

  for (const profile of profiles || []) {
    const mockCompleteness = Math.floor(Math.random() * 100); 
    const { segment, days_inactive } = calculateChurnRisk(mockCompleteness, profile.updated_at);

    if (segment === 'high' || segment === 'medium') {
      const success = await emitHealthEvent(supabase, profile.id, segment, {
        completeness_score: mockCompleteness,
        days_inactive,
        action_required: 'trigger_notification'
      });
      if (success && segment === 'high') highRisks++;
    }
    processed++;
  }

  await writeEvent(supabase, null, 'user_health_batch_completed', {
    processed,
    high_risks_detected: highRisks
  });

  return { processed, highRisks };
}
