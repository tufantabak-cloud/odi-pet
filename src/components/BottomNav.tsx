'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  {
    href: '/owner/dashboard',
    label: 'Ana Sayfa',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1.5"/>
        <rect width="7" height="5" x="14" y="3" rx="1.5"/>
        <rect width="7" height="9" x="14" y="12" rx="1.5"/>
        <rect width="7" height="5" x="3" y="16" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: '/owner/vets',
    label: 'Veteriner',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
  },
  {
    href: '/owner/notifications',
    label: 'Bildirim',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
  },
  {
    href: '/owner/profile',
    label: 'Profil',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2">
      <div className="flex items-center justify-around bg-surface/80 backdrop-blur-xl border border-white/60 rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.10)] px-2 py-2 relative">

        {/* First 2 tabs */}
        {tabs.slice(0, 2).map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link key={tab.href} href={tab.href}
              className={`flex flex-col items-center gap-1 px-4 py-2.5 rounded-[18px] transition-all duration-300 min-w-[64px]
                ${isActive ? 'bg-primary-soft text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
              {tab.icon(isActive)}
              <span className={`text-[10px] font-bold tracking-wide ${isActive ? 'text-primary' : 'text-text-secondary'}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}

        {/* Center AI Vet CTA */}
        <Link href="/owner/ai-vet"
          className="flex flex-col items-center gap-1 -mt-6 mx-2">
          <div className={`w-[60px] h-[60px] rounded-full flex items-center justify-center shadow-lg shadow-primary/30 transition-all duration-300
            ${pathname.startsWith('/owner/ai-vet') ? 'bg-primary-hover scale-110' : 'bg-primary hover:bg-primary-hover hover:scale-105'}
            `}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2z"/>
              <path d="M12 8v4m0 4h.01"/>
            </svg>
          </div>
          <span className="text-[10px] font-bold text-primary tracking-wide">AI Vet</span>
        </Link>

        {/* Last 2 tabs */}
        {tabs.slice(2).map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link key={tab.href} href={tab.href}
              className={`flex flex-col items-center gap-1 px-4 py-2.5 rounded-[18px] transition-all duration-300 min-w-[64px]
                ${isActive ? 'bg-primary-soft text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
              {tab.icon(isActive)}
              <span className={`text-[10px] font-bold tracking-wide ${isActive ? 'text-primary' : 'text-text-secondary'}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
