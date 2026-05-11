import { ReactNode } from 'react'
import Image from 'next/image'
import { requireRole } from '@/lib/auth/get-current-profile'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import FloatingSOS from '@/components/FloatingSOS'
import Link from 'next/link'

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole(['owner'])
  if (!profile) redirect('/login')

  const initial = profile.first_name?.charAt(0)?.toUpperCase() ?? 'U'

  return (
    <div className="flex min-h-screen flex-col font-sans">

      {/* Minimal Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border-main bg-surface/80 backdrop-blur-lg px-5 lg:px-10">
        <Link href="/owner/dashboard" className="flex items-center gap-2.5 hover:scale-[1.02] transition-transform">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden shadow-sm shadow-primary/20 border border-border-main bg-white p-0.5">
            <Image 
              src="/logo.jpg" 
              alt="Odi Logo" 
              width={40} 
              height={40}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <span className="text-[18px] font-black text-text-primary tracking-tighter hidden sm:block">Odi.Pet</span>
        </Link>

        <div className="flex items-center gap-3">
          {/* SOS Button */}
          <FloatingSOS />
          
          {/* Notifications */}
          <Link href="/owner/notifications" className="relative w-9 h-9 rounded-full flex items-center justify-center border border-border-main bg-surface hover:bg-bg-main transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </Link>
          {/* Avatar */}
          <Link href="/owner/profile" className="w-9 h-9 rounded-full bg-primary-soft border-2 border-white shadow-sm flex items-center justify-center hover:ring-2 hover:ring-primary/20 transition-all">
            <span className="text-primary font-extrabold text-[14px]">{initial}</span>
          </Link>
        </div>
      </header>

      {/* Desktop Sidebar + Mobile Scroll Content */}
      <div className="flex flex-1 w-full max-w-[1440px] mx-auto">

        {/* Desktop Sidebar Nav */}
        <aside className="hidden md:flex w-[220px] shrink-0 flex-col gap-1 p-6 border-r border-border-main sticky top-16 h-[calc(100vh-4rem)] self-start overflow-y-auto">
          <Link href="/owner/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-[14px] text-[14px] font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-main transition-all group mb-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:text-primary transition-colors">
              <path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/>
            </svg>
            Ana Sayfa
          </Link>

          <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest px-4 mb-2 mt-2">KISA YOLLAR</p>
          <Link href="/owner/vets"
            className="flex items-center gap-3 px-4 py-2.5 rounded-[14px] text-[14px] font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-main transition-all group">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:text-primary transition-colors">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
            Veteriner Bul
          </Link>
          <Link href="/owner/profile"
            className="flex items-center gap-3 px-4 py-2.5 rounded-[14px] text-[14px] font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-main transition-all group">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:text-primary transition-colors">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            Profilim
          </Link>


          <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest px-4 mb-2 mt-6">INTELLIGENCE</p>
          <Link href="/owner/ai-vet"
            className="flex items-center gap-3 px-4 py-2.5 rounded-[14px] text-[14px] font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-main transition-all group">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:text-primary transition-colors">
              <path d="M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2zM12 8v4m0 4h.01"/>
            </svg>
            AI Vet
          </Link>

        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-10 pb-32 md:pb-10 min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile Glass Bottom Nav */}
      <BottomNav />
    </div>
  )
}
