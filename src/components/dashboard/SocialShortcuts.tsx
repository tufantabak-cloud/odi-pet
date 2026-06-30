import Link from 'next/link'

interface ShortcutItem {
  icon: string
  label: React.ReactNode
  href: string
  badge: number | null
  comingSoon: boolean
  color: string
  bgTint: string
  borderColorClass: string
  hoverBgClass: string
}

export default function SocialShortcuts({ lostReportsCount = 0 }: { lostReportsCount: number }) {
  const shortcuts: ShortcutItem[] = [
    {
      icon: 'ti-home-heart',
      label: <>Sahiplendirme<br/>İlanları</>,
      href: '/owner/social?tab=sahiplendir',
      badge: null,
      comingSoon: false,
      color: 'var(--color-primary)',
      bgTint: 'rgba(93, 63, 211, 0.12)',
      borderColorClass: 'border-[var(--color-primary)]/20 hover:border-[var(--color-primary)]/40',
      hoverBgClass: 'hover:bg-[var(--color-primary)]/5'
    },
    {
      icon: 'ti-alert-triangle',
      label: <>Kayıp<br/>İlanları</>,
      href: '/owner/social?tab=lost',
      badge: lostReportsCount > 0 ? lostReportsCount : null,
      comingSoon: false,
      color: 'var(--color-danger)',
      bgTint: 'rgba(255, 107, 107, 0.12)',
      borderColorClass: 'border-[var(--color-danger)]/20 hover:border-[var(--color-danger)]/40',
      hoverBgClass: 'hover:bg-[var(--color-danger)]/5'
    },
    {
      icon: 'ti-heart',
      label: <>Eşleştirme<br/>İlanları</>,
      href: '/owner/social?tab=eslestirme',
      badge: null,
      comingSoon: false,
      color: 'var(--color-success)',
      bgTint: 'rgba(78, 205, 196, 0.12)',
      borderColorClass: 'border-[var(--color-success)]/20 hover:border-[var(--color-success)]/40',
      hoverBgClass: 'hover:bg-[var(--color-success)]/5'
    },
    {
      icon: 'ti-paw',
      label: 'Playdate',
      href: '#',
      badge: null,
      comingSoon: true,
      color: '#94a3b8',
      bgTint: 'rgba(148, 163, 184, 0.12)',
      borderColorClass: 'border-[var(--color-border)]',
      hoverBgClass: 'hover:bg-[var(--color-surface)]'
    },
    {
      icon: 'ti-messages',
      label: 'Forumlar',
      href: '#',
      badge: null,
      comingSoon: true,
      color: '#94a3b8',
      bgTint: 'rgba(148, 163, 184, 0.12)',
      borderColorClass: 'border-[var(--color-border)]',
      hoverBgClass: 'hover:bg-[var(--color-surface)]'
    },
    {
      icon: 'ti-trophy',
      label: 'Etkinlikler',
      href: '#',
      badge: null,
      comingSoon: true,
      color: '#94a3b8',
      bgTint: 'rgba(148, 163, 184, 0.12)',
      borderColorClass: 'border-[var(--color-border)]',
      hoverBgClass: 'hover:bg-[var(--color-surface)]'
    }
  ]

  return (
    <div className="px-[var(--space-4)]">
      <div className="grid grid-cols-3 gap-3">
        {shortcuts.map((s, idx) => {
          const content = (
            <div className={`relative flex flex-col items-center justify-center gap-2 p-3 rounded-xl border bg-white transition-all ${s.borderColorClass} ${s.hoverBgClass} ${!s.comingSoon ? 'active:scale-95 shadow-sm' : 'opacity-80 grayscale-[0.2]'}`}>
              {s.badge !== null && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center text-[10px] font-black rounded-full border-2 border-white shadow-sm bg-[var(--color-danger)] text-white">
                  {s.badge > 9 ? '9+' : s.badge}
                </span>
              )}
              
              {/* İkon Yuvarlağı (%12 Opaklık Tint) */}
              <div
                className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
                style={{ background: s.bgTint }}
              >
                <i className={`ti ${s.icon} text-[20px]`} style={{ color: s.color }} />
              </div>

              <span className={`text-[11px] font-extrabold tracking-tight text-center leading-tight ${s.comingSoon ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'}`}>
                {s.label}
              </span>
              {s.comingSoon && (
                <span className="absolute bottom-1 bg-[var(--color-surface-2)] text-[var(--color-text-muted)] text-[7px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
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
