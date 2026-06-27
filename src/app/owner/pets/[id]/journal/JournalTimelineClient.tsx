'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// ── TypeScript Tipleri (T5) ─────────────────────────────────────────────────

type JournalEntryData = Record<string, string>

type JournalEntry = {
  id: string
  source: 'journal'
  entry_type: 'appetite' | 'mood' | 'nutrition' | 'activity' | 'note' | 'health'
  data: JournalEntryData
  note?: string
  sortDate: number
  created_at: string
}

type PlanItem = {
  id: string
  source: 'plan'
  category: 'saglik' | 'asi' | 'parazit' | 'bakim' | 'beslenme' | 'hijyen' | 'aktivite'
  sub_type: string
  status: 'active' | 'completed' | 'cancelled'
  scheduled_at: string
  note?: string
  sortDate: number
}

type GalleryItem = {
  id: string
  source: 'gallery'
  image_url: string
  category: string
  caption?: string
  sortDate: number
}

type AdoptionItem = {
  source: 'adoption'
  id: string
  status: string
  story?: string | null
  created_at: string
  updated_at?: string | null
  sortDate: number
}

type LostItem = {
  source: 'lost'
  id: string
  status: string
  description?: string | null
  created_at: string
  updated_at?: string | null
  sortDate: number
}

type JournalItem = JournalEntry | PlanItem | GalleryItem | AdoptionItem | LostItem

// ── Filtre Tanımları (T2) ───────────────────────────────────────────────────

type FilterKey = 'all' | 'health' | 'care' | 'mood' | 'appetite' | 'nutrition' | 'activity'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',       label: 'Tümü' },
  { key: 'health',    label: '💉 Sağlık & Aşı' },
  { key: 'care',      label: '🛁 Bakım & Hijyen' },
  { key: 'mood',      label: '🎭 Ruh Hali' },
  { key: 'appetite',  label: '🥣 İştah' },
  { key: 'nutrition', label: '🥩 Beslenme' },
  { key: 'activity',  label: '🦴 Aktivite' },
]

// ── Tarih Grup Yardımcıları (T3) ────────────────────────────────────────────

function getDateGroup(sortDate: number): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const itemDate = new Date(sortDate)
  const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate())
  const diffDays = Math.round((today.getTime() - itemDay.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < -7) return 'Gelecek'
  if (diffDays < 0) return 'Yaklaşan'
  if (diffDays === 0) return 'Bugün'
  if (diffDays === 1) return 'Dün'
  if (diffDays <= 7) return 'Bu Hafta'
  if (diffDays <= 30) return 'Bu Ay'
  return 'Daha Önce'
}

const GROUP_ORDER = ['Gelecek', 'Yaklaşan', 'Bugün', 'Dün', 'Bu Hafta', 'Bu Ay', 'Daha Önce']

function groupByDate(items: JournalItem[]): { label: string; items: JournalItem[] }[] {
  const map = new Map<string, JournalItem[]>()
  for (const item of items) {
    const group = getDateGroup(item.sortDate)
    if (!map.has(group)) map.set(group, [])
    map.get(group)!.push(item)
  }
  return GROUP_ORDER
    .filter(g => map.has(g))
    .map(g => ({ label: g, items: map.get(g)! }))
}

// ── İkon & Başlık Yardımcıları ───────────────────────────────────────────────

function getIcon(item: JournalItem): string {
  if (item.source === 'adoption') return '🏠'
  if (item.source === 'lost') return '🚨'
  if (item.source === 'gallery') return '📸'
  if (item.source === 'plan') {
    const p = item as PlanItem
    if (['saglik', 'asi', 'parazit'].includes(p.category)) return '💉'
    if (['bakim', 'hijyen'].includes(p.category)) return '🛁'
    if (p.category === 'beslenme') return '🥩'
    if (p.category === 'aktivite') return '🦴'
    return '📅'
  }
  switch ((item as JournalEntry).entry_type) {
    case 'appetite':  return '🥣'
    case 'mood':      return '🎭'
    case 'nutrition': return '🥩'
    case 'activity':  return '🦴'
    case 'note':      return '📝'
    default:          return '📌'
  }
}

