'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  {
    href: '/owner/dashboard',
    label: 'Ana Sayfa',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1.5"/>
        <rect width="7" height="5" x="14" y="3" rx="1.5"/>
        <rect width="7" height="9" x="14" y="12" rx="1.5"/>
        <rect width="7" height="5" x="3" y="16" rx="1.5"/>
      </svg>
    ),
  },
]

const shortcutItems = [
  {
    href: '/owner/vets',
    label: 'Veteriner Bul',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
  },
  {
    href: '/owner/notifications',
    label: 'Bildirimler',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
  },
  {
    href: '/owner/profile',
    label: 'Profilim',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
]

const intelligenceItems = [
  {
    href: '/owner/ai-vet',
    label: 'AI Vet',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2z"/>
        <path d="M12 8v4m0 4h.01"/>
      </svg>
    ),
  },
]

function NavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-[14px] text-[14px] font-semibold transition-all group
        ${isActive
          ? 'bg-primary-soft text-primary'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-main'
        }`}
    >
      <span className={`shrink-0 transition-colors ${isActive ? 'text-primary' : 'group-hover:text-primary'}`}>
        {icon}
      </span>
      {label}
      {isActive && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
      )}
    </Link>
  )
}

export default function SideNav() {
  const pathname = usePathname()
  const isDashboardActive = pathname === '/owner/dashboard' || pathname.startsWith('/owner/dashboard/')

  return (
    <aside className="hidden md:flex w-[220px] shrink-0 flex-col gap-1 p-6 border-r border-border-main sticky top-16 h-[calc(100vh-4rem)] self-start overflow-y-auto">
      {/* Ana Sayfa */}
      <Link
        href="/owner/dashboard"
        className={`flex items-center gap-3 px-4 py-3 rounded-[14px] text-[14px] font-semibold transition-all group mb-4
          ${isDashboardActive
            ? 'bg-primary-soft text-primary'
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-main'
          }`}
      >
        <span className={`shrink-0 transition-colors ${isDashboardActive ? 'text-primary' : 'group-hover:text-primary'}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="7" height="9" x="3" y="3" rx="1.5"/>
            <rect width="7" height="5" x="14" y="3" rx="1.5"/>
            <rect width="7" height="9" x="14" y="12" rx="1.5"/>
            <rect width="7" height="5" x="3" y="16" rx="1.5"/>
          </svg>
        </span>
        Ana Sayfa
        {isDashboardActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
      </Link>

      <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest px-4 mb-2 mt-2">
        KISA YOLLAR
      </p>
      {shortcutItems.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}

      <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest px-4 mb-2 mt-6">
        INTELLIGENCE
      </p>
      {intelligenceItems.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
    </aside>
  )
}
