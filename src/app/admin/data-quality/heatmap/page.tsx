import { getFieldFillRates } from '@/lib/agents/dataQualityAgent'

export default async function HeatmapPage() {
  const fillRates = await getFieldFillRates()
  const healthRecordFields = ['vaccines.has_record', 'treatments.has_record']

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Alan Doluluk Isı Haritası</h1>
      <div className="max-w-xl">
        {fillRates.map(f => (
          <div key={f.field} className="mb-4">
            <div className="flex justify-between mb-1 items-center">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{f.field}</span>
                {healthRecordFields.includes(f.field) && (
                  <span className="badge-health">Sağlık kaydı</span>
                )}
              </div>
              <span>{f.fill_rate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded h-4">
              <div 
                className={`h-4 rounded ${f.fill_rate > 70 ? 'bg-green-500' : f.fill_rate > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                style={{ width: `${f.fill_rate}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