function getTitle(item: JournalItem): string {
  if (item.source === 'adoption') {
    return item.status === 'active' 
      ? 'Sahiplendirme İlanı Açıldı' 
      : 'Sahiplendirme İlanı Kapatıldı'
  }
  if (item.source === 'lost') {
    return item.status === 'active'
      ? 'Kayıp İlanı Oluşturuldu'
      : 'Kayıp İlanı Kapatıldı'
  }
  if (item.source === 'gallery') return 'Yeni Fotoğraf'
  if (item.source === 'plan') {
    const p = item as PlanItem
    const statusText = p.status === 'completed' ? 'Tamamlandı' : p.status === 'cancelled' ? 'İptal' : 'Planlandı'
    return `${p.sub_type} (${statusText})`
  }
  const e = item as JournalEntry
  switch (e.entry_type) {
    case 'appetite':  return `İştah: ${e.data.level ?? ''}`
    case 'mood':      return `Ruh Hali: ${e.data.mood ?? ''}`
    case 'nutrition': return `Beslenme: ${[e.data.brand, e.data.amount].filter(Boolean).join(' ')}`
    case 'activity':  return `Aktivite: ${e.data.type ?? ''}${e.data.duration ? ` (${e.data.duration})` : ''}`
    case 'note':      return 'Not eklendi'
    default:          return 'Kayıt'
  }
}

function getCardStyle(item: JournalItem): string {
  if (item.source === 'adoption') return 'border-l-4 border-l-violet-500 bg-violet-50'
  if (item.source === 'lost') return 'border-l-4 border-l-red-500 bg-red-50'
  if (item.source === 'gallery') return 'border-l-4 border-l-violet-500 bg-violet-50'
  if (item.source === 'plan') {
    const p = item as PlanItem
    if (p.status === 'completed') return 'border-l-4 border-l-success bg-success/5'
    
    // Check if overdue
    const isPast = new Date(p.scheduled_at).getTime() < new Date().getTime()
    if (p.status === 'active' && isPast) return 'border-l-4 border-l-error bg-error/5'
    
    // Upcoming
    return 'border-l-4 border-l-primary bg-surface'
  }
  return 'border border-border-main bg-surface'
}

