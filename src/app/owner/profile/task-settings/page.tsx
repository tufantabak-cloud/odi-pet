import Link from 'next/link'

export default function TaskSettingsPage() {
  return (
    <div className="w-full mx-auto px-4 py-6 pb-20 flex flex-col gap-5 font-sans">
      <Link href="/owner/profile" className="flex items-center gap-2 text-[14px] font-bold text-text-secondary hover:text-primary -mb-1 group">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform"><polyline points="15 18 9 12 15 6"/></svg>
        Profil Ayarları
      </Link>

      <div className="card-base overflow-hidden relative shadow-lg shadow-primary/5">
        <div className="h-2 bg-gradient-to-r from-orange-400 to-orange-600" />
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div>
              <h1 className="text-[20px] font-extrabold text-text-primary">Görev & Hatırlatıcı Ayarları</h1>
              <p className="text-[13px] text-text-secondary font-medium">Uygulama içi görev ve bildirim davranışlarını yönetin.</p>
            </div>
          </div>
          
          <div className="p-8 mt-6 text-center bg-bg-main border border-border-main rounded-2xl border-dashed">
            <div className="text-[40px] mb-3 opacity-50">🚧</div>
            <h3 className="text-[16px] font-bold text-text-primary mb-2">Yapım Aşamasında</h3>
            <p className="text-[13px] text-text-secondary">Bu modül henüz tasarlanıyor. Çok yakında varsayılan görevlerinizi ve hatırlatıcı sıklıklarını buradan yönetebileceksiniz.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
