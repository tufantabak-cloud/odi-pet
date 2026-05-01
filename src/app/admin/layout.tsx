import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Founder Console — ODI Pet',
  robots: 'noindex, nofollow', // Never index admin pages
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-main">
      {/* Admin top bar */}
      <div className="border-b border-border-main bg-surface sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[18px]">🔭</span>
            <span className="font-black text-text-primary text-[14px]">Founder OS</span>
            <span className="text-[11px] font-bold text-text-secondary bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full ml-1">
              INTERNAL
            </span>
          </div>
          <nav className="flex items-center gap-1">
            {[
              { href: '/admin/intelligence', label: '📊 Analytics' },
              { href: '/admin/outreach',    label: '📋 Pipeline' },
              { href: '/owner/dashboard',   label: '← App' },
            ].map(link => (
              <a key={link.href} href={link.href}
                className="text-[12px] font-semibold text-text-secondary hover:text-primary px-3 py-1.5 rounded-lg hover:bg-bg-main transition-all">
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
      {children}
    </div>
  )
}
