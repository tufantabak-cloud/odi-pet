'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const primaryItems = [
  {
    href: '/owner/dashboard',
    label: 'Anasayfa',
    icon: <i className="ti ti-layout-grid text-[18px]" />,
  },
  {
    href: '/owner/ai-vet',
    label: 'AI VET',
    icon: <i className="ti ti-robot text-[18px]" />,
  },
  {
    href: '/owner/services',
    label: 'Hizmetler',
    icon: <i className="ti ti-stethoscope text-[18px]" />,
  },
  {
    href: '/owner/social',
    label: 'Sosyal',
    icon: <i className="ti ti-users text-[18px]" />,
  },
  {
    href: '/owner/learn',
    label: 'İçerikler',
    icon: <i className="ti ti-book text-[18px]" />,
  },
  {
    href: '/owner/messages',
    label: 'Mesajlar',
    icon: <i className="ti ti-message-circle text-[18px]" />,
  },
  {
    href: '/owner/budget',
    label: 'Bütçe',
    icon: <i className="ti ti-wallet text-[18px]" />,
  },
  {
    href: '/owner/events',
    label: 'Etkinlikler',
    icon: <i className="ti ti-calendar text-[18px]" />,
  },
  {
    href: '/owner/marketplace',
    label: 'Mağaza',
    icon: <i className="ti ti-shopping-bag text-[18px]" />,
  },
]

const shortcutItems = [
  {
    href: '/owner/vets',
    label: 'Veteriner Bul',
    icon: <i className="ti ti-map-pin text-[18px]" />,
  },
  {
    href: '/owner/notifications',
    label: 'Bildirimler',
    icon: <i className="ti ti-bell text-[18px]" />,
  },
  {
    href: '/owner/profile',
    label: 'Profilim',
    icon: <i className="ti ti-user text-[18px]" />,
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
          ? 'bg-primary-soft text-[#5D3FD3]'
          : 'text-[var(--color-text-muted)] hover:text-text-primary hover:bg-bg-main'
        }`}
    >
      <span className={`shrink-0 transition-colors ${isActive ? 'text-[#5D3FD3]' : 'group-hover:text-[#5D3FD3]'}`}>
        {icon}
      </span>
      {label}
      {isActive && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#5D3FD3]" />
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
