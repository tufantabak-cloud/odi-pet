import React from 'react'
import { Sparkles, Sliders, BarChart3, AlertCircle } from 'lucide-react'

export const metadata = {
  title: 'AI-Vet Analiz ve Prompt Yönetimi — ODI Admin',
}

export default async function AdminAiVetPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>AI Governance Model v1.0</span>
          </span>
        </div>
        <h1 className="text-2xl font-black text-text-primary flex items-center gap-2.5">
          <Sparkles className="w-6 h-6 text-purple-600" />
          <span>AI-Vet Analiz ve Yönetim</span>
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Odi AI-Vet modeline ait davranış ayarları, prompt konfigürasyonları ve kullanım istatistikleri.
        </p>
      </div>

      {/* AI Medical Disclaimer Notice */}
      <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 flex items-start gap-3 text-xs text-purple-900">
        <AlertCircle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Yasal & Tıbbi Uyarı Standartı (OPOS Cilt 13):</p>
          <p className="text-purple-800 mt-0.5">
            Tüm AI çıktıları kullanıcı arayüzünde Mor Yıldız (<Sparkles className="w-3 h-3 inline text-purple-600" />) ikonu ve açık sorumluluk reddi metni ("Bu bir klinik teşhis değildir. Acil durumlarda mutlaka lisanslı bir veteriner hekime danışınız.") ile sunulmalıdır.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 border border-border-main rounded-3xl bg-surface shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
            <Sliders className="w-5 h-5" />
          </div>
          <h2 className="font-bold text-base text-text-primary">Davranış & Prompt Yapılandırması</h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            AI modelinin evcil hayvan analizleri için kullanacağı ana direktifleri (System Prompts) ve kısıtlamaları (Guardrails) buradan yönetebileceksiniz.
          </p>
          <button className="px-4 py-2 bg-bg-main text-text-secondary rounded-xl text-xs font-bold opacity-50 cursor-not-allowed">
            Yakında
          </button>
        </div>

        <div className="p-6 border border-border-main rounded-3xl bg-surface shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h2 className="font-bold text-base text-text-primary">Kullanım İstatistikleri</h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            Aylık sorgu sayıları, popüler şikayet/analiz başlıkları ve model token tüketimi gibi veriler burada listelenecektir.
          </p>
          <button className="px-4 py-2 bg-bg-main text-text-secondary rounded-xl text-xs font-bold opacity-50 cursor-not-allowed">
            Yakında
          </button>
        </div>
      </div>
    </div>
  )
}
