'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export default function JournalFormClient({ petId, category }: { petId: string, category: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<any>({})
  const [note, setNote] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createBrowserSupabaseClient()
    
    // Auth user id is needed via RLS automatically, we don't strictly need to pass user_id if RLS is set, 
    // but the policy requires user_id = auth.uid(). We fetch session to include it.
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('Oturum bulunamadı')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase
      .from('pet_journal_entries')
      .insert({
        pet_id: petId,
        user_id: session.user.id,
        entry_type: category,
        data: formData,
        note: note || null
      })

    if (insertError) {
      console.error(insertError)
      setError(insertError.message)
      setLoading(false)
    } else {
      router.replace(`/owner/pets/${petId}/journal`)
      router.refresh()
    }
  }

  const renderFields = () => {
    switch (category) {
      case 'appetite':
        return (
          <div className="flex flex-col gap-3">
            <label className="text-[13px] font-extrabold text-text-primary">Petinizin iştahı nasıl?</label>
            <select 
              className="input-base" 
              required
              value={formData.level || ''}
              onChange={e => setFormData({ ...formData, level: e.target.value })}
            >
              <option value="" disabled>Seçiniz...</option>
              <option value="Çok Az 😫">Çok Az 😫</option>
              <option value="Az 😕">Az 😕</option>
              <option value="Normal 😐">Normal 😐</option>
              <option value="İyi 🙂">İyi 🙂</option>
              <option value="Çok İyi 😋">Çok İyi 😋</option>
            </select>
          </div>
        )
      case 'mood':
        return (
          <div className="flex flex-col gap-3">
            <label className="text-[13px] font-extrabold text-text-primary">Ruh hali nasıl?</label>
            <select 
              className="input-base" 
              required
              value={formData.mood || ''}
              onChange={e => setFormData({ ...formData, mood: e.target.value })}
            >
              <option value="" disabled>Seçiniz...</option>
              <option value="Mutlu 😄">Mutlu 😄</option>
              <option value="Sakin 😌">Sakin 😌</option>
              <option value="Stresli 😟">Stresli 😟</option>
              <option value="Agresif 😠">Agresif 😠</option>
              <option value="Oyuncu 🎾">Oyuncu 🎾</option>
            </select>
          </div>
        )
      case 'nutrition':
        return (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-extrabold text-text-primary">Mama Markası (Opsiyonel)</label>
              <input type="text" className="input-base" placeholder="Örn: Royal Canin" 
                value={formData.brand || ''} onChange={e => setFormData({...formData, brand: e.target.value})} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-extrabold text-text-primary">Miktar (Opsiyonel)</label>
              <input type="text" className="input-base" placeholder="Örn: 100gr veya 1 Kap" 
                value={formData.amount || ''} onChange={e => setFormData({...formData, amount: e.target.value})} />
            </div>
          </div>
        )
      case 'activity':
        return (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-extrabold text-text-primary">Aktivite Tipi</label>
              <select 
                className="input-base" 
                required
                value={formData.type || ''}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="" disabled>Seçiniz...</option>
                <option value="Yürüyüş 🦮">Yürüyüş 🦮</option>
                <option value="Oyun 🎾">Oyun 🎾</option>
                <option value="Eğitim 🎓">Eğitim 🎓</option>
                <option value="Diğer">Diğer</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-extrabold text-text-primary">Süre (Opsiyonel)</label>
              <input type="text" className="input-base" placeholder="Örn: 30 dk" 
                value={formData.duration || ''} onChange={e => setFormData({...formData, duration: e.target.value})} />
            </div>
          </div>
        )
      case 'note':
        return null; // Just uses the main note field
      default:
        return null;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="card-base p-6 bg-surface border border-border-main flex flex-col gap-5">
        
        {renderFields()}

        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-extrabold text-text-primary">Opsiyonel Not</label>
          <textarea 
            className="input-base min-h-[100px] resize-none" 
            placeholder="Eklemek istediğiniz başka bir şey var mı?"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div role="alert" aria-live="assertive" className="p-3 bg-error/10 text-error text-[13px] font-bold rounded-xl text-center border border-error/20">
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary py-3.5 text-[15px] shadow-sm disabled:opacity-50 mt-2">
        {loading ? 'Kaydediliyor...' : 'Kaydı Tamamla'}
      </button>
    </form>
  )
}
