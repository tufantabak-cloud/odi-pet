'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { addCustomTemplate, deleteCustomTemplate } from './actions'

type Template = {
  id: string
  vaccine_name: string
  species: string
  category: string
  recurrence_type: string
  min_age_weeks: number
}

export default function CustomVaccinesClient({ templates }: { templates: Template[] }) {
  const [isAdding, setIsAdding] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    species: 'dog',
    vaccine_name: '',
    category: 'vaccine',
    recurrence_type: 'none',
    min_age_weeks: 6,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.vaccine_name.trim()) {
      setError('Lütfen bir isim girin.')
      return
    }
    setError('')
    startTransition(async () => {
      try {
        await addCustomTemplate(form as any)
        setIsAdding(false)
        setForm({ ...form, vaccine_name: '' })
      } catch (err: any) {
        setError(err.message || 'Bir hata oluştu.')
      }
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-20 flex flex-col gap-5">
      <Link href="/owner/profile" className="flex items-center gap-2 text-[14px] font-bold text-text-secondary hover:text-primary -mb-1">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        Profil Ayarları
      </Link>

      <div className="card-base overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary to-violet-500" />
        <div className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-[24px]">🧪</div>
            <div>
              <h1 className="text-[20px] font-extrabold text-text-primary">Özel Aşı & Parazit</h1>
              <p className="text-[13px] text-text-secondary">Pati dostlarınız için kendi şablonlarınızı oluşturun.</p>
            </div>
          </div>
          {!isAdding && (
            <button onClick={() => setIsAdding(true)} className="btn-primary py-2 px-4 text-[13px]">
              + Yeni Şablon
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="card-base p-6 border-l-4 border-l-primary">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[15px] font-extrabold text-text-primary">Yeni Şablon Ekle</h2>
            <button onClick={() => setIsAdding(false)} className="text-text-secondary hover:text-text-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <p className="text-error text-[12px] font-bold bg-error/10 p-3 rounded-lg">{error}</p>}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Tür</label>
                <select className="input-base" value={form.species} onChange={e => setForm({...form, species: e.target.value})}>
                  <option value="dog">🐶 Köpek</option>
                  <option value="cat">🐱 Kedi</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Kategori</label>
                <select className="input-base" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  <option value="vaccine">💉 Aşı</option>
                  <option value="parasite">🦠 Parazit</option>
                  <option value="other">📋 Diğer Bakım</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Şablon Adı</label>
              <input 
                type="text" 
                className="input-base" 
                placeholder="Örn: Lyme Aşısı veya Nexgard Parazit"
                value={form.vaccine_name}
                onChange={e => setForm({...form, vaccine_name: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Tekrar Periyodu</label>
                <select className="input-base" value={form.recurrence_type} onChange={e => setForm({...form, recurrence_type: e.target.value})}>
                  <option value="none">Tek Seferlik (Tekrar Yok)</option>
                  <option value="annual">Yıllık (Her Yıl Tekrar)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Uygulama Yaşı (Hafta)</label>
                <input 
                  type="number" 
                  className="input-base" 
                  min="0"
                  value={form.min_age_weeks}
                  onChange={e => setForm({...form, min_age_weeks: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-[13px] font-bold text-text-secondary border border-border-main rounded-xl hover:bg-bg-main">
                İptal
              </button>
              <button type="submit" disabled={isPending} className="btn-primary py-2 px-6 text-[13px]">
                {isPending ? 'Ekleniyor...' : 'Kaydet ✓'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {templates.length === 0 ? (
          <div className="card-base p-8 text-center text-[14px] text-text-secondary border border-dashed border-border-main">
            Henüz özel bir şablon eklemediniz. Aşı veya parazit bakım şablonları ekleyerek takvimi kişiselleştirebilirsiniz.
          </div>
        ) : (
          templates.map(t => (
            <div key={t.id} className="card-base p-4 flex items-center justify-between hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[20px] bg-bg-main border border-border-main shrink-0">
                  {t.category === 'vaccine' ? '💉' : t.category === 'parasite' ? '🦠' : '📋'}
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-text-primary">{t.vaccine_name}</h3>
                  <p className="text-[12px] text-text-secondary capitalize mt-0.5">
                    {t.species === 'dog' ? 'Köpek' : 'Kedi'} • {t.recurrence_type === 'annual' ? 'Yıllık Tekrar' : 'Tek Seferlik'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  if(confirm('Bu şablonu silmek istiyor musunuz? Geçmiş kayıtlar silinmez.')) {
                    startTransition(() => { deleteCustomTemplate(t.id) })
                  }
                }}
                className="text-[12px] font-bold text-error/70 hover:text-error hover:bg-error/10 px-3 py-1.5 rounded-lg transition-colors"
              >
                Sil
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
