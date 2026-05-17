import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
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

  // Quick stats
  const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true })
  const { count: petsCount } = await supabase.from('pets').select('*', { count: 'exact', head: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-text-primary">Admin Dashboard</h1>
        <p className="text-[13px] text-text-secondary mt-1">
          Welcome to the Odi.Pet Admin Console. Here you can manage users, pets, content, and system configurations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Quick Stat Cards */}
        <div className="rounded-2xl border border-border-main bg-surface p-5">
          <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest mb-2">Total Users</p>
          <p className="text-3xl font-black text-text-primary">{usersCount ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-border-main bg-surface p-5">
          <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest mb-2">Total Pets</p>
          <p className="text-3xl font-black text-text-primary">{petsCount ?? 0}</p>
        </div>
        {/* Placeholder for more stats */}
        <div className="rounded-2xl border border-border-main bg-surface p-5">
          <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest mb-2">System Status</p>
          <p className="text-xl font-black text-green-600 mt-2 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
            All Systems Go
          </p>
        </div>
      </div>

      <h2 className="text-[15px] font-black text-text-primary mt-8 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/users" className="card-base p-5 hover:border-primary transition-all group">
          <div className="text-[24px] mb-3">👥</div>
          <h3 className="font-bold text-[14px] text-text-primary group-hover:text-primary">Manage Users</h3>
          <p className="text-[12px] text-text-secondary mt-1">View, edit, or block registered users.</p>
        </Link>
        <Link href="/admin/pets" className="card-base p-5 hover:border-primary transition-all group">
          <div className="text-[24px] mb-3">🐾</div>
          <h3 className="font-bold text-[14px] text-text-primary group-hover:text-primary">Manage Pets</h3>
          <p className="text-[12px] text-text-secondary mt-1">Review pet profiles and generated reports.</p>
        </Link>
        <Link href="/admin/intelligence" className="card-base p-5 hover:border-primary transition-all group">
          <div className="text-[24px] mb-3">📊</div>
          <h3 className="font-bold text-[14px] text-text-primary group-hover:text-primary">Intelligence OS</h3>
          <p className="text-[12px] text-text-secondary mt-1">View comprehensive product metrics and funnels.</p>
        </Link>
      </div>
    </div>
  )
}
