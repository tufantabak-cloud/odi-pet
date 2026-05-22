import React from 'react'

export const metadata = {
  title: 'AI-Vet Analiz ve Prompt Yönetimi — ODI Admin',
}

export default async function AdminAiVetPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-text-primary flex items-center gap-2">
          🤖 AI-Vet Analiz ve Yönetim
        </h1>
        <p className="text-[13px] text-text-secondary mt-1">
          Odi AI-Vet modeline ait davranış ayarları, prompt konfigürasyonları ve kullanım istatistikleri.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 border border-border-main rounded-2xl bg-surface">
          <h2 className="font-bold text-[15px] mb-2 text-text-primary">Davranış & Prompt Yapılandırması</h2>
          <p className="text-[13px] text-text-secondary mb-4">
            AI modelinin evcil hayvan analizleri için kullanacağı ana direktifleri (System Prompts) ve kısıtlamaları (Guardrails) buradan yönetebileceksiniz.
          </p>
          <button className="px-4 py-2 bg-bg-main text-text-secondary rounded-xl text-sm font-bold opacity-50 cursor-not-allowed">Yakında</button>
        </div>

        <div className="p-6 border border-border-main rounded-2xl bg-surface">
          <h2 className="font-bold text-[15px] mb-2 text-text-primary">Kullanım İstatistikleri</h2>
          <p className="text-[13px] text-text-secondary mb-4">
            Aylık sorgu sayıları, popüler şikayet/analiz başlıkları ve model token tüketimi gibi veriler burada listelenecektir.
          </p>
          <button className="px-4 py-2 bg-bg-main text-text-secondary rounded-xl text-sm font-bold opacity-50 cursor-not-allowed">Yakında</button>
        </div>
      </div>
    </div>
  )
}
