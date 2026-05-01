import { ReactNode } from 'react'
import { requireRole } from '@/lib/auth/get-current-profile'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import FloatingSOS from '@/components/FloatingSOS'
import Link from 'next/link'

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole(['owner'])
  if (!profile) redirect('/login')

  const initial = profile.first_name?.charAt(0)?.toUpperCase() ?? 'U'

  return (
    <div className="flex min-h-screen flex-col font-sans">

      {/* Minimal Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border-main bg-surface/80 backdrop-blur-lg px-5 lg:px-10">
        <Link href="/owner/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover shadow-md shadow-primary/25">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
            </svg>
          </div>
          <span className="text-[20px] font-extrabold text-text-primary tracking-tight hidden sm:block">Odi</span>
        </Link>

        <div className="flex items-center gap-3">
          {/* SOS Button */}
          <FloatingSOS />
          
          {/* Notifications */}
          <Link href="/owner/notifications" className="relative w-9 h-9 rounded-full flex items-center justify-center border border-border-main bg-surface hover:bg-bg-main transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </Link>
          {/* Avatar */}
          <Link href="/owner/profile" className="w-9 h-9 rounded-full bg-primary-soft border-2 border-white shadow-sm flex items-center justify-center hover:ring-2 hover:ring-primary/20 transition-all">
            <span className="text-primary font-extrabold text-[14px]">{initial}</span>
          </Link>
        </div>
      </header>

      {/* Desktop Sidebar + Mobile Scroll Content */}
      <div className="flex flex-1 w-full max-w-[1440px] mx-auto">

        {/* Desktop Sidebar Nav */}
        <aside className="hidden md:flex w-[220px] shrink-0 flex-col gap-1 p-6 border-r border-border-main sticky top-16 h-[calc(100vh-4rem)] self-start overflow-y-auto">
          <Link href="/owner/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-[14px] text-[14px] font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-main transition-all group mb-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:text-primary transition-colors">
              <path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/>
            </svg>
            Ana Sayfa
          </Link>

          <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest px-4 mb-2 mt-2">CARE OS</p>
          {[
            { href: '/owner/health',     label: 'Sağlık',     icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
            { href: '/owner/nutrition',  label: 'Beslenme',    icon: 'M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3' },
            { href: '/owner/care',       label: 'Bakım',       icon: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' },
          ].map(({ href, label, icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-4 py-2.5 rounded-[14px] text-[14px] font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-main transition-all group">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:text-primary transition-colors">
                <path d={icon}/>
              </svg>
              {label}
            </Link>
          ))}

          <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest px-4 mb-2 mt-6">OPERATIONS</p>
          {[
            { href: '/owner/tasks',      label: 'Görevler',  icon: 'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
            { href: '/owner/calendar',   label: 'Takvim',      icon: 'M3 4h18v18H3V4z M16 2v4M8 2v4M3 10h18' },
          ].map(({ href, label, icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-4 py-2.5 rounded-[14px] text-[14px] font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-main transition-all group">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:text-primary transition-colors">
                <path d={icon}/>
              </svg>
              {label}
            </Link>
          ))}

          <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest px-4 mb-2 mt-6">INTELLIGENCE</p>
          <Link href="/owner/ai-vet"
            className="flex items-center gap-3 px-4 py-2.5 rounded-[14px] text-[14px] font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-main transition-all group">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:text-primary transition-colors">
              <path d="M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2zM12 8v4m0 4h.01"/>
            </svg>
            AI Vet
          </Link>

        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-10 pb-32 md:pb-10 min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile Glass Bottom Nav */}
      <BottomNav />
    </div>
  )
}
