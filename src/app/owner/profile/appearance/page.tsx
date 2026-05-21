import Link from 'next/link'

export default function AppearancePage() {
  return (
    <div className="w-full mx-auto px-4 py-6 pb-20 flex flex-col gap-5 font-sans">
      <Link href="/owner/profile" className="flex items-center gap-2 text-[14px] font-bold text-text-secondary hover:text-primary -mb-1 group">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform"><polyline points="15 18 9 12 15 6"/></svg>
        Profil Ayarları
      </Link>

      <div className="card-base overflow-hidden relative shadow-lg shadow-primary/5">
        <div className="h-2 bg-gradient-to-r from-purple-400 to-purple-600" />
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2.7l3 9h9l-7.3 5.4 2.8 8.9L12 20.6l-7.5 5.4 2.8-8.9L0 11.7h9z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-[20px] font-extrabold text-text-primary">Tema & Görüntüleme Seçenekleri</h1>
              <p className="text-[13px] text-text-secondary font-medium">Uygulamanın görsel temasını kişiselleştirin.</p>
            </div>
          </div>
          
          <div className="p-8 mt-6 text-center bg-bg-main border border-border-main rounded-2xl border-dashed">
            <div className="text-[40px] mb-3 opacity-50">🎨</div>
            <h3 className="text-[16px] font-bold text-text-primary mb-2">Çok Yakında</h3>
            <p className="text-[13px] text-text-secondary">Gece modu (Dark Mode), marka rengi değişiklikleri ve daha birçok görünüm özelleştirmesi buraya gelecek.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
