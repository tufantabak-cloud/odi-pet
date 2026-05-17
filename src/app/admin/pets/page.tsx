import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminPetsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: pets, error } = await supabase
    .from('pets')
    .select('*, users(email, full_name)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching pets:', error)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary">Pet Management</h1>
          <p className="text-[13px] text-text-secondary mt-1">
            View and manage registered pets. Showing last 100 pets.
          </p>
        </div>
        <Link href="/admin" className="btn-secondary text-[13px] px-4 py-2">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="card-base overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-bg-main border-b border-border-main text-text-secondary font-black tracking-widest uppercase text-[11px]">
              <tr>
                <th className="p-4">Pet Name / Type</th>
                <th className="p-4">Owner</th>
                <th className="p-4">Breed / Age</th>
                <th className="p-4">Created At</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main">
              {pets?.map((pet) => (
                <tr key={pet.id} className="hover:bg-bg-main/50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-text-primary flex items-center gap-2">
                      {pet.type === 'cat' ? '🐱' : '🐶'} {pet.name || 'Unnamed'}
                    </div>
                    <div className="text-[11px] text-text-secondary font-mono mt-0.5">{pet.id}</div>
                  </td>
                  <td className="p-4">
                    {/* @ts-ignore */}
                    <div className="font-medium text-text-primary">{pet.users?.full_name || '—'}</div>
                    {/* @ts-ignore */}
                    <div className="text-[11px] text-text-secondary">{pet.users?.email}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-text-primary">{pet.breed || '—'}</div>
                    <div className="text-[11px] text-text-secondary">
                      {pet.birth_date ? new Date(pet.birth_date).toLocaleDateString() : '—'}
                    </div>
                  </td>
                  <td className="p-4 text-text-secondary">
                    {new Date(pet.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-primary font-semibold hover:underline">
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {!pets?.length && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-text-secondary">
                    No pets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
