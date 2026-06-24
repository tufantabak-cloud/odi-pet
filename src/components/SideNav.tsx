'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const primaryItems = [
  {
    href: '/owner/dashboard',
    label: 'Anasayfa',
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
  {
    href: '/owner/ai-vet',
    label: 'AI VET',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M2 12h20" />
      </svg>
    ),
  },
  {
    href: '/owner/services',
    label: 'Hizmetler',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 11c-.4 0-.8.1-1.1.4l-3.2 2.5c-.4.3-.5.9-.3 1.3.2.5.8.7 1.2.5l.8-.4v2.0c0 .9.7 1.6 1.6 1.6h5.4c.9 0 1.6-.7 1.6-1.6v-2.0l.8.4c.4.2 1 .1 1.2-.4.2-.4.1-1-.3-1.3L13.1 11.4c-.3-.3-.7-.4-1.1-.4z" />
      </svg>
    ),
  },
  {
    href: '/owner/social',
    label: 'Sosyal',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.7 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>
    ),
  },

  {
    href: '/owner/learn',
    label: 'İçerikler',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
    ),
  },
  {
    href: '/owner/messages',
    label: 'Mesajlar',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    ),
  },
  {
    href: '/owner/budget',
    label: 'Bütçe',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4H6a2 2 0 0 1-2-2z"/></svg>
    ),
  },
  {
    href: '/owner/events',
    label: 'Etkinlikler',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    ),
  },
  {
    href: '/owner/marketplace',
    label: 'Mağaza',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
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
  return (
    <aside className="hidden md:flex w-[220px] shrink-0 flex-col gap-1 p-6 border-r border-border-main sticky top-16 h-[calc(100vh-4rem)] self-start overflow-y-auto">
      <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest px-4 mb-2 mt-2">
        ANA MENÜ
      </p>
      {primaryItems.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}

      <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest px-4 mb-2 mt-6">
        KISA YOLLAR
      </p>
      {shortcutItems.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
    </aside>
  )
}
