import Link from 'next/link'
import { HeartHandshake, Megaphone, Heart, Bone, MessageSquare, Calendar, LucideIcon } from 'lucide-react'

interface ShortcutItem {
  id: string
  icon: LucideIcon
  label: string
  href: string
  badge: number | null
  comingSoon: boolean
  iconColorClass: string
  bgTintClass: string
  borderColorClass: string
}

export default function SocialShortcuts({ lostReportsCount = 0 }: { lostReportsCount: number }) {
  const shortcuts: ShortcutItem[] = [
    {
      id: 'sahiplendir',
      icon: HeartHandshake,
      label: 'Sahiplendirme',
      href: '/owner/social?tab=sahiplendir',
      badge: null,
      comingSoon: false,
      iconColorClass: 'text-purple-600',
      bgTintClass: 'bg-purple-50',
      borderColorClass: 'border-purple-100/80 hover:border-purple-200'
    },
    {
      id: 'lost',
      icon: Megaphone,
      label: 'Kayıp İlanları',
      href: '/owner/social?tab=lost',
      badge: lostReportsCount > 0 ? lostReportsCount : null,
      comingSoon: false,
      iconColorClass: 'text-rose-600',
      bgTintClass: 'bg-rose-50',
      borderColorClass: 'border-rose-100/80 hover:border-rose-200'
    },
    {
      id: 'eslestirme',
      icon: Heart,
      label: 'Eşleştirme',
      href: '/owner/social?tab=eslestirme',
      badge: null,
      comingSoon: false,
      iconColorClass: 'text-teal-600',
      bgTintClass: 'bg-teal-50',
      borderColorClass: 'border-teal-100/80 hover:border-teal-200'
    },
    {
      id: 'playdate',
      icon: Bone,
      label: 'Playdate',
      href: '#',
      badge: null,
      comingSoon: true,
      iconColorClass: 'text-amber-600',
      bgTintClass: 'bg-amber-50/80',
      borderColorClass: 'border-slate-100'
    },
    {
      id: 'forumlar',
      icon: MessageSquare,
      label: 'Forumlar',
      href: '#',
      badge: null,
      comingSoon: true,
      iconColorClass: 'text-sky-600',
      bgTintClass: 'bg-sky-50/80',
      borderColorClass: 'border-slate-100'
    },
    {
      id: 'etkinlikler',
      icon: Calendar,
      label: 'Etkinlikler',
      href: '#',
      badge: null,
      comingSoon: true,
      iconColorClass: 'text-indigo-600',
      bgTintClass: 'bg-indigo-50/80',
      borderColorClass: 'border-slate-100'
    }
  ]

  return (
    <div className="px-[var(--space-4)]">
      <div className="grid grid-cols-3 gap-3">
        {shortcuts.map((s) => {
          const Icon = s.icon

          const cardContent = (
            <div
              className={`relative flex flex-col items-center justify-between p-3.5 min-h-[116px] rounded-sheet bg-white border ${s.borderColorClass} shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] transition-all duration-200 ease-out group ${
                !s.comingSoon
                  ? 'hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.08)]'
                  : 'opacity-85 hover:opacity-100'
              }`}
            >
              {/* Notification Badge */}
              {s.badge !== null && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-bold rounded-full border-2 border-white bg-rose-500 text-white shadow-sm animate-pulse">
                  {s.badge > 9 ? '9+' : s.badge}
                </span>
              )}

              {/* OPOS Lucide Icon Container */}
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${s.bgTintClass} ${s.iconColorClass} transition-transform duration-200 group-hover:scale-110`}
              >
                <Icon className="w-5 h-5 stroke-[2]" />
              </div>

              {/* Label & Status */}
              <div className="flex flex-col items-center gap-1 w-full mt-1.5">
                <span className={`text-xs font-semibold tracking-tight text-center leading-tight ${s.comingSoon ? 'text-slate-500' : 'text-slate-800'}`}>
                  {s.label}
                </span>
                {s.comingSoon && (
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Yakında
                  </span>
                )}
              </div>
            </div>
          )

          if (s.comingSoon) {
            return (
              <div key={s.id} className="cursor-not-allowed">
                {cardContent}
              </div>
            )
          }

          return (
            <Link key={s.id} href={s.href} className="block group">
              {cardContent}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

