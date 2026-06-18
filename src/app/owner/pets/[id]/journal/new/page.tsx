import { getSessionUser } from '@/lib/auth/get-current-profile'
import { redirect } from 'next/navigation'
import Link from 'next/link'

import { ReactNode } from 'react'

type Category = {
  id: string
  label: string
  icon: ReactNode
  desc: string
}

const CATEGORIES: Category[] = [
  { 
    id: 'appetite', 
    label: 'İştah', 
    desc: 'İştahını nasıl buldunuz?',
    icon: (
      <svg viewBox="0 0 32 32" className="w-8 h-8 drop-shadow-sm">
        <path d="M4 16c0 6.6 5.4 12 12 12s12-5.4 12-12H4z" fill="url(#app-grad)" />
        <ellipse cx="16" cy="16" rx="12" ry="4" fill="#E5E7EB" />
        <ellipse cx="16" cy="16" rx="10" ry="2" fill="#D1D5DB" />
        <defs>
          <linearGradient id="app-grad" x1="4" y1="16" x2="28" y2="28" gradientUnits="userSpaceOnUse"><stop stopColor="#F59E0B" /><stop offset="1" stopColor="#D97706" /></linearGradient>
        </defs>
      </svg>
    ) 
  },
  { 
    id: 'mood', 
    label: 'Ruh Hali', 
    desc: 'Genel durumu nasıl?',
    icon: (
      <svg viewBox="0 0 32 32" className="w-8 h-8 drop-shadow-sm">
        <circle cx="16" cy="16" r="14" fill="url(#mood-grad)" />
        <path d="M10 14q2-3 4 0M18 14q2-3 4 0M12 22q4 3 8 0" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <defs>
          <linearGradient id="mood-grad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse"><stop stopColor="#10B981" /><stop offset="1" stopColor="#059669" /></linearGradient>
        </defs>
      </svg>
    ) 
  },
  { 
    id: 'nutrition', 
    label: 'Beslenme', 
    desc: 'Öğün detayları',
    icon: (
      <svg viewBox="0 0 32 32" className="w-8 h-8 drop-shadow-sm">
        <path d="M12 10c0-3.3 5.4-3.3 5.4 0 0 3.3 5.3 3.3 5.3 6.6S16 26 12 26 2.7 20 2.7 16.6C2.7 13.3 12 13.3 12 10z" fill="url(#nut-grad)" />
        <path d="M26 8c-2 0-3 2-3 4h6c0-2-1-4-3-4z" fill="#D1D5DB" />
        <defs>
          <linearGradient id="nut-grad" x1="2" y1="8" x2="28" y2="28" gradientUnits="userSpaceOnUse"><stop stopColor="#EF4444" /><stop offset="1" stopColor="#B91C1C" /></linearGradient>
        </defs>
      </svg>
    ) 
  },
  { 
    id: 'activity', 
    label: 'Aktivite', 
    desc: 'Egzersiz ve oyun',
    icon: (
      <svg viewBox="0 0 32 32" className="w-8 h-8 drop-shadow-sm">
        <circle cx="16" cy="16" r="12" fill="url(#act-grad)" />
        <path d="M12 8v16M20 8v16M8 12h16M8 20h16" stroke="#fff" strokeWidth="2" opacity="0.4" />
        <circle cx="16" cy="16" r="4" fill="#fff" />
        <defs>
          <linearGradient id="act-grad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse"><stop stopColor="#3B82F6" /><stop offset="1" stopColor="#1D4ED8" /></linearGradient>
        </defs>
      </svg>
    ) 
  },
  { 
    id: 'note', 
    label: 'Genel Not', 
    desc: 'Serbest metin',
    icon: (
      <svg viewBox="0 0 32 32" className="w-8 h-8 drop-shadow-sm">
        <rect x="6" y="4" width="20" height="24" rx="4" fill="url(#note-grad)" />
        <path d="M10 12h12M10 16h12M10 20h8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <defs>
          <linearGradient id="note-grad" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse"><stop stopColor="#8B5CF6" /><stop offset="1" stopColor="#6D28D9" /></linearGradient>
        </defs>
      </svg>
    ) 
  }
]

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function NewJournalEntryPage(props: PageProps) {
  const user = await getSessionUser()
  const { id } = await props.params
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href={`/owner/pets/${id}/journal`} className="w-11 h-11 bg-surface rounded-xl flex items-center justify-center shadow-sm border border-border-main text-text-secondary hover:text-text-primary transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        <h1 className="text-[24px] font-extrabold text-text-primary leading-none">Yeni Kayıt</h1>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-[14px] text-text-secondary mb-2">Hangi durumu kaydetmek istiyorsunuz?</p>
        
        {CATEGORIES.map(cat => (
          <Link key={cat.id} href={`/owner/pets/${id}/journal/new/${cat.id}`} className="card-base p-4 flex items-center gap-4 border border-border-main hover:border-primary/40 hover:shadow-md transition-all group bg-surface">
            <div className="w-14 h-14 rounded-2xl bg-bg-main flex items-center justify-center shrink-0 shadow-sm group-hover:scale-[1.05] transition-transform duration-300">
              {cat.icon}
            </div>
            <div className="flex-1">
              <h2 className="text-[16px] font-extrabold text-text-primary group-hover:text-primary transition-colors">{cat.label}</h2>
              <p className="text-[13px] text-text-secondary">{cat.desc}</p>
            </div>
            <div className="text-text-secondary group-hover:text-primary transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
