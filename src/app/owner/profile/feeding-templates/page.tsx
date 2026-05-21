import Link from 'next/link'

export default function FeedingTemplatesPage() {
  return (
    <div className="w-full mx-auto px-4 py-6 pb-20 flex flex-col gap-5 font-sans">
      <Link href="/owner/profile" className="flex items-center gap-2 text-[14px] font-bold text-text-secondary hover:text-primary -mb-1 group">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform"><polyline points="15 18 9 12 15 6"/></svg>
        Profil Ayarları
      </Link>

      <div className="card-base overflow-hidden relative shadow-lg shadow-primary/5">
        <div className="h-2 bg-gradient-to-r from-green-400 to-green-600" />
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div>
              <h1 className="text-[20px] font-extrabold text-text-primary">Beslenme & Porsiyon Şablonları</h1>
              <p className="text-[13px] text-text-secondary font-medium">Günlük öğün ve beslenme rutinlerinizi düzenleyin.</p>
            </div>
          </div>
          
          <div className="p-8 mt-6 text-center bg-bg-main border border-border-main rounded-2xl border-dashed">
            <div className="text-[40px] mb-3 opacity-50">🥣</div>
            <h3 className="text-[16px] font-bold text-text-primary mb-2">Yapım Aşamasında</h3>
            <p className="text-[13px] text-text-secondary">Bu modül henüz tasarlanıyor. Öğün miktarlarını (gram vb.) ve mama türlerini buradan standart şablonlara bağlayabileceksiniz.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
