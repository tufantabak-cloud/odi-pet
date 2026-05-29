'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function JournalTimelineClient({ petId, petName, initialItems }: { petId: string, petName: string, initialItems: any[] }) {
  const [filter, setFilter] = useState('all')
  const [summary, setSummary] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  const handleGenerateSummary = async () => {
    setLoadingSummary(true)
    setSummary(null)
    try {
      const res = await fetch('/api/journal/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId })
      })
      const data = await res.json()
      if (res.ok) {
        setSummary(data.summary)
      } else {
        alert('Özet oluşturulurken bir hata oluştu.')
      }
    } catch (err) {
      console.error(err)
      alert('Özet oluşturulurken bir hata oluştu.')
    } finally {
      setLoadingSummary(false)
    }
  }

  const filteredItems = initialItems.filter(item => {
    if (filter === 'all') return true
    if (filter === 'health' && (item.entry_type === 'health' || item.source === 'vaccine')) return true
    if (item.entry_type === filter) return true
    return false
  })

  const getIcon = (item: any) => {
    if (item.source === 'vaccine') return '💉'
    switch (item.entry_type) {
      case 'appetite': return '🥣'
      case 'mood': return '🎭'
      case 'nutrition': return '🥩'
      case 'activity': return '🎾'
      case 'note': return '📝'
      default: return '📌'
    }
  }

  const getTitle = (item: any) => {
    if (item.source === 'vaccine') return `Aşı: ${item.title || item.vaccines?.name || 'Sağlık İşlemi'} tamamlandı`
    switch (item.entry_type) {
      case 'appetite': return `İştah: ${item.data.level}`
      case 'mood': return `Ruh Hali: ${item.data.mood}`
      case 'nutrition': return `Beslenme: ${item.data.brand || ''} ${item.data.amount || ''}`
      case 'activity': return `Aktivite: ${item.data.type || ''} ${item.data.duration ? `(${item.data.duration})` : ''}`
      case 'note': return 'Not eklendi'
      default: return 'Kayıt'
    }
  }

  return (
    <div className="flex flex-col gap-5">
      
      {/* AI Summary Section */}
      <div className="bg-gradient-to-br from-[#f8f9fc] to-[#f1f4f9] rounded-[24px] p-5 border border-primary/10 shadow-sm relative overflow-hidden">
        <div className="absolute -right-4 -top-4 text-primary/5 text-[100px] font-black select-none pointer-events-none">✨</div>
        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold text-[#2A4B7C] flex items-center gap-2">
              <span className="text-[18px]">✨</span> AI Durum Özeti
            </h2>
            <button 
              onClick={handleGenerateSummary}
              disabled={loadingSummary}
              className="bg-white text-[#2A4B7C] text-[12px] font-bold py-1.5 px-3 rounded-lg shadow-sm border border-[#2A4B7C]/20 hover:bg-[#2A4B7C]/5 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loadingSummary ? 'Üretiliyor...' : 'Özet Oluştur'}
            </button>
          </div>
          
          {summary && (
            <div className="bg-white/80 rounded-[16px] p-4 text-[14px] text-[#2A4B7C] leading-relaxed border border-white font-medium shadow-sm animate-fade-in flex flex-col gap-4">
              <p>{summary}</p>
              <Link href={`/owner/vets`} className="bg-error text-white font-bold py-3 px-4 rounded-xl text-center text-[14px] shadow-md hover:bg-error/90 active:scale-95 transition-all flex items-center justify-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.62 5.05 2 2 0 0 1 3.6 2.87h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.4a16 16 0 0 0 6 6l.88-.88a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 18z"/></svg>
                Veterinere Danış
              </Link>
            </div>
          )}
          {!summary && !loadingSummary && (
            <p className="text-[13px] text-text-secondary">Son günlerdeki kayıtları analiz edip {petName} için genel bir trend özeti alın.</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        <button onClick={() => setFilter('all')} className={`whitespace-nowrap px-4 py-2 rounded-xl text-[13px] font-bold transition-all border ${filter === 'all' ? 'bg-[#34495E] text-white border-[#34495E]' : 'bg-surface text-text-secondary border-border-main hover:bg-bg-main'}`}>Tümünü Göster</button>
        <button onClick={() => setFilter('health')} className={`whitespace-nowrap px-4 py-2 rounded-xl text-[13px] font-bold transition-all border ${filter === 'health' ? 'bg-[#34495E] text-white border-[#34495E]' : 'bg-surface text-text-secondary border-border-main hover:bg-bg-main'}`}>Sağlık & Aşı</button>
        <button onClick={() => setFilter('mood')} className={`whitespace-nowrap px-4 py-2 rounded-xl text-[13px] font-bold transition-all border ${filter === 'mood' ? 'bg-[#34495E] text-white border-[#34495E]' : 'bg-surface text-text-secondary border-border-main hover:bg-bg-main'}`}>Ruh Hali</button>
        <button onClick={() => setFilter('appetite')} className={`whitespace-nowrap px-4 py-2 rounded-xl text-[13px] font-bold transition-all border ${filter === 'appetite' ? 'bg-[#34495E] text-white border-[#34495E]' : 'bg-surface text-text-secondary border-border-main hover:bg-bg-main'}`}>İştah</button>
      </div>

      {/* Timeline */}
      <div className="flex flex-col gap-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-10 text-text-secondary text-[14px]">
            Henüz bir kayıt yok. Pet'inizin sağlık hikayesini birlikte oluşturalım.
          </div>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} className="card-base p-4 flex gap-4 bg-surface border border-border-main">
              <div className="w-12 h-12 rounded-2xl bg-bg-main flex items-center justify-center shrink-0 text-[20px] shadow-sm">
                {getIcon(item)}
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[14px] font-extrabold text-text-primary leading-tight mb-1">{getTitle(item)}</p>
                {item.note && <p className="text-[13px] text-text-secondary leading-snug mb-1">{item.note}</p>}
                <p className="text-[11px] font-medium text-text-secondary/70">
                  {new Date(item.sortDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
