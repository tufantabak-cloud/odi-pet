import { getScoreDistribution } from '@/lib/agents/dataQualityAgent'

export default async function DataQualityDashboard() {
  const dist = await getScoreDistribution()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Veri Kalitesi Özeti</h1>
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 border rounded shadow">
          <h2 className="text-xl font-bold text-green-600">Yüksek (70+)</h2>
          <p className="text-3xl">{dist.high}</p>
        </div>
        <div className="p-4 border rounded shadow">
          <h2 className="text-xl font-bold text-yellow-600">Orta (40-69)</h2>
          <p className="text-3xl">{dist.medium}</p>
        </div>
        <div className="p-4 border rounded shadow">
          <h2 className="text-xl font-bold text-red-600">Düşük (0-39)</h2>
          <p className="text-3xl">{dist.low}</p>
        </div>
        <div className="p-4 border rounded shadow">
          <h2 className="text-xl font-bold text-gray-600">Evcil Hayvanı Yok</h2>
          <p className="text-3xl">{dist.no_pet}</p>
        </div>
      </div>
    </div>
  )
}
