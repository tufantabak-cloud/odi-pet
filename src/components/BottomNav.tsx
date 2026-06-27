'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createPortal } from 'react-dom'

const actionMenuItems = [
  { label: 'Plan Yap',     href: '/owner/plan-yap' },
  { label: 'Sağlık Kaydı/Aşı',   href: '/owner/pets' },
  { label: 'Akıllı Tarama',    href: '/owner/scanner' },
  { label: 'Durum Kaydet',  href: '/owner/pets' },
]

const tabs = [
  {
    href: '/owner/dashboard',
    label: 'Anasayfa',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: '/owner/services',
    label: 'Hizmetler',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
      </svg>
    ),
  },
  {
    isAction: true,
    href: '#',
    label: '',
    icon: (active: boolean, isOpen?: boolean) => (
      <div className={`w-[44px] h-[56px] bg-[#0c1424] rounded-full flex items-center justify-center text-white shadow-[var(--shadow-floating)] active:scale-95 transition-all duration-200 -translate-y-2 ${isOpen ? 'rotate-[135deg]' : ''}`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
    ),
  },
  {
    href: '/owner/social',
    label: 'Sosyal',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href: '/owner/profile',
    label: 'Profil',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  return (
    <>
      {mounted && isMenuOpen && createPortal(
        <div className="fixed inset-0 z-[9990] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="relative z-[9991] w-full max-w-lg mx-auto px-[var(--space-4)] pb-[100px] flex flex-col items-end gap-2 pointer-events-none">
            {actionMenuItems.map((item, index) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className="pointer-events-auto bg-[var(--color-surface)] text-[var(--color-text-primary)] px-[var(--space-5)] py-3 rounded-[var(--radius-md)] shadow-[var(--shadow-md)] font-600 text-[14px] flex items-center justify-center transition-all duration-200 animate-in slide-in-from-bottom-4 fade-in hover:bg-[var(--color-surface-secondary)] active:scale-[0.98]"
                style={{ animationDelay: `${(actionMenuItems.length - 1 - index) * 40}ms`, animationFillMode: 'both' }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>,
        document.body
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[9999] bg-[var(--color-surface)] border-t border-[var(--color-border)] pt-2 pb-5 px-2 shadow-[0_-2px_12px_rgba(16,24,40,0.06)]">
        <div className="grid grid-cols-5 w-full max-w-lg mx-auto">
          {tabs.map((tab: any) => {
            let isActive = false
            if (tab.href === '/owner/dashboard') {
              isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
            } else {
              isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
            }

            if (tab.isAction) {
              return (
                <button
                  key="action-btn"
                  id="nav-action-btn"
                  aria-label="Yeni kayıt ekle"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex flex-col items-center justify-center gap-1.5 py-1 px-1 transition-all duration-200 select-none cursor-pointer focus:outline-none z-[10000]"
                >
                  <div className="flex items-center justify-center w-6 h-6">
                    {tab.icon(isActive, isMenuOpen)}
                  </div>
                </button>
              )
            }

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-1 py-1 px-1 transition-all duration-200 select-none cursor-pointer ${
                  isActive
                    ? 'text-[var(--color-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                }`}
              >
                <div className="flex items-center justify-center w-6 h-6">
                  {tab.icon(isActive)}
                </div>
                {tab.label && (
                  <span className={`text-[10px] font-600 tracking-tight transition-colors duration-200 ${isActive ? 'font-700' : ''}`}>
                    {tab.label}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}