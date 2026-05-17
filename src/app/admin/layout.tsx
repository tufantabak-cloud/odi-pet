import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Founder Console — ODI Pet',
  robots: 'noindex, nofollow', // Never index admin pages
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-main flex">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-surface border-r border-border-main flex flex-col hidden md:flex sticky top-0 h-screen">
        <div className="p-6 border-b border-border-main flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[20px]">🔭</span>
            <span className="font-black text-text-primary text-[15px]">Odi Admin</span>
          </div>
          <span className="text-[10px] font-bold text-text-secondary bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            ROOT
          </span>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="mb-4">
            <p className="px-3 text-[11px] font-black text-text-secondary uppercase tracking-widest mb-2">Overview</p>
            <Link href="/admin" className="flex items-center gap-3 px-3 py-2 text-[13px] font-semibold text-text-secondary hover:text-primary hover:bg-bg-main rounded-xl transition-all">
              <span>🏠</span> Dashboard
            </Link>
            <Link href="/admin/intelligence" className="flex items-center gap-3 px-3 py-2 text-[13px] font-semibold text-text-secondary hover:text-primary hover:bg-bg-main rounded-xl transition-all">
              <span>📊</span> Intelligence
            </Link>
          </div>

          <div className="mb-4">
            <p className="px-3 text-[11px] font-black text-text-secondary uppercase tracking-widest mb-2">Management</p>
            <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2 text-[13px] font-semibold text-text-secondary hover:text-primary hover:bg-bg-main rounded-xl transition-all">
              <span>👥</span> Users
            </Link>
            <Link href="/admin/pets" className="flex items-center gap-3 px-3 py-2 text-[13px] font-semibold text-text-secondary hover:text-primary hover:bg-bg-main rounded-xl transition-all">
              <span>🐾</span> Pets
            </Link>
            <Link href="/admin/outreach" className="flex items-center gap-3 px-3 py-2 text-[13px] font-semibold text-text-secondary hover:text-primary hover:bg-bg-main rounded-xl transition-all">
              <span>📋</span> Pipeline (Outreach)
            </Link>
          </div>

          <div className="mb-4">
            <p className="px-3 text-[11px] font-black text-text-secondary uppercase tracking-widest mb-2">System</p>
            <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-2 text-[13px] font-semibold text-text-secondary hover:text-primary hover:bg-bg-main rounded-xl transition-all">
              <span>⚙️</span> Settings & Flags
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-border-main">
          <Link href="/owner/dashboard" className="flex items-center gap-3 px-3 py-2 text-[13px] font-semibold text-text-secondary hover:text-primary hover:bg-bg-main rounded-xl transition-all">
            <span>←</span> Back to App
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full overflow-x-hidden">
        {/* Mobile Header */}
        <div className="md:hidden border-b border-border-main bg-surface sticky top-0 z-40 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[18px]">🔭</span>
            <span className="font-black text-text-primary text-[14px]">Odi Admin</span>
          </div>
          <Link href="/owner/dashboard" className="text-[12px] font-semibold text-text-secondary">
            ← App
          </Link>
        </div>
        <div className="p-6 md:p-10 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
