import { getSystemHealth } from '@/lib/agents/orchestrator/systemHealthAgent'
import { Stethoscope, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic';

export default async function SystemHealthPage() {
  const agents = await getSystemHealth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-text-primary flex items-center gap-2.5">
          <Stethoscope className="w-6 h-6 text-purple-600 shrink-0" />
          <span>Sistem Sağlığı & Ajan Durumu</span>
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Arka planda çalışan otonom servislerin ve orkestrasyon ajanlarının canlı durum raporu.
        </p>
      </div>

      <div className="card-base rounded-3xl overflow-hidden shadow-xs border border-border-main">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-main border-b border-border-main text-text-secondary font-black tracking-widest uppercase text-2xs">
              <tr>
                <th className="px-6 py-4 font-bold">Servis / Ajan</th>
                <th className="px-6 py-4 font-bold">Son Çalışma</th>
                <th className="px-6 py-4 font-bold">Durum</th>
                <th className="px-6 py-4 font-bold">Çalışma Süresi</th>
                <th className="px-6 py-4 font-bold text-right">Son 24s Hata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main">
              {agents.map(a => {
                const isSuccess = a.last_run_status === 'success'
                const isFailed = a.last_run_status === 'failed'
                return (
                  <tr key={a.agent} className="hover:bg-bg-main/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-text-primary text-sm">{a.agent}</td>
                    <td className="px-6 py-4 text-text-secondary">
                      {a.last_run_at ? new Date(a.last_run_at).toLocaleString('tr-TR') : 'Hiç çalışmadı'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-2xs font-bold rounded-full border ${
                        isSuccess ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        isFailed ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {isSuccess ? <CheckCircle2 className="w-3 h-3" /> : isFailed ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        <span>{a.last_run_status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-secondary font-mono">
                      {a.last_run_duration_ms ? `${(a.last_run_duration_ms / 1000).toFixed(1)}s` : '—'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold">
                      {a.consecutive_failures > 0 
                        ? <span className="text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full text-2xs">{a.consecutive_failures} hata</span> 
                        : <span className="text-text-secondary font-normal">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
