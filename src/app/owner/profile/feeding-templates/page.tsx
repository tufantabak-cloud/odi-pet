import Link from 'next/link'
import { ArrowLeft, Utensils, Clock } from 'lucide-react'

export default function FeedingTemplatesPage() {
  return (
    <div className="w-full mx-auto px-1 py-4 pb-20 flex flex-col gap-5 font-sans">
      <Link
        href="/owner/profile"
        className="flex items-center gap-2 text-sm font-bold text-text-secondary hover:text-primary transition-all group active:scale-[0.98]"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Profil Ayarları
      </Link>

      <div className="bg-white rounded-3xl overflow-hidden relative border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]">
        <div className="h-2 bg-gradient-to-r from-emerald-400 to-teal-600" />
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-text-primary">Beslenme & Porsiyon Şablonları</h1>
              <p className="text-xs text-text-secondary font-medium mt-0.5">Günlük öğün ve beslenme rutinlerinizi düzenleyin.</p>
            </div>
          </div>

          <div className="p-8 mt-6 text-center bg-bg-main border border-border-main rounded-2xl border-dashed flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-text-primary mb-1">Yapım Aşamasında</h3>
            <p className="text-xs text-text-secondary max-w-sm">
              Bu modül henüz tasarlanıyor. Öğün miktarlarını (gram vb.) ve mama türlerini buradan standart şablonlara bağlayabileceksiniz.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
