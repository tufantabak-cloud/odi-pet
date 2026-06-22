import { getLatestScores } from '@/lib/agents/dataQualityAgent'

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const scores = await getLatestScores(50)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Kullanıcı Skorları (Son 50)</h1>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b">
            <th className="p-2">Profile ID</th>
            <th className="p-2">Score</th>
            <th className="p-2">Missing Fields</th>
            <th className="p-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {scores?.map((row: any) => {
            const meta = row.metadata as any;
            return (
              <tr key={row.profile_id} className="border-b hover:bg-gray-50">
                <td className="p-2 font-mono text-sm">{row.profile_id}</td>
                <td className="p-2 font-bold">{meta?.score ?? 0}</td>
                <td className="p-2 text-red-500 text-sm">{meta?.missing_fields?.join(', ')}</td>
                <td className="p-2 text-sm text-gray-500">{new Date(row.created_at).toLocaleString()}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
