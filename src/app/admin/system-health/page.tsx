import { getSystemHealth } from '@/lib/agents/orchestrator/systemHealthAgent'

export const dynamic = 'force-dynamic';

export default async function SystemHealthPage() {
  const agents = await getSystemHealth()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Sistem Sağlığı</h1>
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Son Çalışma</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Süre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Son 24s Hata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {agents.map(a => (
              <tr key={a.agent}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{a.agent}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {a.last_run_at ? new Date(a.last_run_at).toLocaleString('tr-TR') : 'Hiç çalışmadı'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${a.last_run_status === 'success' ? 'bg-green-100 text-green-800' : 
                      a.last_run_status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {a.last_run_status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {a.last_run_duration_ms ? `${(a.last_run_duration_ms / 1000).toFixed(1)}s` : '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {a.consecutive_failures > 0 
                    ? <span className="text-red-600 font-bold">{a.consecutive_failures}</span> 
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
