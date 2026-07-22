import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/get-current-profile'
import { logout } from '@/features/auth/actions'
import MobileAdminHeader from './MobileAdminHeader'
import AdminSidebarNav from './AdminSidebarNav'

export const metadata: Metadata = {
  title: 'Admin Console — ODI Pet',
  robots: 'noindex, nofollow', // Never index admin pages
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(['admin', 'founder'])
  if (!profile) redirect('/login?reason=admin_required')

  const roleBadge = profile.role === 'founder' ? 'FOUNDER' : 'ADMIN'
  const roleBadgeColor =
    profile.role === 'founder'
      ? 'bg-purple-100 text-purple-700'
      : 'bg-amber-100 text-amber-700'

  return (
    <div className="min-h-dvh bg-bg-main flex">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-surface border-r border-border-main flex flex-col hidden md:flex sticky top-0 h-screen">
        <div className="p-6 border-b border-border-main flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[20px]">🔭</span>
            <span className="font-black text-text-primary text-[15px]">Odi Admin</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleBadgeColor}`}>
            {roleBadge}
          </span>
        </div>

        {/* Dynamic Interactive Active Route Nav */}
        <AdminSidebarNav />

        <div className="p-4 border-t border-border-main space-y-1">
          {/* Current operator badge */}
          <div className="px-3 py-2 rounded-xl bg-bg-main text-[12px] text-text-secondary font-semibold truncate">
            🧑‍💻 {profile.first_name ?? profile.email ?? 'Unknown'}
          </div>
          <Link href="/owner/dashboard" className="flex items-center gap-3 px-3 py-2 text-[13px] font-semibold text-text-secondary hover:text-primary hover:bg-bg-main rounded-xl transition-all">
            <span>←</span> Uygulamaya Dön
          </Link>
          <form action={logout} className="w-full mt-1">
            <button type="submit" className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-semibold text-error hover:bg-error/10 rounded-xl transition-all">
              <span>🚪</span> Çıkış Yap
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <MobileAdminHeader profile={profile} roleBadgeColor={roleBadgeColor} roleBadge={roleBadge} />
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
