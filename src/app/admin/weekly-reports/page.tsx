import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { BarChart3, FileSpreadsheet } from 'lucide-react'

export const dynamic = 'force-dynamic';

export default async function WeeklyReportsPage() {
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

  const { data: reports } = await supabase
    .from('event_stream')
    .select('metadata, created_at')
    .eq('event_type', 'weekly_report_generated')
    .order('created_at', { ascending: false })
    .limit(12) // Son 12 hafta (3 ay)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-text-primary flex items-center gap-2.5">
          <BarChart3 className="w-6 h-6 text-purple-600 shrink-0" />
          <span>Haftalık Sistem Raporları</span>
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Sistem orkestrasyonu tarafından otomatik oluşturulan haftalık performans ve sağlık raporları.
        </p>
      </div>

      {(!reports || reports.length === 0) ? (
        <div className="card-base p-12 text-center text-text-secondary rounded-3xl">
          <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-text-secondary opacity-50" />
          <p className="font-semibold text-sm">Henüz hiç haftalık rapor oluşturulmamış.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((r, i) => (
            <div key={i} className="card-base rounded-3xl p-6 border-t-4 border-t-purple-600 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold mb-4 text-purple-900 flex items-center justify-between">
                  <span>Hafta: {r.metadata.week}</span>
                  <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Haftalık</span>
                </h2>
                <div className="space-y-2.5 text-xs text-text-secondary">
                  <div className="flex justify-between">
                    <span className="font-semibold text-text-primary">Yüksek Skor:</span>
                    <span className="font-bold text-emerald-600">{r.metadata.score_distribution?.high || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-text-primary">Churn Tespiti:</span>
                    <span className="text-rose-600 font-bold">{r.metadata.churn_detected}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-text-primary">Aşı Uyarısı:</span>
                    <span className="font-bold text-amber-600">{r.metadata.vaccines_due}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-text-primary">Bildirim:</span>
                    <span className="font-bold text-sky-600">{r.metadata.notifications_sent}</span>
                  </div>
                  <div className="pt-2 border-t border-border-main">
                    <span className="font-semibold text-text-primary block mb-1.5">En Boş Alanlar:</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {r.metadata.top_missing_fields?.map((f: string) => (
                        <span key={f} className="px-2 py-0.5 bg-bg-main text-text-secondary border border-border-main rounded-md text-2xs font-mono">{f}</span>
                      )) || <span className="text-text-secondary text-2xs">Veri yok</span>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border-main text-2xs text-text-secondary text-right font-mono">
                {new Date(r.created_at).toLocaleString('tr-TR')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
