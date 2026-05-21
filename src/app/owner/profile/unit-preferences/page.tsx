import Link from 'next/link'

export default function UnitPreferencesPage() {
  return (
    <div className="w-full mx-auto px-4 py-6 pb-20 flex flex-col gap-5 font-sans">
      <Link href="/owner/profile" className="flex items-center gap-2 text-[14px] font-bold text-text-secondary hover:text-primary -mb-1 group">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform"><polyline points="15 18 9 12 15 6"/></svg>
        Profil Ayarları
      </Link>

      <div className="card-base overflow-hidden relative shadow-lg shadow-primary/5">
        <div className="h-2 bg-gradient-to-r from-gray-400 to-gray-600" />
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-[20px] font-extrabold text-text-primary">Birim & Ölçü Tercihleri</h1>
              <p className="text-[13px] text-text-secondary font-medium">Uluslararası ve yerel birim seçimlerinizi ayarlayın.</p>
            </div>
          </div>
          
          <div className="p-8 mt-6 text-center bg-bg-main border border-border-main rounded-2xl border-dashed">
            <div className="text-[40px] mb-3 opacity-50">⚖️</div>
            <h3 className="text-[16px] font-bold text-text-primary mb-2">Çok Yakında</h3>
            <p className="text-[13px] text-text-secondary">Uygulama genelinde ağırlık (kg/lbs) ve hacim birimlerini (ml/oz) buradan yönetebileceksiniz.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
