import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic';

export default async function WeeklyReportsPage() {
  const cookieStore = cookies()
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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Haftalık Sistem Raporları</h1>
      {(!reports || reports.length === 0) ? (
        <p className="text-gray-500">Henüz hiç rapor oluşturulmamış.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((r, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 border-t-4 border-indigo-500">
              <h2 className="text-xl font-bold mb-4 text-indigo-700">Hafta: {r.metadata.week}</h2>
              <div className="space-y-2 text-sm text-gray-600">
                <p><span className="font-semibold text-gray-800">Yüksek Skor:</span> {r.metadata.score_distribution?.high || 0}</p>
                <p><span className="font-semibold text-gray-800">Churn Tespiti:</span> <span className="text-red-500 font-bold">{r.metadata.churn_detected}</span></p>
                <p><span className="font-semibold text-gray-800">Aşı Uyarısı:</span> {r.metadata.vaccines_due}</p>
                <p><span className="font-semibold text-gray-800">Bildirim:</span> {r.metadata.notifications_sent}</p>
                <div>
                  <span className="font-semibold text-gray-800 block mb-1">En Boş Alanlar:</span>
                  <div className="flex gap-2 flex-wrap">
                    {r.metadata.top_missing_fields?.map((f: string) => (
                      <span key={f} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">{f}</span>
                    )) || <span className="text-gray-400">Veri yok</span>}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-xs text-gray-400 text-right">
                Oluşturulma: {new Date(r.created_at).toLocaleString('tr-TR')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