function formatTime(sortDate: number): string {
  return new Date(sortDate).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Ana Bileşen ──────────────────────────────────────────────────────────────

export default function JournalTimelineClient({
  petId,
  petName,
  initialItems,
}: {
  petId: string
  petName: string
  initialItems: JournalItem[]
}) {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [summary, setSummary] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerateSummary = async () => {
    setLoadingSummary(true)
    setSummary(null)
    setError(null)
    try {
      const res = await fetch('/api/journal/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId }),
      })
      const data = await res.json()
      if (res.ok) {
        setSummary(data.summary)
      } else {
        setError('Özet oluşturulurken bir hata oluştu.')
      }
    } catch {
      setError('Özet oluşturulurken bir hata oluştu.')
    } finally {
      setLoadingSummary(false)
    }
  }

  // Filtre uygula (T2)
  const filteredItems = initialItems.filter(item => {
    if (filter === 'all') return true
    if (filter === 'health') {
      return (item.source === 'plan' && ['saglik', 'asi', 'parazit'].includes((item as PlanItem).category)) || (item.source === 'journal' && (item as JournalEntry).entry_type === 'health')
    }
    if (filter === 'care') {
      return item.source === 'plan' && ['bakim', 'hijyen'].includes((item as PlanItem).category)
    }
    return item.source === 'journal' && (item as JournalEntry).entry_type === filter
  })

  // Tarih gruplama (T3)
  const groups = groupByDate(filteredItems)

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

          {error && (
            <div role="alert" className="p-3 bg-error/10 text-error text-[13px] font-bold rounded-xl text-center border border-error/20">
              {error}
            </div>
          )}

          {summary && (
            <div className="bg-white/80 rounded-[16px] p-4 text-[14px] text-[#2A4B7C] leading-relaxed border border-white font-medium shadow-sm animate-fade-in flex flex-col gap-4">
              <p>{summary}</p>
              <Link
                href="/owner/vets"
                className="bg-error text-white font-bold py-3 px-4 rounded-xl text-center text-[14px] shadow-md hover:bg-error/90 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.62 5.05 2 2 0 0 1 3.6 2.87h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.4a16 16 0 0 0 6 6l.88-.88a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 18z"/>
                </svg>
                Veterinere Danış
              </Link>
            </div>
          )}

          {!summary && !loadingSummary && (
            <p className="text-[13px] text-text-secondary">
              Son günlerdeki kayıtları analiz edip {petName} için genel bir trend özeti alın.
            </p>
          )}
        </div>
      </div>

      {/* Filtreler (T2) */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-[13px] font-bold transition-all border ${
              filter === f.key
                ? 'bg-[#34495E] text-white border-[#34495E]'
                : 'bg-surface text-text-secondary border-border-main hover:bg-bg-main'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline — Tarih Gruplandırmalı (T3) */}
      <div className="flex flex-col gap-5">
        {filteredItems.length === 0 ? (
          <div className="text-center py-10 text-text-secondary text-[14px]">
            Henüz bir kayıt yok. Pet&apos;inizin sağlık hikayesini birlikte oluşturalım.
          </div>
        ) : (
          groups.map(group => (
            <div key={group.label} className="flex flex-col gap-2">
              {/* Grup Başlığı */}
              <div className="flex items-center gap-3 px-1">
                <span className="text-[11px] font-black text-text-secondary uppercase tracking-widest">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-border-main/50" />
              </div>

              {/* Grup Kartları */}
              <div className="flex flex-col gap-2">
                {group.items.map(item => (
                  <div key={item.id} className={`card-base p-4 flex gap-4 ${getCardStyle(item)}`}>
                    <div className="w-12 h-12 rounded-2xl bg-bg-main flex items-center justify-center shrink-0 text-[20px] shadow-sm">
                      {getIcon(item)}
                    </div>
                    <div className="flex flex-col justify-center min-w-0 flex-1">
                      <p className="text-[14px] font-extrabold text-text-primary leading-tight mb-1">
                        {getTitle(item)}
                      </p>
                      {item.source === 'plan' && (item as PlanItem).status === 'active' && new Date((item as PlanItem).scheduled_at).getTime() < new Date().getTime() && (
                        <p className="text-[12px] font-bold text-error">⚠️ Gecikmiş Görev</p>
                      )}
                      {item.source !== 'gallery' && 'note' in item && item.note && (
                        <p className="text-[13px] text-text-secondary leading-snug mb-1 line-clamp-2">
                          {item.note}
                        </p>
                      )}
                      {item.source === 'gallery' && (item as GalleryItem).caption && (
                        <p className="text-[13px] text-text-secondary leading-snug mb-1 line-clamp-2">
                          {(item as GalleryItem).caption}
                        </p>
                      )}
                      {item.source === 'gallery' && (
                         <div className="mt-2 mb-2 w-20 h-20 relative rounded-lg overflow-hidden border border-border-main">
                            <Image src={(item as GalleryItem).image_url} alt="Timeline photo" fill className="object-cover" />
                         </div>
                      )}
                      {item.source === 'adoption' && (
                        <div className="mt-1 text-xs text-text-secondary">
                          {(item as AdoptionItem).story 
                            ? `"${(item as AdoptionItem).story?.slice(0, 80)}..."` 
                            : null}
                          <span className="ml-2 text-violet-500 font-medium">
                            → İlanı Gör
                          </span>
                        </div>
                      )}
                      {item.source === 'lost' && (
                        <div className="mt-1 text-xs text-red-500 font-medium">
                          {(item as LostItem).status === 'active' 
                            ? '🔴 Aktif kayıp ilanı' 
                            : '✅ Bulundu / Kapatıldı'}
                        </div>
                      )}
                      <p className="text-[11px] font-medium text-text-secondary">
                        {formatTime(item.sortDate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
