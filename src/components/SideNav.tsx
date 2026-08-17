'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { getIcon } from '@/lib/navigation/iconMap'
import { resolveActionHref } from '@/components/BottomNav'
import { getNavModules, type ModuleEntry } from '@/lib/modules/registry'
import {
  LayoutGrid,
  Sparkles,
  Stethoscope,
  Users,
  BookOpen,
  MessageCircle,
  Wallet,
  Calendar,
  ShoppingBag,
  MapPin,
  Bell,
  User,
  HelpCircle,
  Plus
} from 'lucide-react'

export type NavItem = {
  id: string
  label: string
  icon: string
  href: string
  slot: string
  order_index: number
  is_active: boolean
  match_type: 'exact' | 'startsWith'
}

type SideNavProps = {
  actionMenuItems?: NavItem[]
  bottomNavItems?: NavItem[]
  menuDrawerItems?: NavItem[]
}

const fallbackActionMenuItems = [
  { label: 'Rutin Planla',     href: '/owner/plan-yap', icon: 'calendar-plus' },
  { label: 'Kayıt Ekle',       href: '/owner/plan-yap?mode=log', icon: 'clipboard-plus' },
  { label: 'Sağlık Kaydı/Aşı',   href: '/owner/pets', icon: 'first-aid-kit' },
  { label: 'Akıllı Tarama',    href: '/owner/scanner', icon: 'scan' },
  { label: 'Durum Kaydet',  href: '/owner/pets', icon: 'notebook' },
]

// Kenar menüsü ikonları — anahtarlar modül kaydındaki `key` ile eşleşir.
const MODULE_ICONS: Record<string, React.ReactNode> = {
  dashboard:     <LayoutGrid className="w-[18px] h-[18px]" />,
  'ai-vet':      <Sparkles className="w-[18px] h-[18px] text-purple-600" />,
  services:      <Stethoscope className="w-[18px] h-[18px]" />,
  social:        <Users className="w-[18px] h-[18px]" />,
  learn:         <BookOpen className="w-[18px] h-[18px]" />,
  messages:      <MessageCircle className="w-[18px] h-[18px]" />,
  budget:        <Wallet className="w-[18px] h-[18px]" />,
  events:        <Calendar className="w-[18px] h-[18px]" />,
  takvim:        <Calendar className="w-[18px] h-[18px]" />,
  marketplace:   <ShoppingBag className="w-[18px] h-[18px]" />,
  vets:          <MapPin className="w-[18px] h-[18px]" />,
  notifications: <Bell className="w-[18px] h-[18px]" />,
  profile:       <User className="w-[18px] h-[18px]" />,
  help:          <HelpCircle className="w-[18px] h-[18px]" />,
}

// Yedek menüler modül kaydından üretilir (src/lib/modules/registry.ts).
// Kapalı modüller getNavModules tarafından zaten elenir — burada elle
// liste tutulmaz, böylece bir modülü açmak/kapatmak tek dosyada kalır.
const toNavEntry = (m: ModuleEntry) => ({
  href: m.href,
  label: m.label,
  icon: MODULE_ICONS[m.key] ?? <LayoutGrid className="w-[18px] h-[18px]" />,
})

const primaryItems = getNavModules('side_primary').map(toNavEntry)
const shortcutItems = getNavModules('side_shortcut').map(toNavEntry)

function NavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-input text-sm font-semibold transition-all group
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

export default function SideNav({ actionMenuItems, bottomNavItems, menuDrawerItems }: SideNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const activeActionMenuItems = actionMenuItems && actionMenuItems.length > 0
    ? actionMenuItems
    : fallbackActionMenuItems

  const activePrimaryItems = bottomNavItems && bottomNavItems.length > 0
    ? bottomNavItems
        .filter(item => item.href !== '#' && item.label !== 'Menü')
        .map(item => ({
          href: item.href,
          label: item.label,
          icon: getIcon(item.icon, 18)
        }))
    : primaryItems

  const activeShortcutItems = menuDrawerItems && menuDrawerItems.length > 0
    ? menuDrawerItems.map(item => ({
        href: item.href,
        label: item.label,
        icon: getIcon(item.icon, 18)
      }))
    : shortcutItems

  return (
    <aside className="hidden md:flex w-[220px] shrink-0 flex-col gap-1 p-6 border-r border-border-main sticky top-16 h-[calc(100vh-4rem)] self-start overflow-y-auto">
      {/* Quick Action Plus Button */}
      <div className="relative mb-4">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="w-full py-3 px-4 rounded-input bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary-hover hover:shadow-lg active:scale-[0.98] transition-all duration-200"
        >
          <Plus className={`w-4 h-4 transition-transform duration-200 ${isMenuOpen ? 'rotate-45' : ''}`} />
          <span>Hızlı Ekle</span>
        </button>
        
        {isMenuOpen && (
          <>
            <div className="fixed inset-0 z-[9990]" onClick={() => setIsMenuOpen(false)} />
            <div className="absolute left-0 right-0 mt-2 bg-surface border border-border-main rounded-input shadow-xl p-2 z-[9991] flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-150">
              {activeActionMenuItems.map((item) => {
                const href = resolveActionHref(item)
                return (
                  <Link
                    key={item.label}
                    href={href}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-text-primary hover:bg-bg-main hover:text-primary transition-colors"
                  >
                    {item.icon && <span className="text-text-secondary">{getIcon(item.icon, 16)}</span>}
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>

      <p className="text-2xs font-semibold text-text-tertiary uppercase tracking-wider px-4 mb-2">
        ANA MENÜ
      </p>
      {activePrimaryItems.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}

      <p className="text-2xs font-semibold text-text-tertiary uppercase tracking-wider px-4 mb-2 mt-6">
        KISA YOLLAR
      </p>
      {activeShortcutItems.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
    </aside>
  )
}
