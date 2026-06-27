'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Database } from '@/types'

type PetRow = Database['public']['Tables']['pets']['Row']

const CATEGORIES = [
  { key: 'Mama & Beslenme', icon: '🦴', color: 'from-amber-400 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  { key: 'Sağlık & Veteriner', icon: '🏥', color: 'from-rose-400 to-red-500', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  { key: 'Oyuncak & Aksesuar', icon: '🐾', color: 'from-violet-400 to-purple-500', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  { key: 'Bakım', icon: '✨', color: 'from-teal-400 to-emerald-500', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
]

interface Expense {
  id: string
  amount: number
  category: string
  date: string
  description: string | null
  created_at: string
}

export default function BudgetTab({ pet }: { pet: PetRow }) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0].key)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await fetch(`/api/pets/${pet.id}/expenses`)
      const data = await res.json()
      if (res.ok) setExpenses(data.expenses ?? [])
      else setError('Harcamalar yüklenirken bir hata oluştu.')
    } catch { 
      setError('Bağlantı hatası: Harcamalar yüklenemedi.')
    } finally { setLoading(false) }
  }, [pet.id])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) { setError('Geçerli bir tutar giriniz.'); return }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/pets/${pet.id}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount), category, date, description: description || null }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setAmount('')
      setDescription('')
      setDate(new Date().toISOString().split('T')[0])
      setShowForm(false)
      fetchExpenses()
    } finally { setSubmitting(false) }
  }

  // Hesaplamalar
  const { monthlyExpenses, total, categoryTotals, now } = useMemo(() => {
    const nowObj = new Date()
    const currentMonth = nowObj.getMonth()
    const currentYear = nowObj.getFullYear()
    const filtered = expenses.filter(e => {
      const d = new Date(e.date)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })
    const sum = filtered.reduce((sum, e) => sum + Number(e.amount), 0)
    const catTotals = CATEGORIES.map(cat => ({
      ...cat,
      total: filtered.filter(e => e.category === cat.key).reduce((sum, e) => sum + Number(e.amount), 0),
    }))
    return { monthlyExpenses: filtered, total: sum, categoryTotals: catTotals, now: nowObj }
  }, [expenses])

  return (
    <div className="flex flex-col gap-5 animate-fadeInUp">
      {/* Hata Bildirimi */}
      {error && !showForm && (
        <div className="p-3 bg-red-50 text-red-700 text-[13px] font-bold rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-4">
          <div className="h-[104px] bg-emerald-50/50 rounded-2xl animate-pulse" />
          <div className="h-[48px] bg-slate-100 rounded-2xl animate-pulse" />
          <div className="space-y-2 mt-4">
            <div className="h-[60px] bg-white border border-slate-100 rounded-2xl animate-pulse" />
            <div className="h-[60px] bg-white border border-slate-100 rounded-2xl animate-pulse" />
            <div className="h-[60px] bg-white border border-slate-100 rounded-2xl animate-pulse" />
          </div>
        </div>
      ) : (
        <>
          {/* Aylık Toplam */}
      <div className="card-base p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 shadow-sm rounded-2xl flex items-center justify-between">
        <div>
          <p className="text-[12px] font-black text-emerald-600 uppercase tracking-widest mb-1">Aylık Harcama</p>
          <h3 className="font-extrabold text-text-primary text-[24px]">₺{total.toFixed(2)}</h3>
          <p className="text-[11px] text-text-secondary mt-0.5">
            {now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-emerald-500 shadow-sm">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
      </div>

      {/* Harcama Ekle Butonu */}
      <button
        onClick={() => { setShowForm(!showForm); setError(null) }}
        className="w-full btn-primary py-3.5 text-[14px] font-black rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all"
      >
        {showForm ? '✕ İptal' : '+ Yeni Harcama Ekle'}
      </button>

      {/* Inline Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card-base p-5 flex flex-col gap-3 border-2 border-emerald-200 animate-fadeInUp">
          {error && (
            <div className="p-3 rounded-lg text-[13px] font-medium bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-text-secondary">Tutar (₺)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="input-base text-[16px] font-bold"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-text-secondary">Kategori</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategory(cat.key)}
                  className={`flex items-center gap-2 p-3 rounded-xl text-[12px] font-bold transition-all border ${
                    category === cat.key
                      ? `${cat.bg} ${cat.text} ${cat.border} ring-2 ring-offset-1 ring-current scale-[1.02]`
                      : 'bg-white border-border-main text-text-secondary hover:bg-bg-main'
                  }`}
                >
                  <span className="text-[16px]">{cat.icon}</span>
                  <span className="truncate">{cat.key.split(' & ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-text-secondary">Tarih</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="input-base"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-text-secondary">Açıklama (opsiyonel)</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Kısa not..."
                className="input-base"
                maxLength={100}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary py-3 text-[14px] font-black bg-emerald-500 hover:bg-emerald-600 rounded-xl mt-1 disabled:opacity-60"
          >
            {submitting ? 'Kaydediliyor...' : '✓ Kaydet'}
          </button>
        </form>
      )}

      {/* Kategoriler */}
      <div className="flex flex-col gap-2">
        <h4 className="text-[13px] font-black text-text-secondary px-1 uppercase mt-2">Kategoriler</h4>
        {categoryTotals.map(cat => {
          const pct = total > 0 ? (cat.total / total) * 100 : 0
          return (
            <div key={cat.key} className={`flex items-center justify-between p-4 bg-white border ${cat.border} rounded-2xl`}>
              <div className="flex items-center gap-3">
                <span className="text-[18px]">{cat.icon}</span>
                <span className="font-bold text-[13px] text-text-primary">{cat.key}</span>
              </div>
              <div className="flex items-center gap-3">
                {total > 0 && (
                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${cat.color}`} style={{ width: `${pct}%` }} />
                  </div>
                )}
                <span className={`text-[13px] font-black ${cat.total > 0 ? cat.text : 'text-text-secondary'}`}>₺{cat.total.toFixed(2)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Son Harcamalar */}
      {expenses.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-[13px] font-black text-text-secondary px-1 uppercase mt-2">Son Harcamalar</h4>
          {expenses.slice(0, 10).map(exp => {
            const catInfo = CATEGORIES.find(c => c.key === exp.category)
            return (
              <div key={exp.id} className="flex items-center gap-3 p-3 bg-white border border-border-main rounded-xl">
                <span className="text-[16px]">{catInfo?.icon ?? '💰'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[13px] text-text-primary truncate">{exp.category}</p>
                  {exp.description && <p className="text-[11px] text-text-secondary truncate">{exp.description}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-[13px] text-text-primary">₺{Number(exp.amount).toFixed(2)}</p>
                  <p className="text-[10px] text-text-secondary">{new Date(exp.date).toLocaleDateString('tr-TR')}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Boş state */}
      {!loading && expenses.length === 0 && !showForm && (
        <div className="text-center py-8">
          <p className="text-[32px] mb-2">📊</p>
          <p className="text-[14px] font-bold text-text-secondary">Henüz harcama kaydı yok</p>
          <p className="text-[12px] text-text-secondary mt-1">Yukarıdaki butona tıklayarak ilk harcamanızı ekleyin.</p>
        </div>
      )}
        </>
      )}
    </div>
  )
}
