// lib/agents/orchestrator/eventContract.ts

export type OdiEventType =
  // Data Quality Agent
  | 'data_quality_scored'
  | 'data_quality_batch_completed'
  // Pet Profile Agent
  | 'vaccine_due_soon'
  | 'pet_profile_agent_completed'
  // User Health Agent
  | 'churn_risk_detected'
  | 'user_health_batch_completed'
  // Notification Agent
  | 'notification_sent'
  | 'notification_failed'
  // Orchestrator
  | 'orchestrator_run_started'
  | 'orchestrator_run_completed'
  | 'orchestrator_agent_failed'
  | 'orchestrator_agent_completed'
  | 'weekly_report_generated'

export interface EventMetadataMap {
  data_quality_scored: {
    score: number
    breakdown: Record<string, number>
    missing_fields: string[]
    has_any_pet: boolean
    weakest_pet_id: string | null
  }
  data_quality_batch_completed: {
    processed: number
    errors: number
    summary: { high: number; medium: number; low: number }
  }
  vaccine_due_soon: {
    pet_id: string
    pet_name: string
    vaccine_name: string
    next_due_at: string
    days_until_due: number
  }
  pet_profile_agent_completed: {
    processed: number
    vaccines_due_detected: number
  }
  churn_risk_detected: {
    risk_level: 'high' | 'medium'
    completeness_score: number
    last_active_at: string
    reason: string
    [key: string]: any // Eklenebilecek ekstra alanlar için
  }
  user_health_batch_completed: {
    processed: number
    high_risks_detected: number
  }
  notification_sent: {
    channel: 'web_push' | 'email'
    trigger_event: OdiEventType
    pet_id?: string
  }
  notification_failed: {
    channel: 'web_push' | 'email'
    trigger_event: OdiEventType
    error: string
  }
  orchestrator_run_started: {
    run_id: string
    triggered_by: 'cron' | 'manual'
    agents_planned: string[]
  }
  orchestrator_run_completed: {
    run_id: string
    duration_ms: number
    agents_succeeded: string[]
    agents_failed: string[]
    total_users_processed: number
  }
  orchestrator_agent_failed: {
    run_id: string
    agent: string
    error: string
    downstream_skipped: string[]
  }
  orchestrator_agent_completed: {
    event: string
    status: string
    pipeline_active: boolean
    event_contract_enforced: boolean
    weekly_report_active: boolean
    system_health_dashboard: boolean
    vercel_cron_updated: boolean
    sprint: number
  }
  weekly_report_generated: {
    week: string          // ISO: '2025-W23'
    score_distribution: { high: number; medium: number; low: number; critical?: number }
    churn_detected: number
    vaccines_due: number
    notifications_sent: number
    top_missing_fields: string[]
  }
}

// Type-safe event yazma fonksiyonu
export async function writeEvent<T extends OdiEventType>(
  supabase: any, // ReturnType<typeof import('@/lib/supabase/server').createClient> type karmaşası yapmasın diye any
  profile_id: string | null,
  event_type: T,
  metadata: EventMetadataMap[T]
) {
  return supabase.from('event_stream').insert({
    profile_id,
    event_type,
    metadata,
  })
}
