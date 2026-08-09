import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/get-current-profile'
import { logout } from '@/features/auth/actions'
import MobileAdminHeader from './MobileAdminHeader'
import AdminSidebarNav from './AdminSidebarNav'
import { ShieldCheck, UserCheck, ArrowLeft, LogOut } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Admin Console — Odi',
  robots: 'noindex, nofollow', // Never index admin pages
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(['admin', 'founder'])
  if (!profile) redirect('/login?reason=admin_required')

  const roleBadge = profile.role === 'founder' ? 'FOUNDER' : 'ADMIN'
  const roleBadgeColor =
    profile.role === 'founder'
      ? 'bg-purple-100 text-purple-700 border-purple-200'
      : 'bg-amber-100 text-amber-700 border-amber-200'

  return (
    <div className="min-h-dvh bg-bg-main flex">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-surface border-r border-border-main flex flex-col hidden md:flex sticky top-0 h-screen">
        <div className="p-6 border-b border-border-main flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/10 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-bold text-text-primary text-base">Odi Admin</span>
          </div>
          <span className={`text-2xs font-bold px-2.5 py-0.5 rounded-full border ${roleBadgeColor}`}>
            {roleBadge}
          </span>
        </div>

        {/* Dynamic Interactive Active Route Nav */}
        <AdminSidebarNav />

        <div className="p-4 border-t border-border-main space-y-1.5">
          {/* Current operator badge */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-main text-xs text-text-secondary font-semibold truncate">
            <UserCheck className="w-4 h-4 text-purple-600 shrink-0" />
            <span className="truncate">{profile.first_name ?? profile.email ?? 'Operatör'}</span>
          </div>
          <Link href="/owner/dashboard" className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-text-secondary hover:text-primary hover:bg-bg-main rounded-xl transition-all active:scale-[0.98]">
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Uygulamaya Dön</span>
          </Link>
          <form action={logout} className="w-full">
            <button type="submit" className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-error hover:bg-error/10 rounded-xl transition-all active:scale-[0.98]">
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Çıkış Yap</span>
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

