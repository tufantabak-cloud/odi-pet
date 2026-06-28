import Link from 'next/link'

interface ShortcutItem {
  icon: string
  label: string
  href: string
  badge: number | null
  badgeColor?: 'red' | 'violet' | 'pink' | 'gray'
  comingSoon: boolean
  color: 'violet' | 'red' | 'pink' | 'gray' | 'blue' | 'amber' | 'emerald'
}

export default function SocialShortcuts({ lostReportsCount = 0 }: { lostReportsCount: number }) {
  const shortcuts: ShortcutItem[] = [
    {
      icon: '🏠',
      label: 'Sahiplendir',
      href: '/owner/social?tab=sahiplendir',
      badge: null,
      comingSoon: false,
      color: 'violet'
    },
    {
      icon: '🚨',
      label: 'Kayıp İlanları',
      href: '/owner/social?tab=lost',
      badge: lostReportsCount > 0 ? lostReportsCount : null,
      badgeColor: 'red',
      comingSoon: false,
      color: 'red'
    },
    {
      icon: '❤️',
      label: 'Eşleştirme',
      href: '/owner/social?tab=eslestirme',
      badge: null,
      comingSoon: false,
      color: 'pink'
    },
    {
      icon: '🐾',
      label: 'Playdate',
      href: '#',
      badge: null,
      comingSoon: true,
      color: 'gray'
    },
    {
      icon: '💬',
      label: 'Forumlar',
      href: '#',
      badge: null,
      comingSoon: true,
      color: 'gray'
    },
    {
      icon: '🏆',
      label: 'Etkinlikler',
      href: '#',
      badge: null,
      comingSoon: true,
      color: 'gray'
    }
  ]

  const colorStyles: Record<string, string> = {
    violet: 'bg-white text-brand-purple border-brand-purple/20 hover:border-brand-purple/40 hover:bg-brand-purple/5',
    red: 'bg-white text-danger border-danger/20 hover:border-danger/40 hover:bg-danger/5',
    pink: 'bg-white text-brand-orange border-brand-gold/30 hover:border-brand-gold/40 hover:bg-brand-gold/5',
    gray: 'bg-white text-text-muted border-border hover:bg-surface-1',
    blue: 'bg-blue-50 text-blue-600 border-blue-100 hover:border-blue-300 hover:bg-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100 hover:border-amber-300 hover:bg-amber-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-100',
  }

  const badgeColorStyles: Record<string, string> = {
    red: 'bg-danger text-white',
    violet: 'bg-violet-600 text-white',
    pink: 'bg-pink-600 text-white',
    gray: 'bg-gray-600 text-white'
  }

  return (
    <div className="px-[var(--space-4)]">
      <div className="grid grid-cols-3 gap-3">
        {shortcuts.map((s, idx) => {
          const content = (
            <div className={`relative flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${colorStyles[s.color]} ${!s.comingSoon ? 'active:scale-95 shadow-sm' : 'opacity-80 grayscale-[0.2]'}`}>
              {s.badge !== null && (
                <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center text-[10px] font-black rounded-full border-2 border-surface shadow-sm ${s.badgeColor ? badgeColorStyles[s.badgeColor] : 'bg-primary text-white'}`}>
                  {s.badge > 9 ? '9+' : s.badge}
                </span>
              )}
              <span className="text-[24px] leading-none drop-shadow-sm">{s.icon}</span>
              <span className={`text-[11px] font-extrabold tracking-tight text-center leading-tight ${s.comingSoon ? 'text-gray-400' : 'text-gray-800'}`}>
                {s.label}
              </span>
              {s.comingSoon && (
                <span className="absolute bottom-1 bg-gray-200 text-gray-500 text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                  Yakında
                </span>
              )}
            </div>
          )

          if (s.comingSoon) {
            return (
              <div key={idx} className="cursor-not-allowed">
                {content}
              </div>
            )
          }

          return (
            <Link key={idx} href={s.href} className="block">
              {content}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
