import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getScoreDistribution, getFieldFillRates } from '@/lib/agents/dataQualityAgent'
import { writeEvent } from './eventContract'

function getISOWeek(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum = Math.round(
    ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  ) + 1
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

export async function generateWeeklyReport() {
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

  const week = getISOWeek(new Date())

  // Skor dağılımı
  const scoreDistribution = await getScoreDistribution()

  // Son 7 günde kaç churn tespiti
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count: churn_detected } = await supabase
    .from('event_stream')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'churn_risk_detected')
    .gte('created_at', sevenDaysAgo)

  // Son 7 günde kaç aşı uyarısı
  const { count: vaccines_due } = await supabase
    .from('event_stream')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'vaccine_due_soon')
    .gte('created_at', sevenDaysAgo)

  // Son 7 günde gönderilen bildirimler
  const { count: notifications_sent } = await supabase
    .from('event_stream')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'notification_sent')
    .gte('created_at', sevenDaysAgo)

  // En çok boş kalan alanlar (ilk 3)
  const fillRates = await getFieldFillRates(500)
  const top_missing_fields = fillRates.slice(0, 3).map((r: any) => r.field)

  await writeEvent(supabase, null, 'weekly_report_generated', {
    week,
    score_distribution: scoreDistribution,
    churn_detected: churn_detected ?? 0,
    vaccines_due: vaccines_due ?? 0,
    notifications_sent: notifications_sent ?? 0,
    top_missing_fields,
  })

  return { week, scoreDistribution, churn_detected, vaccines_due, notifications_sent, top_missing_fields }
}
