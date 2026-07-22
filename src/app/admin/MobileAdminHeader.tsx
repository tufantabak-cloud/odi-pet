'use client'

import { useState } from 'react'
import Link from 'next/link'
import { logout } from '@/features/auth/actions'

interface MobileAdminHeaderProps {
  profile: any
  roleBadgeColor: string
  roleBadge: string
}

export default function MobileAdminHeader({ profile, roleBadgeColor, roleBadge }: MobileAdminHeaderProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="md:hidden border-b border-border-main bg-surface sticky top-0 z-40 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(true)}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-bg-main hover:bg-border-main/50 text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
            aria-label="Menüyü Aç"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[18px]">🔭</span>
            <span className="font-black text-text-primary text-[14px]">Odi Admin</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-1 ${roleBadgeColor}`}>
              {roleBadge}
            </span>
          </div>
        </div>
        <Link href="/owner/dashboard" className="text-[12px] font-semibold text-text-secondary hover:text-primary transition-colors p-2">
          ← App
        </Link>
      </div>

      {/* Drawer Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden"
          onClick={() => setIsOpen(false)}
        >
          {/* Drawer Menu Container */}
          <aside 
            className="w-64 bg-surface h-full border-r border-border-main flex flex-col animate-in slide-in-from-left duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-border-main flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[20px]">🔭</span>
                <span className="font-black text-text-primary text-[15px]">Odi Admin</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-main hover:bg-border-main/50 text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
                aria-label="Menüyü Kapat"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              <div className="mb-4">
                <p className="px-3 text-[11px] font-black text-text-secondary uppercase tracking-widest mb-2">Genel Bakış</p>
                <Link href="/admin" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold text-text-secondary hover:text-primary hover:bg-bg-main rounded-xl transition-all">
                  <span>🏠</span> Panel
                </Link>
              </div>

              <div className="mb-4">
                <p className="px-3 text-[11px] font-black text-text-secondary uppercase tracking-widest mb-2">Yönetim</p>
                <Link href="/admin/users" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold text-text-secondary hover:text-primary hover:bg-bg-main rounded-xl transition-all">
                  <span>👥</span> Kullanıcılar
                </Link>
                <Link href="/admin/pets" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold text-text-secondary hover:text-primary hover:bg-bg-main rounded-xl transition-all">
                  <span>🐾</span> Evcil Hayvanlar
                </Link>
              </div>

              <div className="mb-4">
                <p className="px-3 text-[11px] font-black text-text-secondary uppercase tracking-widest mb-2">Platform Servisleri</p>
                <Link href="/admin/content" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold text-text-secondary hover:text-primary hover:bg-bg-main rounded-xl transition-all">
                  <span>📚</span> İçerik Yönetimi
                </Link>
                <Link href="/admin/ai-vet" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold text-text-secondary hover:text-primary hover:bg-bg-main rounded-xl transition-all">
                  <span>🤖</span> AI-Vet Analiz
                </Link>
              </div>

              <div className="mb-4">
                <p className="px-3 text-[11px] font-black text-text-secondary uppercase tracking-widest mb-2">Sistem</p>
                <Link href="/admin/system-health" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold text-text-secondary hover:text-primary hover:bg-bg-main rounded-xl transition-all">
                  <span>🩺</span> Sistem Sağlığı
                </Link>
                <Link href="/admin/weekly-reports" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold text-text-secondary hover:text-primary hover:bg-bg-main rounded-xl transition-all">
                  <span>📊</span> Haftalık Raporlar
                </Link>
                <Link href="/admin/settings" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold text-text-secondary hover:text-primary hover:bg-bg-main rounded-xl transition-all">
                  <span>⚙️</span> Ayarlar
                </Link>
              </div>
            </nav>

            {/* Operator and Logout */}
            <div className="p-4 border-t border-border-main space-y-1">
              <div className="px-3 py-2.5 rounded-xl bg-bg-main text-[12px] text-text-secondary font-semibold truncate">
                🧑‍💻 {profile.first_name ?? profile.email ?? 'Yönetici'}
              </div>
              <Link href="/owner/dashboard" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold text-text-secondary hover:text-primary hover:bg-bg-main rounded-xl transition-all">
                <span>←</span> Uygulamaya Dön
              </Link>
              <form action={logout} className="w-full mt-1">
                <button type="submit" className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold text-error hover:bg-error/10 rounded-xl transition-all">
                  <span>🚪</span> Çıkış Yap
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
