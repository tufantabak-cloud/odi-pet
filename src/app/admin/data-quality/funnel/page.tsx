import { getDropoffFunnel } from '@/lib/agents/dataQualityAgent'

export default async function FunnelPage() {
  const { counts, failures } = await getDropoffFunnel()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Onboarding Drop-off Funnel</h1>
      <div className="space-y-6 max-w-2xl">
        {Object.keys(counts).map(event => (
          <div key={event} className="p-4 border rounded shadow">
            <h2 className="text-xl font-semibold mb-2">{event}</h2>
            <p>Toplam Tetiklenme: <span className="font-bold">{counts[event]}</span></p>
            {failures[event] && Object.keys(failures[event]).length > 0 && (
              <div className="mt-2 text-sm text-red-600">
                <strong>Hatalar:</strong>
                <ul className="list-disc pl-5">
                  {Object.entries(failures[event]).map(([reason, count]) => (
                    <li key={reason}>{reason}: {count as number}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
