import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
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

  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching users:', error)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary">User Management</h1>
          <p className="text-[13px] text-text-secondary mt-1">
            View and manage registered users. Showing last 100 users.
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
                <th className="p-4">User ID / Email</th>
                <th className="p-4">Name</th>
                <th className="p-4">Role</th>
                <th className="p-4">Joined At</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main">
              {users?.map((user) => (
                <tr key={user.id} className="hover:bg-bg-main/50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-text-primary">{user.email || 'No email'}</div>
                    <div className="text-[11px] text-text-secondary font-mono mt-0.5">{user.id}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-text-primary">{user.full_name || '—'}</div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-surface border border-border-main rounded-md text-[11px] font-bold">
                      {user.role || 'user'}
                    </span>
                  </td>
                  <td className="p-4 text-text-secondary">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-primary font-semibold hover:underline">
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {!users?.length && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-text-secondary">
                    No users found.
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
