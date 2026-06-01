import { ReactNode } from 'react'
import { requireRole } from '@/lib/auth/get-current-profile'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/clinic/dashboard',     label: 'İşlem Paneli', icon: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z' },
  { href: '/clinic/appointments',  label: 'Randevular',   icon: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z' },
  { href: '/clinic/pets',          label: 'Hasta Kaydı',  icon: 'M12 5c2.8 0 5 2.2 5 5 0 3-4 8-5 10-1-2-5-7-5-10 0-2.8 2.2-5 5-5z' },
  { href: '/clinic/care-plans',    label: 'Aşı Takvimi',  icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
]

export default async function ClinicLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole(['vet', 'admin'])
  if (!profile) redirect('/login')

  const isAdmin = profile.role === 'admin'
  const initial = profile.first_name?.charAt(0)?.toUpperCase() ?? 'D'

  return (
    <div className="flex min-h-dvh flex-col font-sans">

      {/* Clinic Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border-main bg-surface/80 backdrop-blur-lg px-5 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover shadow-md shadow-primary/25">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-[16px] font-extrabold text-text-primary tracking-tight">Odi Klinik</span>
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">
              {isAdmin ? 'Admin Paneli' : 'Personel Paneli'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/clinic/notifications"
            className="relative w-9 h-9 rounded-full flex items-center justify-center border border-border-main bg-surface hover:bg-bg-main transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </Link>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <span className="hidden sm:flex text-[11px] font-bold bg-primary-soft text-primary px-2.5 py-1 rounded-full tracking-wide">
                ADMİN
              </span>
            )}
            <div className="w-9 h-9 rounded-full bg-primary-soft border-2 border-white shadow-sm flex items-center justify-center">
              <span className="text-primary font-extrabold text-[14px]">{initial}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 w-full max-w-[1440px] mx-auto">

        {/* Sidebar */}
        <aside className="hidden md:flex w-[220px] shrink-0 flex-col gap-1 p-6 border-r border-border-main sticky top-16 h-[calc(100vh-4rem)] self-start">
          {NAV_ITEMS.map(({ href, label, icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-4 py-3 rounded-[14px] text-[14px] font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-main transition-all group">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:text-primary transition-colors">
                <path d={icon}/>
              </svg>
              {label}
            </Link>
          ))}

          {isAdmin && (
            <>
              <div className="my-3 border-t border-border-main"/>
              <Link href="/clinic/admin" className="flex items-center gap-3 px-4 py-3 rounded-[14px] text-[14px] font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-main transition-all group">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:text-primary transition-colors">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                Klinik Yönetimi
              </Link>
            </>
          )}

          <div className="mt-auto">
            <Link href="/clinic/appointments" className="btn-primary w-full text-[13px] py-2.5 gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              Randevu Ekle
            </Link>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-4 sm:p-6 lg:p-10 pb-28 md:pb-10 min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2">
        <div className="flex items-center justify-around bg-surface/80 backdrop-blur-xl border border-white/60 rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.10)] px-2 py-2">
          {NAV_ITEMS.map(item => (
            <Link key={item.href} href={item.href}
              className="flex flex-col items-center gap-1 px-3 py-2.5 rounded-[18px] text-text-secondary hover:text-primary transition-all min-w-[56px]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon}/>
              </svg>
              <span className="text-[10px] font-bold">{item.label.split(' ')[0]}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
