import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export type RiskSegment = 'high' | 'medium' | 'low';

export interface HealthMetadata {
  completeness_score: number;
  days_inactive: number;
  action_required: string;
}

/**
 * Kullanıcı Sağlık (Churn) riskini kural bazlı hesaplar
 */
export function calculateChurnRisk(completeness_score: number, last_active_at: Date | string | null): { segment: RiskSegment; days_inactive: number } {
  if (!last_active_at) {
    return { segment: 'high', days_inactive: 999 }; // Hiç aktif olmamışsa risk çok yüksek
  }

  const lastActiveDate = new Date(last_active_at);
  const diffTime = Math.abs(new Date().getTime() - lastActiveDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let segment: RiskSegment = 'low';

  // HIGH: 30+ gün inaktif VEYA (14+ gün inaktif VE skor < %40)
  if (diffDays > 30 || (diffDays > 14 && completeness_score < 40)) {
    segment = 'high';
  } 
  // MEDIUM: 14+ gün inaktif VEYA (7+ gün inaktif VE skor < %70)
  else if (diffDays > 14 || (diffDays > 7 && completeness_score < 70)) {
    segment = 'medium';
  } 
  // LOW: 7 günden az inaktif VE skor >= %70
  else {
    segment = 'low';
  }

  return { segment, days_inactive: diffDays };
}

/**
 * Hesaplanan riski event_stream tablosuna emit eder
 */
export async function emitHealthEvent(
  profile_id: string, 
  risk_segment: RiskSegment, 
  metadata: HealthMetadata
) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
            }
          },
        },
      }
    )

    // Event fırlat (Insert into event_stream)
    const { error } = await supabase
      .from('event_stream')
      .insert({
        profile_id,
        event_type: 'churn_risk_detected',
        metadata: {
          risk_segment,
          ...metadata,
          emitted_by: 'user_health_agent',
          timestamp: new Date().toISOString()
        }
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
