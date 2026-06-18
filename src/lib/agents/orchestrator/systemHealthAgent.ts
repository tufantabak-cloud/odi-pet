import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export interface AgentHealthStatus {
  agent: string
  last_run_at: string | null
  last_run_status: 'success' | 'failed' | 'unknown'
  last_run_duration_ms: number | null
  consecutive_failures: number
}

const AGENT_EVENT_MAP: Record<string, { success: string; failure: string }> = {
  'Data Quality':   { success: 'data_quality_batch_completed',  failure: 'orchestrator_agent_failed' },
  'Pet Profile':    { success: 'pet_profile_agent_completed',   failure: 'orchestrator_agent_failed' },
  'User Health':    { success: 'user_health_batch_completed',   failure: 'orchestrator_agent_failed' },
  'Notification':   { success: 'notification_sent',             failure: 'notification_failed' },
  'Orchestrator':   { success: 'orchestrator_run_completed',    failure: 'orchestrator_agent_failed' },
}

export async function getSystemHealth(): Promise<AgentHealthStatus[]> {
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

  const results: AgentHealthStatus[] = []

  for (const [agent, events] of Object.entries(AGENT_EVENT_MAP)) {
    // Son başarılı çalışma
    const { data: lastSuccess } = await supabase
      .from('event_stream')
      .select('created_at, metadata')
      .eq('event_type', events.success)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Son 24 saatte hata sayısı
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: failures } = await supabase
      .from('event_stream')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', events.failure)
      .ilike('metadata->>agent', `%${agent.toLowerCase().replace(' ', '_')}%`)
      .gte('created_at', yesterday)

    const duration_ms = lastSuccess?.metadata?.duration_ms ?? null

    results.push({
      agent,
      last_run_at: lastSuccess?.created_at ?? null,
      last_run_status: lastSuccess ? 'success' : 'unknown',
      last_run_duration_ms: duration_ms,
      consecutive_failures: failures ?? 0,
    })
  }

  return results
}
