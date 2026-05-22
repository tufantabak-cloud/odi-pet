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

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 border border-border-main rounded-2xl bg-surface flex flex-col">
          <span className="text-[12px] font-bold text-text-secondary uppercase tracking-wider mb-1">Aylık Sorgu</span>
          <span className="text-[28px] font-black text-text-primary">1,284</span>
          <span className="text-[12px] font-semibold text-green-600 mt-1 flex items-center gap-1">↑ 12% Geçen aya göre</span>
        </div>
        <div className="p-5 border border-border-main rounded-2xl bg-surface flex flex-col">
          <span className="text-[12px] font-bold text-text-secondary uppercase tracking-wider mb-1">Başarı Oranı</span>
          <span className="text-[28px] font-black text-text-primary">%94.2</span>
          <span className="text-[12px] font-semibold text-green-600 mt-1 flex items-center gap-1">↑ 2.1% Geçen aya göre</span>
        </div>
        <div className="p-5 border border-border-main rounded-2xl bg-surface flex flex-col">
          <span className="text-[12px] font-bold text-text-secondary uppercase tracking-wider mb-1">Ortalama Yanıt Süresi</span>
          <span className="text-[28px] font-black text-text-primary">2.4s</span>
          <span className="text-[12px] font-semibold text-text-secondary mt-1 flex items-center gap-1">Normal seviyede</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prompt Configuration */}
        <div className="col-span-1 lg:col-span-2 space-y-4">
          <div className="p-6 border border-border-main rounded-2xl bg-surface">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[16px] text-text-primary">Sistem Prompt Konfigürasyonu</h2>
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">v2.1.0 Aktif</span>
            </div>
            
            <form className="space-y-4">
              <div>
                <label className="block text-[13px] font-bold text-text-primary mb-1.5">Model Seçimi</label>
                <select className="w-full bg-bg-main border border-border-main rounded-xl px-4 py-2.5 text-[14px] font-medium text-text-primary focus:outline-none focus:border-primary/50 transition-colors">
                  <option>gpt-4o-mini (Önerilen)</option>
                  <option>gpt-4o</option>
                  <option>claude-3-haiku</option>
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-text-primary mb-1.5 flex justify-between">
                  <span>Temperature (Yaratıcılık)</span>
                  <span className="text-primary">0.3</span>
                </label>
                <input type="range" min="0" max="1" step="0.1" defaultValue="0.3" className="w-full accent-primary" />
                <p className="text-[11px] text-text-secondary mt-1">Düşük değerler daha tutarlı ve tıbbi olarak güvenli yanıtlar üretir.</p>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-text-primary mb-1.5">Ana Sistem Promptu (System Instruction)</label>
                <textarea 
                  className="w-full bg-bg-main border border-border-main rounded-xl px-4 py-3 text-[13px] font-medium text-text-primary focus:outline-none focus:border-primary/50 transition-colors h-48 resize-none font-mono"
                  defaultValue="Sen Odi.Pet'in uzman AI veteriner asistanısın. Kullanıcıların kedi ve köpekleriyle ilgili sorduğu sorulara profesyonel, şefkatli ve anlaşılır yanıtlar vermelisin. Asla kesin bir tıbbi teşhis koyma, her zaman fiziksel bir veteriner hekime danışılmasını tavsiye et."
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button type="button" className="btn-primary py-2.5 px-6 rounded-xl font-bold text-[14px]">
                  Değişiklikleri Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Logs */}
        <div className="col-span-1 space-y-4">
          <div className="p-6 border border-border-main rounded-2xl bg-surface h-full">
            <h2 className="font-bold text-[16px] text-text-primary mb-4">Son Sorgular (Log)</h2>
            
            <div className="space-y-3">
              {[
                { id: 1, user: 'Ahmet Y.', query: 'Kedim 2 gündür kusuyor...', time: '10 dk önce', status: 'success' },
                { id: 2, user: 'Selin K.', query: 'Köpeğimin aşısı gecikti', time: '45 dk önce', status: 'success' },
                { id: 3, user: 'Burak T.', query: 'Hangi mamayı almalıyım?', time: '2 saat önce', status: 'success' },
                { id: 4, user: 'Ayşe M.', query: 'Tırnak kesimi nasıl yapılır?', time: '3 saat önce', status: 'warning' },
                { id: 5, user: 'Canan E.', query: 'Gözünde kızarıklık var', time: '5 saat önce', status: 'success' },
              ].map(log => (
                <div key={log.id} className="p-3 bg-bg-main rounded-xl border border-border-main flex flex-col gap-1 hover:border-primary/30 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-text-primary">{log.user}</span>
                    <span className="text-[10px] font-semibold text-text-secondary">{log.time}</span>
                  </div>
                  <p className="text-[13px] text-text-secondary truncate">{log.query}</p>
                </div>
              ))}
            </div>

            <button className="w-full mt-4 py-2 text-[13px] font-bold text-primary hover:bg-primary/5 rounded-xl transition-colors">
              Tüm Logları Görüntüle
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
