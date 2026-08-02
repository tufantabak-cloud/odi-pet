'use client'

import Image from 'next/image'

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center p-4 bg-bg-main bg-gradient-to-tr from-primary/5 via-transparent to-primary/5">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-soft border border-border-main/50 text-center">

        {/* Logo */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl overflow-hidden shadow-soft mb-8 bg-white p-0.5 mx-auto">
          <Image
            src="/brand/app-icons/odi-icon-512.png"
            alt="Odi Logo"
            width={96}
            height={96}
            className="w-full h-full object-cover rounded-2xl"
            priority
          />
        </div>

        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-xl font-black text-text-primary tracking-tight mb-3">
          İnternet bağlantısı yok
        </h1>

        {/* Description */}
        <p className="text-sm text-text-secondary font-medium leading-relaxed mb-8">
          Bağlantınız kesildi. Lütfen ağ ayarlarınızı kontrol edin.
        </p>

        {/* Retry Button */}
        <button
          onClick={() => window.location.reload()}
          className="btn-primary w-full py-4 text-sm font-black shadow-soft hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          Tekrar Dene
        </button>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 mt-8 pt-6 border-t border-border-main/50 text-xs font-bold text-text-secondary">
          <span className="text-sm">📶</span>
          <span>Çevrimdışı Mod</span>
        </div>
      </div>
    </div>
  )
}
