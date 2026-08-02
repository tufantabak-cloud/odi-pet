'use client'

import { useState } from 'react'
import Link from 'next/link'
import { logout } from '@/features/auth/actions'
import AdminSidebarNav from './AdminSidebarNav'
import { ShieldCheck, User, LogOut, Menu, X, ArrowLeft } from 'lucide-react'

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
            <Menu className="w-5.5 h-5.5" />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="font-bold text-text-primary text-sm">Odi Admin</span>
            <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ml-1 ${roleBadgeColor}`}>
              {roleBadge}
            </span>
          </div>
        </div>
        <Link href="/owner/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-primary transition-colors p-2 active:scale-[0.98]">
          <ArrowLeft className="w-4 h-4" />
          <span>App</span>
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
                <ShieldCheck className="w-5 h-5 text-primary" />
                <span className="font-bold text-text-primary text-base">Odi Admin</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-main hover:bg-border-main/50 text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
                aria-label="Menüyü Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation links */}
            <div className="flex-1 overflow-y-auto" onClick={() => setIsOpen(false)}>
              <AdminSidebarNav />
            </div>

            {/* User Footer */}
            <div className="p-4 border-t border-border-main space-y-1">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-main text-xs text-text-secondary font-semibold truncate">
                <User className="w-4 h-4 shrink-0 text-text-secondary" />
                <span className="truncate">{profile.first_name ?? profile.email ?? 'Unknown'}</span>
              </div>
              <form action={logout} className="w-full mt-1">
                <button type="submit" className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-error hover:bg-error/10 rounded-xl transition-all">
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Çıkış Yap</span>
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
