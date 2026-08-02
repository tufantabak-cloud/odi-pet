import { getScoreDistribution } from '@/lib/agents/dataQualityAgent'
import { Database, CheckCircle2, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react'

export default async function DataQualityDashboard() {
  const dist = await getScoreDistribution()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-text-primary flex items-center gap-2.5">
          <Database className="w-6 h-6 text-purple-600 shrink-0" />
          <span>Veri Kalitesi Özeti</span>
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Kullanıcı profilleri ve evcil hayvan sağlık verilerinin tamlık skor dağılımı.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-base rounded-3xl p-5 border border-emerald-200 bg-emerald-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xs font-bold text-emerald-700 uppercase tracking-wider">Yüksek (70+)</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-emerald-700">{dist.high}</p>
        </div>

        <div className="card-base rounded-3xl p-5 border border-amber-200 bg-amber-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xs font-bold text-amber-700 uppercase tracking-wider">Orta (40-69)</span>
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-3xl font-black text-amber-700">{dist.medium}</p>
        </div>

        <div className="card-base rounded-3xl p-5 border border-rose-200 bg-rose-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xs font-bold text-rose-700 uppercase tracking-wider">Düşük (0-39)</span>
            <AlertCircle className="w-5 h-5 text-rose-600" />
          </div>
          <p className="text-3xl font-black text-rose-700">{dist.low}</p>
        </div>

        <div className="card-base rounded-3xl p-5 border border-slate-200 bg-slate-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xs font-bold text-slate-700 uppercase tracking-wider">Evcil Hayvanı Yok</span>
            <HelpCircle className="w-5 h-5 text-slate-500" />
          </div>
          <p className="text-3xl font-black text-slate-700">{dist.no_pet}</p>
        </div>
      </div>
    </div>
  )
}
