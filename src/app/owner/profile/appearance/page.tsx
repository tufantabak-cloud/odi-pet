import Link from 'next/link'
import { ArrowLeft, Palette, Sparkles } from 'lucide-react'

export default function AppearancePage() {
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
        <div className="h-2 bg-gradient-to-r from-purple-400 to-purple-600" />
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 shrink-0">
              <Palette className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-text-primary">Tema & Görüntüleme Seçenekleri</h1>
              <p className="text-xs text-text-secondary font-medium mt-0.5">Uygulamanın görsel temasını kişiselleştirin.</p>
            </div>
          </div>

          <div className="p-8 mt-6 text-center bg-bg-main border border-border-main rounded-2xl border-dashed flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-text-primary mb-1">Çok Yakında</h3>
            <p className="text-xs text-text-secondary max-w-sm">
              Gece modu (Dark Mode), marka rengi değişiklikleri ve daha birçok görünüm özelleştirmesi buraya gelecek.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
