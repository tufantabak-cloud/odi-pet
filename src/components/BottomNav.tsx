'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createPortal } from 'react-dom'

const actionMenuItems = [
  { label: 'Rapor Paylaş', href: '/owner/pets' },
  { label: 'Yeni Görev Planla', href: '/owner/pets' },
  { label: 'Sağlık Kaydı / Aşı', href: '/owner/pets' },
  { label: 'Kilo Güncelle', href: '/owner/pets' },
  { label: 'Yeni Can Dostu Ekle', href: '/owner/pets/add' },
]

const tabs = [
  {
    href: '/owner/dashboard',
    label: 'Anasayfa',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="transition-colors duration-300">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    ),
  },
  {
    href: '/owner/pets',
    label: 'Canlarım',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="transition-colors duration-300">
        {/* Paw pad center */}
        <path d="M12 10c-2.2 0-4 1.8-4 4 0 2.5 2.5 4.5 4 5.5 1.5-1 4-3 4-5.5 0-2.2-1.8-4-4-4z" />
        {/* Toes */}
        <circle cx="6.5" cy="8.5" r="2" />
        <circle cx="10" cy="5.5" r="2" />
        <circle cx="14" cy="5.5" r="2" />
        <circle cx="17.5" cy="8.5" r="2" />
      </svg>
    ),
  },
  {
    isAction: true,
    href: '#',
    label: '',
    icon: (active: boolean, isOpen?: boolean) => (
      <div className={`w-[52px] h-[52px] bg-black rounded-full flex items-center justify-center text-white shadow-[0_4px_16px_rgba(0,0,0,0.2)] active:scale-95 transition-all duration-300 -translate-y-3 ${isOpen ? 'rotate-[135deg]' : 'hover:scale-105'}`}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
    ),
  },
  {
    href: '/owner/services',
    label: 'Hizmetler',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="transition-colors duration-300">
        {/* Paw print inside the hands */}
        <path d="M12 6c-0.8 0-1.5.6-1.5 1.5 0 0.9.9 1.6 1.5 2.1.6-.5 1.5-1.2 1.5-2.1 0-.9-.7-1.5-1.5-1.5z" />
        <circle cx="9.8" cy="5.2" r="0.7" />
        <circle cx="11.1" cy="4.0" r="0.7" />
        <circle cx="12.9" cy="4.0" r="0.7" />
        <circle cx="14.2" cy="5.2" r="0.7" />
        {/* Hands framing the paw */}
        <path d="M12 11c-.4 0-.8.1-1.1.4l-3.2 2.5c-.4.3-.5.9-.3 1.3.2.5.8.7 1.2.5l.8-.4v2.0c0 .9.7 1.6 1.6 1.6h5.4c.9 0 1.6-.7 1.6-1.6v-2.0l.8.4c.4.2 1 .1 1.2-.4.2-.4.1-1-.3-1.3L13.1 11.4c-.3-.3-.7-.4-1.1-.4z" />
      </svg>
    ),
  },
  {
    href: '/owner/social',
    label: 'Sosyal',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="transition-colors duration-300">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.7 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <>
      {/* Action Menu Overlay */}
      {mounted && isMenuOpen && createPortal(
        <div className="fixed inset-0 z-[9990] flex flex-col justify-end">
          {/* Dark Overlay Background */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Menu Items */}
          <div className="relative z-[9991] w-full max-w-lg mx-auto px-6 pb-[100px] flex flex-col items-end gap-3 pointer-events-none">
            {actionMenuItems.map((item, index) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className="pointer-events-auto bg-white text-text-primary px-5 py-3.5 rounded-[24px] shadow-xl font-bold text-[14px] flex items-center justify-center transition-all duration-300 animate-in slide-in-from-bottom-8 fade-in hover:scale-105 active:scale-95"
                style={{ animationDelay: `${(actionMenuItems.length - 1 - index) * 50}ms`, animationFillMode: 'both' }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[9999] bg-surface border-t border-border-main/80 pt-2 pb-5 px-2 shadow-[0_-4px_24px_rgba(0,0,0,0.03)]">
        <div className="grid grid-cols-5 w-full max-w-lg mx-auto">
          {tabs.map((tab: any) => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
            
            if (tab.isAction) {
              return (
                <button
                  key="action-btn"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex flex-col items-center justify-center gap-1.5 py-1 px-1 transition-all duration-300 select-none cursor-pointer focus:outline-none z-[10000]"
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
                className={`flex flex-col items-center justify-center gap-1.5 py-1 px-1 transition-all duration-300 select-none cursor-pointer
                  ${isActive ? 'text-[#E05397] scale-105' : 'text-[#8E8E93] hover:text-[#5c5c60]'}`}
              >
                <div className="flex items-center justify-center w-6 h-6">
                  {tab.icon(isActive)}
                </div>
                {tab.label ? (
                  <span className={`text-[11px] font-semibold tracking-tight transition-colors duration-300`}>
                    {tab.label}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
